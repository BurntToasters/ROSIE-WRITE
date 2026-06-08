// Document rail (left sidebar): note list, search, new/delete/delete-all.
// Replaces the v1 <select> dropdown + option-hiding search.
import * as store from '../notes/store.js';

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

  for (const note of notes) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'rail-item' + (note.id === currentId ? ' active' : '');
    item.dataset.id = note.id;

    const title = document.createElement('span');
    title.className = 'rail-item-title';
    title.textContent = note.title || 'Untitled Note';

    const date = document.createElement('span');
    date.className = 'rail-item-date';
    date.textContent = fmtDate(note.lastModified);

    item.append(title, date);
    item.addEventListener('click', () => selectNote(note.id));
    els.list.appendChild(item);
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
      alert("You can't delete your only note. Create a new note first.");
      return;
    }
    if (!confirm('Are you sure you want to delete this note?')) return;
    store.remove(id);
    onSwitch?.(store.current());
    render();
  });

  els.deleteAllBtn?.addEventListener('click', () => {
    const n = store.count();
    if (n === 0) {
      alert("You don't have any notes to delete.");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete ALL ${n} notes? This action cannot be undone.`
      )
    )
      return;
    store.removeAll();
    const note = store.create();
    onSwitch?.(note);
    render();
  });

  els.search?.addEventListener('input', render);

  // Re-render whenever the store changes (e.g. autosave updates lastModified).
  store.subscribe(render);
  render();
}
