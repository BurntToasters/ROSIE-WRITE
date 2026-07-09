// Document rail (left sidebar): note list, search, new/delete/delete-all.
// Replaces the v1 <select> dropdown + option-hiding search.
import * as store from '../notes/store.js';
import { showConfirm, showToast } from './dialogs.js';

let els = {};
let onSwitch = null; // (note) => void  — load a note into the editor
let saveCurrent = null; // () => void   — flush the open note before switching

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
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
  itemBtn.addEventListener('click', () => selectNote(note.id));

  const pinBtn = document.createElement('button');
  pinBtn.type = 'button';
  pinBtn.className = 'rail-item-pin' + (note.pinned ? ' pinned' : '');
  pinBtn.title = note.pinned ? 'Unpin Note' : 'Pin Note';
  pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
  pinBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  const pinnedNotes = notes.filter((n) => n.pinned);
  const recentNotes = notes.filter((n) => !n.pinned);

  if (pinnedNotes.length > 0) {
    const header = document.createElement('div');
    header.className = 'rail-section-header';
    header.innerHTML = '<i class="fas fa-thumbtack"></i> Pinned';
    els.list.appendChild(header);

    for (const note of pinnedNotes) {
      els.list.appendChild(createNoteItem(note, currentId));
    }

    if (recentNotes.length > 0) {
      const headerRecent = document.createElement('div');
      headerRecent.className = 'rail-section-header';
      headerRecent.innerHTML = '<i class="fas fa-clock"></i> Recent';
      els.list.appendChild(headerRecent);
    }
  }

  for (const note of recentNotes) {
    els.list.appendChild(createNoteItem(note, currentId));
  }
}

function selectNote(id) {
  if (id === store.currentId()) return;
  saveCurrent?.();
  store.setCurrent(id);
  onSwitch?.(store.get(id));
  render();
}

export function initSidebar(config) {
  els = config.els;
  onSwitch = config.onSwitch;
  saveCurrent = config.saveCurrent;

  els.newBtn?.addEventListener('click', () => {
    saveCurrent?.();
    const note = store.create();
    onSwitch?.(note);
    render();
  });

  els.deleteBtn?.addEventListener('click', () => {
    const id = store.currentId();
    if (!id) return;
    if (store.count() <= 1) {
      showToast("You can't delete your only note. Create a new note first.", 'warning');
      return;
    }
    showConfirm('Delete Note', 'Are you sure you want to delete this note?', () => {
      store.remove(id);
      onSwitch?.(store.current());
      render();
    });
  });

  els.deleteAllBtn?.addEventListener('click', () => {
    const n = store.count();
    if (n === 0) {
      showToast("You don't have any notes to delete.", 'warning');
      return;
    }
    showConfirm(
      'Delete All Notes',
      `Are you sure you want to delete ALL ${n} notes? This action cannot be undone.`,
      () => {
        store.removeAll();
        const note = store.create();
        onSwitch?.(note);
        render();
      }
    );
  });

  els.search?.addEventListener('input', render);

  // Re-render whenever the store changes (e.g. autosave updates lastModified).
  store.subscribe(render);
  render();
}
