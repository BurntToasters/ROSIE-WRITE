// Global font-size control. Matches v1 behavior: the +/- buttons set the base
// font size of the whole editor surface (not per-selection), 8-24pt, persisted
// to localStorage `rosieWriteFontSize`. Applied as a CSS variable on the editor.
import { readPref, writePref } from '../prefs.js';

const KEY = 'rosieWriteFontSize';
const MIN = 8;
const MAX = 24;
const DEFAULT = 12;

let size = DEFAULT;
let editorEl = null;
let indicatorEl = null;

function apply() {
  if (editorEl) editorEl.style.setProperty('--editor-font-size', `${size}pt`);
  if (indicatorEl) indicatorEl.textContent = `${size}pt`;
}

export function initFontSize({ editor, decreaseBtn, increaseBtn, indicator }) {
  editorEl = editor;
  indicatorEl = indicator;

  const saved = parseInt(readPref(KEY), 10);
  if (!Number.isNaN(saved)) size = Math.max(MIN, Math.min(MAX, saved));
  apply();

  decreaseBtn?.addEventListener('click', () => change(-1));
  increaseBtn?.addEventListener('click', () => change(1));
}

function change(delta) {
  size = Math.max(MIN, Math.min(MAX, size + delta));
  writePref(KEY, String(size));
  apply();
}
