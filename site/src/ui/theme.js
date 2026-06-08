// Dark mode toggle. Shared by index/about/404. Adds/removes `.dark-mode` on body,
// persists to localStorage `rosieWriteDarkMode`, honors system preference on first run.
const KEY = 'rosieWriteDarkMode';

function applyButtonIcon(btn, isDark) {
  if (!btn) return;
  btn.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}

export function initTheme(toggleBtn) {
  const saved = localStorage.getItem(KEY);
  let isDark;
  if (saved !== null) {
    isDark = saved === 'true';
  } else {
    isDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) localStorage.setItem(KEY, 'true');
  }
  document.body.classList.toggle('dark-mode', isDark);
  applyButtonIcon(toggleBtn, isDark);

  toggleBtn?.addEventListener('click', () => {
    const next = !document.body.classList.contains('dark-mode');
    document.body.classList.toggle('dark-mode', next);
    applyButtonIcon(toggleBtn, next);
    localStorage.setItem(KEY, String(next));
  });
}
