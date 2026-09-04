// Save status text + word/character count.
let saveStatusEl = null;
let wordCountEl = null;

// Shared so callers can't drift from the strings that drive the LED styling.
export const STATUS = {
  saved: 'All changes saved',
  unsaved: 'Unsaved changes',
  failed: 'Save failed',
  recovery: 'Notes need recovery',
  unavailable: 'Storage unavailable',
};

// Statuses that mean "your work is not safely stored". These must not show the
// steady green LED, which reads as "all good".
const ERROR_STATUSES = new Set([STATUS.failed, STATUS.recovery, STATUS.unavailable]);

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
  const isError = ERROR_STATUSES.has(message);
  const isSaving =
    !isError && (message === STATUS.unsaved || message.includes('Saving'));
  saveStatusEl.classList.toggle('saving', isSaving);
  saveStatusEl.classList.toggle('error', isError);
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
