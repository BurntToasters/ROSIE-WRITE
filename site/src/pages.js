// Entry for the static content pages (about, 404). Just FA (solid) + theming.
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import './styles/base.css';
import './styles/pages.css';
import { initTheme } from './ui/theme.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme(document.getElementById('toggleTheme'));
});
