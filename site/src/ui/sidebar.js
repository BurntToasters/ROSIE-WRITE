// Document rail (left sidebar): note list, search, new/delete/delete-all.
// Replaces the v1 <select> dropdown + option-hiding search.
import * as store from '../notes/store.js';
import { showConfirm, showToast } from './dialogs.js';

let els = {};
let onSwitch = null; // (note) => void — load a note into the editor
let saveCurrent = null; // () => boolean — flush the open note before switching
let onSelectCurrent = null; // () => void — current note tapped again (close mobile rail)

function fmtDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function createNoteItem(note, currentId) {
  const container = document.createElement('div');
  container.className = 'rail-item' + (note.id === currentId ? ' active' : '');
  container.dataset.id = note.id;

  const itemBtn = document.createElement('button');
  itemBtn.type = 'button';
  itemBtn.className = 'rail-item-body';

  const title = document.createElement('span');
  title.className = 'rail-item-title';
  title.textContent = note.title || 'Untitled Note';

  const date = document.createElement('span');
  date.className = 'rail-item-date';
  date.textContent = fmtDate(note.lastModified);

  itemBtn.append(title, date);
  itemBtn.setAttribute(
    'aria-label',
    `${title.textContent}${date.textContent ? `, modified ${date.textContent}` : ''}`
  );
  itemBtn.addEventListener('click', () => selectNote(note.id));

  const pinBtn = document.createElement('button');
  pinBtn.type = 'button';
  pinBtn.className = 'rail-item-pin' + (note.pinned ? ' pinned' : '');
  pinBtn.title = note.pinned ? 'Unpin Note' : 'Pin Note';
  pinBtn.setAttribute('aria-label', pinBtn.title);
  pinBtn.setAttribute('aria-pressed', String(Boolean(note.pinned)));
  pinBtn.innerHTML = '<i class="fas fa-thumbtack" aria-hidden="true"></i>';
  pinBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    store.togglePin(note.id);
  });

  container.append(itemBtn, pinBtn);
  return container;
}

function render() {
  const term = els.search?.value || '';
  const notes = store.search(term);
  const currentId = store.currentId();
  els.list.innerHTML = '';

  if (notes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'rail-empty';
    empty.textContent = term ? 'No matching notes' : 'No notes yet';
    els.list.appendChild(empty);
    return;
  }

  const pinnedNotes = notes.filter((note) => note.pinned);
  const recentNotes = notes.filter((note) => !note.pinned);

  if (pinnedNotes.length > 0) {
    const header = document.createElement('div');
    header.className = 'rail-section-header';
    header.innerHTML = '<i class="fas fa-thumbtack" aria-hidden="true"></i> Pinned';
    els.list.appendChild(header);

    for (const note of pinnedNotes) {
      els.list.appendChild(createNoteItem(note, currentId));
    }

    if (recentNotes.length > 0) {
      const headerRecent = document.createElement('div');
      headerRecent.className = 'rail-section-header';
      headerRecent.innerHTML = '<i class="fas fa-clock" aria-hidden="true"></i> Recent';
      els.list.appendChild(headerRecent);
    }
  }

  for (const note of recentNotes) {
    els.list.appendChild(createNoteItem(note, currentId));
  }
}

function selectNote(id) {
  if (id === store.currentId()) {
    onSelectCurrent?.();
    return;
  }
  if (saveCurrent?.() === false) return;
  const note = store.get(id);
  if (note) onSwitch?.(note);
}

export function initSidebar(config) {
  els = config.els;
  onSwitch = config.onSwitch;
  saveCurrent = config.saveCurrent;
  onSelectCurrent = config.onSelectCurrent;

  els.newBtn?.addEventListener('click', () => {
    if (saveCurrent?.() === false) return;
    if (els.search) els.search.value = '';
    const note = store.create();
    if (note) onSwitch?.(note);
  });

  els.deleteBtn?.addEventListener('click', () => {
    const id = store.currentId();
    if (!id) return;
    if (store.count() <= 1) {
      showToast("You can't delete your only note. Create a new note first.", 'warning');
      return;
    }
    showConfirm('Delete Note', 'Are you sure you want to delete this note?', () => {
      if (store.remove(id)) onSwitch?.(store.current());
    });
  });

  els.deleteAllBtn?.addEventListener('click', () => {
    const noteCount = store.count();
    if (noteCount === 0) {
      showToast("You don't have any notes to delete.", 'warning');
      return;
    }
    showConfirm(
      'Delete All Notes',
      `Are you sure you want to delete ALL ${noteCount} notes? This action cannot be undone.`,
      () => {
        const note = store.replaceAllWithNew();
        if (note) onSwitch?.(note);
      }
    );
  });

  els.search?.addEventListener('input', render);

  // Re-render whenever the store changes (e.g. autosave updates lastModified).
  store.subscribe(render);
  render();
}
