// Import a note from html / md / txt into the editor as a new note.
import { convertMarkdownToHtml } from './md-to-html.js';

function escapeText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

// fileToHtml: returns { title, html } for the dropped/selected file.
export function fileToHtml(file, content) {
  const ext = file.name.split('.').pop().toLowerCase();
  const title = file.name.replace(/\.[^/.]+$/, '');

  let html;
  if (ext === 'html') {
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    html = bodyMatch ? bodyMatch[1] : content;
  } else if (ext === 'md' || ext === 'markdown') {
    html = convertMarkdownToHtml(content);
  } else {
    html = escapeText(content);
  }
  return { title, html };
}
