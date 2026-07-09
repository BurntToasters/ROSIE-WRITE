// Save status text + word/character count.
let saveStatusEl = null;
let wordCountEl = null;
let resetTimer = null;

export function initStatusbar({ saveStatus, wordCount }) {
  saveStatusEl = saveStatus;
  wordCountEl = wordCount;
}

export function setSaveStatus(message) {
  if (!saveStatusEl) return;
  const textEl = saveStatusEl.querySelector('.status-text');
  if (textEl) {
    textEl.textContent = message;
  } else {
    saveStatusEl.textContent = message;
  }
  const isSaving = message === 'Unsaved changes' || message.includes('Saving');
  saveStatusEl.classList.toggle('saving', isSaving);
}

// Briefly show a transient message, then revert to "All changes saved".
export function flashSaveStatus(message, ms = 1500) {
  setSaveStatus(message);
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => setSaveStatus('All changes saved'), ms);
}

export function updateWordCount(text) {
  if (!wordCountEl) return;
  const trimmed = (text || '').trim();
  const charCount = trimmed.length;
  const wordCount =
    trimmed.length > 0 ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  wordCountEl.textContent = `${wordCount} ${
    wordCount === 1 ? 'word' : 'words'
  } | ${charCount} ${charCount === 1 ? 'character' : 'characters'}`;
}
