// Notes persistence layer. Pure data + localStorage; no DOM.
// V2 uses a fresh storage key — no migration from the v1 `rosieWriteNotes` key.
// Note shape: { id, title, content (HTML string), lastModified (ISO) }.

const STORAGE_KEY = 'rosieWriteNotesV2';

const state = {
  notes: {},
  currentId: null,
  subscribers: new Set(),
};

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
}

function notify() {
  for (const fn of state.subscribers) fn();
}

export function subscribe(fn) {
  state.subscribers.add(fn);
  return () => state.subscribers.delete(fn);
}

export function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      state.notes = JSON.parse(raw) || {};
    } catch {
      state.notes = {};
    }
  }
  return state.notes;
}

// Notes sorted newest-first by lastModified.
export function list() {
  return Object.values(state.notes).sort(
    (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
  );
}

export function get(id) {
  return state.notes[id] || null;
}

export function currentId() {
  return state.currentId;
}

export function current() {
  return state.currentId ? state.notes[state.currentId] : null;
}

export function setCurrent(id) {
  state.currentId = id;
}

export function count() {
  return Object.keys(state.notes).length;
}

export function create() {
  // Random suffix so rapid creates within the same millisecond don't collide.
  const id = 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  state.notes[id] = {
    id,
    title: 'Untitled Note',
    content: '',
    lastModified: new Date().toISOString(),
  };
  state.currentId = id;
  persist();
  notify();
  return state.notes[id];
}

export function save(id, { title, content }) {
  if (!id || !state.notes[id]) return;
  state.notes[id] = {
    id,
    title: title || 'Untitled Note',
    content,
    lastModified: new Date().toISOString(),
  };
  persist();
  notify();
}

export function remove(id) {
  if (!state.notes[id]) return;
  delete state.notes[id];
  persist();
  if (state.currentId === id) {
    const next = list()[0];
    state.currentId = next ? next.id : null;
  }
  notify();
}

export function removeAll() {
  state.notes = {};
  state.currentId = null;
  persist();
  notify();
}

// Returns notes (newest-first) whose title or content matches the term.
export function search(term) {
  const q = term.toLowerCase().trim();
  if (!q) return list();
  return list().filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
  );
}
