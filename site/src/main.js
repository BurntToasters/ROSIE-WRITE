// Only the solid + brands icon sets are used — import those rather than all.min
// (which also pulls the unused regular + v4-compat fonts).
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import '@fortawesome/fontawesome-free/css/brands.min.css';
import './styles/base.css';
import './styles/app.css';
import './styles/editor.css';
import './styles/dialogs.css';

import { createEditor, resetEditorHistory } from './editor/editor.js';
import * as store from './notes/store.js';
import { initTheme } from './ui/theme.js';
import {
  initStatusbar,
  setSaveStatus,
  updateWordCount,
  STATUS,
} from './ui/statusbar.js';
import { initFontSize } from './ui/fontsize.js';
import { initToolbar, refreshToolbar, setToolbarLocked } from './ui/toolbar.js';
import { initSidebar } from './ui/sidebar.js';
import {
  initDialogs,
  openLinkDialog,
  showConfirm,
  showToast,
} from './ui/dialogs.js';
import { fileToHtml } from './io/import.js';
import { bindVersionIndicator } from './version.js';

// Images are embedded as base64 inside localStorage. A 1 MiB source expands by
// roughly one third, leaving substantially more room than the previous 5 MiB cap.
const MAX_IMAGE_BYTES = 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]);

const $ = (id) => document.getElementById(id);

function init() {
  const els = {
    app: $('app'),
    noteRail: $('noteRail'),
    pageContent: $('pageContent'),
    noteTitle: $('noteTitle'),
    saveStatus: $('saveStatus'),
    wordCount: $('wordCount'),
    // sidebar
    railToggle: $('railToggle'),
    railList: $('railList'),
    railSearch: $('noteSearch'),
    newBtn: $('newNote'),
    deleteBtn: $('deleteNote'),
    deleteAllBtn: $('deleteAllNotes'),
    // toolbar
    boldBtn: $('boldBtn'), italicBtn: $('italicBtn'), underlineBtn: $('underlineBtn'),
    headingBtn: $('headingBtn'), listBtn: $('listBtn'), numListBtn: $('numListBtn'),
    alignLeftBtn: $('alignLeftBtn'), alignCenterBtn: $('alignCenterBtn'), alignRightBtn: $('alignRightBtn'),
    fontDecreaseBtn: $('fontDecreaseBtn'), fontIncreaseBtn: $('fontIncreaseBtn'), fontSizeIndicator: $('fontSizeIndicator'),
    linkBtn: $('linkBtn'), imageBtn: $('imageBtn'), imageInput: $('imageInput'),
    undoBtn: $('undoBtn'), redoBtn: $('redoBtn'),
    // footer
    toggleThemeBtn: $('toggleTheme'), exportBtn: $('exportBtn'),
    importBtn: $('importBtn'), importFile: $('importFile'),
    // dialogs
    linkDialog: $('linkDialog'), linkText: $('linkText'), linkUrl: $('linkUrl'),
    insertLinkBtn: $('insertLink'), cancelLinkBtn: $('cancelLink'),
    exportDialog: $('exportFormatDialog'), cancelExportBtn: $('cancelExport'),
    formatBtns: document.querySelectorAll('.format-btn'),
    confirmDialog: $('confirmDialog'),
    confirmTitle: $('confirmTitle'),
    confirmMessage: $('confirmMessage'),
    cancelConfirmBtn: $('cancelConfirm'),
    okConfirmBtn: $('okConfirm'),
  };

  // Mobile sidebar toggle. The rail is only translated off-screen by CSS, so it
  // also has to be made inert — otherwise Tab still reaches the hidden notes.
  const mobileQuery = window.matchMedia('(max-width: 768px)');

  function syncRailVisibility() {
    if (!els.noteRail) return;
    const hidden = mobileQuery.matches && !els.app.classList.contains('rail-open');
    els.noteRail.inert = hidden;
    els.noteRail.setAttribute('aria-hidden', String(hidden));
  }

  function setRailOpen(open) {
    els.app.classList.toggle('rail-open', open);
    els.railToggle?.setAttribute('aria-expanded', String(open));
    const losingFocus = !open && els.noteRail?.contains(document.activeElement);
    syncRailVisibility();
    if (losingFocus) els.railToggle?.focus();
  }

  els.railToggle?.addEventListener('click', () => {
    setRailOpen(!els.app.classList.contains('rail-open'));
  });
  mobileQuery.addEventListener('change', syncRailVisibility);
  syncRailVisibility();

  let saveTimer = null;
  let suppressUpdate = false;
  let dirty = false;

  function scheduleSave() {
    dirty = true;
    setSaveStatus(STATUS.unsaved);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveCurrent();
    }, 1000);
  }

  const editor = createEditor({
    element: els.pageContent,
    onChange: (ed) => {
      if (suppressUpdate) return;
      updateWordCount(ed.getText());
      scheduleSave();
    },
    onSelection: (ed) => refreshToolbar(ed),
  });

  function saveCurrent() {
    clearTimeout(saveTimer);
    saveTimer = null;

    if (!dirty) return true;

    const payload = {
      title: els.noteTitle.value || 'Untitled Note',
      content: editor.getHTML(),
      searchText: editor.getText(),
    };

    // The open note can disappear if another tab deletes it. Rescue what's on
    // screen into a new note rather than refusing to save — refusing would also
    // block switching notes, trapping the user on text they can't keep.
    const id = store.currentId();
    if (!id || !store.get(id)) return rescueInto(payload);
    return saveInto(id, payload);
  }

  function rescueInto(payload) {
    const rescued = store.create();
    if (!rescued || !store.save(rescued.id, payload)) {
      setSaveStatus(STATUS.failed);
      return false;
    }
    dirty = false;
    setSaveStatus(STATUS.saved);
    toastState.clear();
    showToast(
      'This note was deleted in another tab, so your text was kept as a new note.',
      'warning'
    );
    return true;
  }

  function saveInto(id, payload) {
    const saved = store.save(id, payload);
    if (saved) {
      dirty = false;
      setSaveStatus(STATUS.saved);
      // A clean write means earlier problems are resolved; allow warnings again.
      toastState.clear();
    } else {
      setSaveStatus(STATUS.failed);
    }
    return saved;
  }

  // Load a note into the editor + title (without triggering autosave).
  function loadNote(note) {
    // Cancel any pending debounced save so it can't write the outgoing note's
    // title/content into the note we're switching to.
    clearTimeout(saveTimer);
    saveTimer = null;
    suppressUpdate = true;
    dirty = false;

    if (note) {
      store.setCurrent(note.id);
      els.noteTitle.value = note.title;
      editor.commands.setContent(note.content || '', { emitUpdate: false });
    } else {
      els.noteTitle.value = '';
      editor.commands.clearContent(false);
    }

    // Undo must never reach across a note boundary into the previous document.
    resetEditorHistory(editor);
    updateWordCount(editor.getText());
    refreshToolbar(editor);
    // Don't claim "saved" while the store can't be written to.
    if (store.isWritable()) setSaveStatus(STATUS.saved);
    if (window.matchMedia('(max-width: 768px)').matches) setRailOpen(false);

    // Allow ProseMirror's async transactions to settle before re-enabling.
    setTimeout(() => { suppressUpdate = false; }, 0);
  }

  function setEditingEnabled(enabled) {
    // `false` suppresses the update event: the default emits one, which would
    // mark the document dirty and trigger a bogus unsaved-changes prompt.
    editor.setEditable(enabled, false);
    setToolbarLocked(!enabled);
    const controls = [
      els.noteTitle,
      els.newBtn,
      els.deleteBtn,
      els.deleteAllBtn,
      els.importBtn,
      els.importFile,
      els.exportBtn,
      els.imageInput,
      ...document.querySelectorAll('.toolbar button'),
    ];
    controls.forEach((control) => {
      if (control) control.disabled = !enabled;
    });
  }

  function downloadRecovery(raw) {
    const blob = new Blob([raw], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `rosie-write-recovery-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  // ---- Image insert (file picker + paste), base64, 1 MiB cap ----
  function insertImageFile(file) {
    if (!file || !ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      showToast('Please select a PNG, JPEG, GIF, or WebP image.', 'warning');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showToast(
        'Images are stored in your browser. Please choose one under 1 MB.',
        'error'
      );
      return;
    }

    // Reading is async, so remember which note asked for the image. Switching
    // notes mid-read would otherwise drop it into whatever note is now open.
    const requestedFor = store.currentId();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        showToast('The image could not be read.', 'error');
        return;
      }
      if (store.currentId() !== requestedFor) {
        showToast('Note changed while the image loaded, so it was not inserted.', 'warning');
        return;
      }
      editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run();
    };
    reader.onerror = () => showToast('The image could not be read.', 'error');
    reader.onabort = () => showToast('Image loading was cancelled.', 'warning');
    reader.readAsDataURL(file);
  }

  els.imageInput?.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) insertImageFile(file);
    event.target.value = '';
  });

  els.pageContent.addEventListener('paste', (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) insertImageFile(file);
        break;
      }
    }
  });

  els.noteTitle.addEventListener('input', scheduleSave);

  // ---- Modules ----
  initTheme(els.toggleThemeBtn);
  initStatusbar({ saveStatus: els.saveStatus, wordCount: els.wordCount });
  initFontSize({
    editor: els.pageContent,
    decreaseBtn: els.fontDecreaseBtn,
    increaseBtn: els.fontIncreaseBtn,
    indicator: els.fontSizeIndicator,
  });
  initToolbar({
    editor,
    els,
    onLink: openLinkDialog,
    onImage: () => els.imageInput.click(),
  });
  initDialogs({
    editor,
    els,
    getNoteTitle: () => els.noteTitle.value || 'Untitled',
  });
  initSidebar({
    els: {
      list: els.railList,
      search: els.railSearch,
      newBtn: els.newBtn,
      deleteBtn: els.deleteBtn,
      deleteAllBtn: els.deleteAllBtn,
    },
    onSwitch: loadNote,
    saveCurrent,
  });

  const storageMessages = {
    'storage-quota': 'Browser storage is full. Remove large images or export notes before trying again.',
    'storage-unavailable': 'Browser storage is unavailable. Your latest changes were not saved.',
    'storage-conflict': 'Another tab left notes that could not be read, so this save was skipped.',
    'storage-missing-note': 'The note you were editing no longer exists.',
    'storage-remote-delete': 'Some notes were deleted in another tab.',
  };
  // Codes that describe something other than a failed write of the open note.
  const nonFatalCodes = new Set(['storage-partial', 'storage-remote-delete']);
  // Autosave retries on every keystroke, so an unresolved storage problem would
  // otherwise stack a toast every second, forever.
  const toastState = new Map();
  store.subscribeErrors(({ code }) => {
    if (code === 'storage-corrupt') {
      setSaveStatus(STATUS.recovery);
      return;
    }
    if (code === 'storage-current-deleted') {
      // Deferred: this fires from inside a store write, so don't re-enter it.
      setTimeout(handleCurrentNoteDeleted, 0);
      return;
    }
    // 'storage-partial' is surfaced once at startup with a recovery offer.
    if (code === 'storage-partial') return;
    if (!nonFatalCodes.has(code)) setSaveStatus(STATUS.failed);

    const now = Date.now();
    const seen = toastState.get(code) || { at: 0, count: 0 };
    if (now - seen.at < 10000 || seen.count >= 3) return;
    toastState.set(code, { at: now, count: seen.count + 1 });
    showToast(
      storageMessages[code] || 'Your changes could not be saved.',
      nonFatalCodes.has(code) ? 'warning' : 'error'
    );
  });

  // The note open in this tab was deleted in another tab. Never silently follow
  // the deletion — keep whatever is on screen if it hasn't been saved yet.
  function handleCurrentNoteDeleted() {
    // A local delete can coincide with a remote one; if the open note is still
    // valid there is nothing to recover from.
    if (store.current()) return;
    if (dirty) {
      // saveCurrent() rescues the text into a fresh note.
      saveCurrent();
      return;
    }
    const next = store.list()[0];
    loadNote(next || store.create());
  }

  // ---- Import ----
  els.importBtn?.addEventListener('click', () => els.importFile?.click());
  els.importFile?.addEventListener('change', (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof reader.result !== 'string') throw new Error('Unexpected file result.');
        const imported = fileToHtml(file, reader.result);
        if (!saveCurrent()) return;

        const note = store.create();
        if (!note) return;
        loadNote(note);
        els.noteTitle.value = imported.title;
        suppressUpdate = true;
        editor.commands.setContent(imported.html, { emitUpdate: false });
        resetEditorHistory(editor);
        updateWordCount(editor.getText());
        refreshToolbar(editor);
        dirty = true;
        setTimeout(() => { suppressUpdate = false; }, 0);
        const saved = saveCurrent();
        if (saved && imported.omittedImages > 0) {
          const noun = imported.omittedImages === 1 ? 'image was' : 'images were';
          showToast(
            `${imported.omittedImages} external ${noun} omitted for privacy.`,
            'warning'
          );
        }
      } catch (error) {
        console.error('Import failed:', error);
        showToast('The selected file could not be imported.', 'error');
      }
    };
    reader.onerror = () => showToast('The selected file could not be read.', 'error');
    reader.onabort = () => showToast('File import was cancelled.', 'warning');
    reader.readAsText(file);
  });

  // ---- Keyboard shortcuts (Ctrl/Cmd+S save, Ctrl/Cmd+K link). ----
  document.addEventListener('keydown', (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    const key = event.key.toLowerCase();
    if (key === 's') {
      event.preventDefault();
      saveCurrent();
    } else if (key === 'k') {
      const activeElement = document.activeElement;
      if (
        activeElement === els.noteTitle ||
        activeElement?.closest?.('.dialog')
      ) return;
      event.preventDefault();
      openLinkDialog();
    }
  });

  // ---- Bootstrap: load notes or create the first one ----
  const loaded = store.loadAll();
  if (loaded) {
    const existing = store.list();
    const note = existing.length > 0 ? existing[0] : store.create();
    if (note) {
      loadNote(note);
    } else {
      setEditingEnabled(false);
    }

    // Some entries were unreadable. They stay on disk untouched; offer the raw
    // data as a download so the user has a chance to salvage them by hand.
    const damaged = store.damagedCount();
    if (damaged > 0) {
      const raw = store.getRecoveryData();
      const noun = damaged === 1 ? 'note' : 'notes';
      showConfirm(
        'Some Notes Could Not Be Read',
        `${damaged} saved ${noun} could not be opened. Your other notes are fine, and nothing has been deleted. Download a copy of the unreadable data?`,
        () => {
          if (raw !== null) downloadRecovery(raw);
        },
        { confirmLabel: 'Download Copy', cancelLabel: 'Not Now' }
      );
    }
  } else {
    loadNote(null);
    setEditingEnabled(false);
    const recoveryRaw = store.getRecoveryData();
    if (recoveryRaw !== null) {
      setSaveStatus(STATUS.recovery);
      showConfirm(
        'Saved Notes Need Recovery',
        'ROSIE-WRITE could not read your saved notes. It will download a copy and keep a backup in this browser before starting fresh. Cancel leaves the original data untouched.',
        () => {
          downloadRecovery(recoveryRaw);
          const backupKey = store.resetCorruptStorage();
          if (!backupKey) {
            // Keep the honest status; the subscriber's "Save failed" is wrong here.
            setSaveStatus(STATUS.recovery);
            showToast(
              'Could not set aside a backup, so nothing was changed. Free up browser storage and reload to try again.',
              'error'
            );
            return;
          }
          setEditingEnabled(true);
          const note = store.create();
          if (note) {
            loadNote(note);
            showToast(`Backup kept in this browser as "${backupKey}".`, 'success');
          } else {
            setEditingEnabled(false);
          }
        },
        { confirmLabel: 'Back Up & Reset' }
      );
    } else {
      setSaveStatus(STATUS.unavailable);
    }
  }

  bindVersionIndicator();

  window.addEventListener('beforeunload', (event) => {
    if (!saveCurrent()) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
