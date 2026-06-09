// Only the solid + brands icon sets are used — import those rather than all.min
// (which also pulls the unused regular + v4-compat fonts).
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import '@fortawesome/fontawesome-free/css/brands.min.css';
import './styles/base.css';
import './styles/app.css';
import './styles/editor.css';
import './styles/dialogs.css';

import { createEditor } from './editor/editor.js';
import * as store from './notes/store.js';
import { initTheme } from './ui/theme.js';
import { initStatusbar, setSaveStatus, updateWordCount } from './ui/statusbar.js';
import { initFontSize } from './ui/fontsize.js';
import { initToolbar, refreshToolbar } from './ui/toolbar.js';
import { initSidebar } from './ui/sidebar.js';
import { initDialogs, openLinkDialog } from './ui/dialogs.js';
import { fileToHtml } from './io/import.js';
import { bindVersionIndicator } from './version.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const $ = (id) => document.getElementById(id);

function init() {
  const els = {
    pageContent: $('pageContent'),
    noteTitle: $('noteTitle'),
    saveStatus: $('saveStatus'),
    wordCount: $('wordCount'),
    // sidebar
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
    importFile: $('importFile'),
    // dialogs
    linkDialog: $('linkDialog'), linkText: $('linkText'), linkUrl: $('linkUrl'),
    insertLinkBtn: $('insertLink'), cancelLinkBtn: $('cancelLink'),
    exportDialog: $('exportFormatDialog'), cancelExportBtn: $('cancelExport'),
    formatBtns: document.querySelectorAll('.format-btn'),
  };

  // Mobile sidebar toggle.
  $('railToggle')?.addEventListener('click', () => {
    $('app').classList.toggle('rail-open');
  });

  let saveTimer = null;
  let suppressUpdate = false; // skip autosave while we programmatically set content

  const editor = createEditor({
    element: els.pageContent,
    onChange: (ed) => {
      if (suppressUpdate) return;
      setSaveStatus('Unsaved changes');
      updateWordCount(ed.getText());
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveCurrent, 1000);
    },
    onSelection: (ed) => refreshToolbar(ed),
  });

  function saveCurrent() {
    const id = store.currentId();
    if (!id) return;
    store.save(id, {
      title: els.noteTitle.value || 'Untitled Note',
      content: editor.getHTML(),
    });
    setSaveStatus('All changes saved');
  }

  // Load a note into the editor + title (without triggering autosave).
  function loadNote(note) {
    // Cancel any pending debounced save so it can't write the outgoing note's
    // title/content into the note we're switching to.
    clearTimeout(saveTimer);
    suppressUpdate = true;
    if (note) {
      store.setCurrent(note.id);
      els.noteTitle.value = note.title;
      editor.commands.setContent(note.content || '', { emitUpdate: false });
    } else {
      els.noteTitle.value = '';
      editor.commands.clearContent();
    }
    updateWordCount(editor.getText());
    refreshToolbar(editor);
    // Allow ProseMirror's async transactions to settle before re-enabling.
    setTimeout(() => { suppressUpdate = false; }, 0);
  }

  // ---- Image insert (file picker + paste), base64, 5MB cap ----
  function insertImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert('Image is too large. Please select an image under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      editor.chain().focus().setImage({ src: e.target.result, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
  }

  els.imageInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) insertImageFile(file);
    e.target.value = '';
  });

  els.pageContent.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) insertImageFile(file);
        break;
      }
    }
  });

  // ---- Title edits autosave ----
  els.noteTitle.addEventListener('input', () => {
    setSaveStatus('Unsaved changes');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCurrent, 1000);
  });

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

  // ---- Import ----
  els.importFile?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const note = store.create();
      const { title, html } = fileToHtml(file, ev.target.result);
      els.noteTitle.value = title;
      suppressUpdate = true;
      editor.commands.setContent(html, { emitUpdate: false });
      setTimeout(() => { suppressUpdate = false; }, 0);
      saveCurrent();
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // ---- Keyboard shortcuts (Ctrl+S save, Ctrl+K link). B/I/U/Z/Y native. ----
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey) return;
    const key = e.key.toLowerCase();
    if (key === 's') {
      e.preventDefault();
      saveCurrent();
    } else if (key === 'k') {
      if (document.activeElement === els.noteTitle) return;
      e.preventDefault();
      openLinkDialog();
    }
  });

  // ---- Bootstrap: load notes or create the first one ----
  store.loadAll();
  const existing = store.list();
  if (existing.length > 0) {
    loadNote(existing[0]);
  } else {
    loadNote(store.create());
  }

  bindVersionIndicator();

  window.addEventListener('beforeunload', saveCurrent);
}

document.addEventListener('DOMContentLoaded', init);
