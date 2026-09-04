// Notes persistence layer. Pure data + localStorage; no DOM.
// V2 uses a fresh storage key — no migration from the v1 `rosieWriteNotes` key.
// Note shape: { id, title, content (HTML string), searchText, pinned, lastModified }.

const STORAGE_KEY = 'rosieWriteNotesV2';

const state = {
  notes: {},
  currentId: null,
  subscribers: new Set(),
  errorSubscribers: new Set(),
  lastPersistedRaw: null,
  recoveryRaw: null,
  writeBlock: null,
  // Entries that failed validation. Hidden from the UI but preserved on disk.
  quarantine: {},
  lastCommitFailed: false,
};

function notify() {
  for (const fn of state.subscribers) fn();
}

function reportError(code, error) {
  for (const fn of state.errorSubscribers) fn({ code, error });
}

function classifyStorageError(error) {
  if (
    error?.name === 'QuotaExceededError' ||
    error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error?.code === 22 ||
    error?.code === 1014
  ) {
    return 'storage-quota';
  }
  return 'storage-unavailable';
}

function isValidNote(id, note) {
  return Boolean(
    note &&
    typeof note === 'object' &&
    !Array.isArray(note) &&
    note.id === id &&
    typeof note.title === 'string' &&
    typeof note.content === 'string' &&
    typeof note.lastModified === 'string' &&
    (note.searchText === undefined || typeof note.searchText === 'string') &&
    (note.pinned === undefined || typeof note.pinned === 'boolean')
  );
}

// Split stored data into notes we can use and entries we can't parse. A single
// damaged note must not condemn every other note in the file.
function partitionNotes(parsed) {
  const valid = {};
  const quarantined = {};
  for (const [id, note] of Object.entries(parsed)) {
    if (isValidNote(id, note)) valid[id] = note;
    else quarantined[id] = note;
  }
  return { valid, quarantined };
}

function newNoteId() {
  // Random suffix so rapid creates within the same millisecond don't collide.
  return 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function blankNote(id) {
  return {
    id,
    title: 'Untitled Note',
    content: '',
    searchText: '',
    pinned: false,
    lastModified: new Date().toISOString(),
  };
}

// Every mutation goes through here. `mutate` receives the freshest notes we can
// see and returns the next map.
//
// Writes are never blind: if another tab has written since we last read, we
// re-read and replay the mutation on top of *its* data instead of overwriting
// the whole file. Refusing the write instead would be worse than a clobber —
// the tab would be stuck read-only with unsaved text and no way out.
//
// Unreadable quarantined entries are written back untouched so a damaged note
// is never silently dropped from storage.
function commit(mutate, { purgeQuarantine = false } = {}) {
  if (state.writeBlock) {
    reportError(state.writeBlock, new Error('Note storage is locked until recovery.'));
    return false;
  }

  const localBefore = state.notes;

  try {
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    let base = localBefore;
    let externalQuarantine = null;
    let remoteDropped = [];

    if (currentRaw !== state.lastPersistedRaw) {
      const external = readExternal(currentRaw);
      if (!external) {
        // Another tab left data we can't parse. Don't touch it.
        state.lastCommitFailed = true;
        reportError(
          'storage-conflict',
          new Error('Another tab wrote notes that could not be read.')
        );
        return false;
      }
      base = external.valid;
      externalQuarantine = external.quarantined;
      // What the *other* tab removed, independent of what this mutation does.
      remoteDropped = Object.keys(localBefore).filter((id) => !(id in base));
    }

    // When another tab's file was re-read, its quarantine is authoritative —
    // unioning ours back in would undo a purge it just performed.
    const nextQuarantine = purgeQuarantine
      ? {}
      : (externalQuarantine || state.quarantine);

    const nextNotes = mutate(base);
    const nextRaw = JSON.stringify({ ...nextQuarantine, ...nextNotes });
    localStorage.setItem(STORAGE_KEY, nextRaw);

    // Storage accepted the write — only now is it safe to publish in memory.
    // Nothing above this line may mutate `state`, or a failed write would leave
    // memory describing data that was never stored.
    state.notes = nextNotes;
    state.quarantine = nextQuarantine;
    state.lastPersistedRaw = nextRaw;
    state.lastCommitFailed = false;

    // `currentId` is deliberately left alone even if it now points at nothing.
    // Silently re-pointing it would send the editor's pending autosave into a
    // different note and overwrite it. The UI is told instead, so it can rescue
    // the on-screen text.
    if (remoteDropped.length > 0) {
      reportError(
        'storage-remote-delete',
        new Error(`${remoteDropped.length} note(s) were deleted in another tab.`)
      );
      if (state.currentId && !nextNotes[state.currentId]) {
        reportError(
          'storage-current-deleted',
          new Error('The note open in this tab was deleted elsewhere.')
        );
      }
    }

    return true;
  } catch (error) {
    // Logged because classifyStorageError flattens everything (including a bug
    // in `mutate`) into a storage message, which would otherwise hide the cause.
    console.error('Note save failed:', error);
    state.lastCommitFailed = true;
    reportError(classifyStorageError(error), error);
    return false;
  }
}

function readExternal(raw) {
  if (!raw) return { valid: {}, quarantined: {} };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return partitionNotes(parsed);
  } catch {
    return null;
  }
}

export function subscribe(fn) {
  state.subscribers.add(fn);
  return () => state.subscribers.delete(fn);
}

export function subscribeErrors(fn) {
  state.errorSubscribers.add(fn);
  return () => state.errorSubscribers.delete(fn);
}

// Returns false when storage is unavailable or saved data needs recovery.
export function loadAll() {
  state.notes = {};
  state.currentId = null;
  state.lastPersistedRaw = null;
  state.recoveryRaw = null;
  state.writeBlock = null;
  state.quarantine = {};
  state.lastCommitFailed = false;

  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    state.writeBlock = 'storage-unavailable';
    reportError('storage-unavailable', error);
    notify();
    return false;
  }

  if (!raw) {
    notify();
    return true;
  }

  const external = readExternal(raw);
  if (!external) {
    // The file itself is unreadable. Keep the original bytes untouched and
    // block writes until the user picks a recovery option, so a blank note
    // can't replace data that might still be salvageable by hand.
    state.lastPersistedRaw = raw;
    state.recoveryRaw = raw;
    state.writeBlock = 'storage-corrupt';
    reportError('storage-corrupt', new Error('Saved notes could not be parsed.'));
    notify();
    return false;
  }

  state.notes = external.valid;
  state.quarantine = external.quarantined;
  state.lastPersistedRaw = raw;

  const damaged = Object.keys(external.quarantined).length;
  if (damaged > 0) {
    // Usable notes still open normally; the damaged ones stay on disk and are
    // offered for download rather than being deleted.
    state.recoveryRaw = raw;
    reportError('storage-partial', new Error(`${damaged} saved note(s) could not be read.`));
  }

  notify();
  return true;
}

export function damagedCount() {
  return Object.keys(state.quarantine).length;
}

// False when notes can't be persisted right now — either blocked at load time
// or because the most recent write failed (quota, unreadable external data).
export function isWritable() {
  return state.writeBlock === null && !state.lastCommitFailed;
}

export function getRecoveryData() {
  return state.recoveryRaw;
}

// Clear the unreadable value so the app can be used again.
//
// The browser gives no signal about whether the recovery download succeeded, so
// the original is copied to a timestamped backup key *first* and only then
// cleared. If the download was blocked or cancelled, the data is still there.
// Returns the backup key so the UI can tell the user where it went.
export function resetCorruptStorage() {
  if (state.writeBlock !== 'storage-corrupt' || state.recoveryRaw === null) {
    return null;
  }

  const backupKey = `${STORAGE_KEY}.damaged-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  try {
    if (localStorage.getItem(STORAGE_KEY) !== state.recoveryRaw) {
      reportError(
        'storage-conflict',
        new Error('Saved notes changed while the recovery dialog was open.')
      );
      return null;
    }
    localStorage.setItem(backupKey, state.recoveryRaw);
    // Only safe to clear now that a second copy exists.
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    reportError(classifyStorageError(error), error);
    return null;
  }

  state.notes = {};
  state.currentId = null;
  state.lastPersistedRaw = null;
  state.recoveryRaw = null;
  state.writeBlock = null;
  state.quarantine = {};
  state.lastCommitFailed = false;
  notify();
  return backupKey;
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
  return (state.currentId && state.notes[state.currentId]) || null;
}

export function setCurrent(id) {
  if (state.currentId === id) return;
  state.currentId = id;
  notify();
}

export function count() {
  return Object.keys(state.notes).length;
}

export function create() {
  const id = newNoteId();
  const note = blankNote(id);

  if (!commit((base) => ({ ...base, [id]: note }))) return null;
  state.currentId = id;
  notify();
  return note;
}

export function save(id, { title, content, searchText = '' }) {
  if (!id) return false;

  const previous = state.notes[id];
  if (!previous) {
    // Returning a bare false here used to leave the UI unable to explain itself.
    reportError('storage-missing-note', new Error('The open note no longer exists.'));
    return false;
  }
  const ok = commit((base) => {
    if (!(id in base)) {
      // Another tab deleted this note. Do not write it back.
      return base;
    }
    const external = base[id];
    const updated = {
      ...(external || previous),
      title: title || 'Untitled Note',
      content,
      searchText,
      lastModified: new Date().toISOString(),
    };

    // Another tab changed this same note after we loaded it. Keep our version
    // where the user is typing and park theirs beside it, so neither is lost.
    // Compare the content itself: `lastModified` also moves on a pin toggle,
    // which would otherwise fork an identical copy on every save.
    const diverged = external &&
      (external.content !== previous.content || external.title !== previous.title);
    if (diverged) {
      // Two tabs typing in one note would otherwise fork a copy on every
      // alternating save. Only keep a copy of content we haven't parked already.
      const alreadyKept = Object.values(base).some(
        (candidate) => candidate.id !== id && candidate.content === external.content
      );
      if (alreadyKept) return { ...base, [id]: updated };

      const copyId = newNoteId();
      return {
        ...base,
        [copyId]: {
          ...external,
          id: copyId,
          title: `${external.title} (conflicted copy)`,
        },
        [id]: updated,
      };
    }

    return { ...base, [id]: updated };
  });

  if (!ok) return false;
  if (!state.notes[id]) {
    notify();
    return false;
  }
  notify();
  return true;
}

export function togglePin(id) {
  if (!id || !state.notes[id]) return false;

  const desired = !state.notes[id].pinned;
  const ok = commit((base) => {
    const target = base[id];
    // Deleted in another tab — don't resurrect a note just to pin it.
    if (!target) return base;
    return {
      ...base,
      [id]: { ...target, pinned: desired, lastModified: new Date().toISOString() },
    };
  });

  if (!ok) return false;
  notify();
  return true;
}

export function remove(id) {
  if (!state.notes[id]) return false;

  const ok = commit((base) => {
    const nextNotes = { ...base };
    delete nextNotes[id];
    return nextNotes;
  });

  if (!ok) return false;
  if (state.currentId === id) {
    const next = list()[0];
    state.currentId = next ? next.id : null;
  }
  notify();
  return true;
}



// Delete everything and open a fresh note in a single write. Doing this as two
// commits could clear storage and then fail to create the replacement, leaving
// the UI showing a deleted note with no current id and no way to save.
export function replaceAllWithNew() {
  const id = newNoteId();
  const note = blankNote(id);

  // "Delete all" has to mean all, including entries we couldn't read —
  // otherwise quarantined notes would be undeletable and keep using storage.
  if (!commit(() => ({ [id]: note }), { purgeQuarantine: true })) return null;
  state.currentId = id;
  notify();
  return note;
}

function fallbackSearchText(html) {
  return html
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

// Returns notes (newest-first) whose title or visible text matches the term.
export function search(term) {
  const q = term.toLowerCase().trim();
  if (!q) return list();
  return list().filter((note) => {
    const text = typeof note.searchText === 'string'
      ? note.searchText
      : fallbackSearchText(note.content);
    return note.title.toLowerCase().includes(q) || text.toLowerCase().includes(q);
  });
}
