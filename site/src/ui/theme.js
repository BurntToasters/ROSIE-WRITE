// Dark mode toggle. Shared by index/about/404. Adds/removes `.dark-mode` on body,
// persists to localStorage `rosieWriteDarkMode`, honors system preference on first run.
import { readPref, writePref } from '../prefs.js';

const KEY = 'rosieWriteDarkMode';

function applyButtonIcon(btn, isDark) {
  if (!btn) return;
  btn.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}

export function initTheme(toggleBtn) {
  const saved = readPref(KEY);
  let isDark;
  if (saved !== null) {
    isDark = saved === 'true';
  } else {
    isDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) writePref(KEY, 'true');
  }
  document.body.classList.toggle('dark-mode', isDark);
  applyButtonIcon(toggleBtn, isDark);

  toggleBtn?.addEventListener('click', () => {
    const next = !document.body.classList.contains('dark-mode');
    toggleBtn.classList.add('theme-spin');
    document.body.classList.toggle('dark-mode', next);
    applyButtonIcon(toggleBtn, next);
    writePref(KEY, String(next));
    setTimeout(() => {
      toggleBtn.classList.remove('theme-spin');
    }, 450);
  });
}
