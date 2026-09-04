// Guarded localStorage access for user preferences (theme, font size).
//
// Preferences are non-critical, but they are read during module init — before
// the notes store gets a chance to report a storage problem. Browsers with
// storage blocked (private mode, site data disabled) throw SecurityError on
// plain `localStorage` access, which would abort startup and hide the notes
// recovery UI. Fall back to in-memory defaults instead.
export function readPref(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
