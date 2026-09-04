// Import a note from html / md / txt into the editor as a new note.
import { convertMarkdownToHtml } from './md-to-html.js';

function escapeText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

const EMBEDDED_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp);base64,/i;
// Attributes that can make the browser fetch a remote resource on render.
const FETCHING_ATTRS = ['src', 'srcset', 'poster', 'xlink:href', 'href', 'style', 'background'];
// `href` is only a fetch risk off anchors (SVG <use>, <link>); links keep theirs.
const HREF_ALLOWED_ON = new Set(['a']);
const KEEP_ATTRS = new Set(['src', 'alt', 'title', 'width', 'height']);

// Only embedded raster images are safe to render without contacting a server.
//
// This parses rather than pattern-matches. A regex over raw tags fails open on
// ordinary markup — an apostrophe in alt text, a `>` inside an attribute — and
// failing open here means silently leaking a request to a third party. The
// parse is inert: `text/html` via DOMParser loads no subresources and runs no
// script. `<image>` is covered too, since the parser retags it as `img`.
function omitExternalImages(html) {
  if (typeof DOMParser !== 'function') {
    // No DOM available (non-browser); nothing will render this string here.
    return { safeHtml: html, omittedImages: 0 };
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  let omittedImages = 0;

  for (const node of [...doc.querySelectorAll('img, image')]) {
    const src = (node.getAttribute('src') || node.getAttribute('xlink:href') || '').trim();

    if (EMBEDDED_IMAGE.test(src)) {
      // Keep the picture, drop anything else that could fetch or execute.
      for (const attr of [...node.attributes]) {
        if (!KEEP_ATTRS.has(attr.name.toLowerCase())) node.removeAttribute(attr.name);
      }
      node.setAttribute('src', src);
      continue;
    }

    omittedImages += 1;
    const placeholder = doc.createElement('span');
    placeholder.textContent = '[External image omitted for privacy]';
    node.replaceWith(placeholder);
  }

  // Strip remote-fetching attributes left anywhere else: CSS background images,
  // video posters, SVG references.
  for (const node of [...doc.body.querySelectorAll('*')]) {
    for (const attr of FETCHING_ATTRS) {
      const value = node.getAttribute(attr);
      if (value === null) continue;
      if (attr === 'src' && EMBEDDED_IMAGE.test(value.trim())) continue;
      if (attr === 'style' && !/url\s*\(/i.test(value)) continue;
      if (attr === 'href' && HREF_ALLOWED_ON.has(node.tagName.toLowerCase())) continue;
      node.removeAttribute(attr);
    }
  }

  return { safeHtml: doc.body.innerHTML, omittedImages };
}

// Returns converted HTML plus the number of external images omitted.
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

  const { safeHtml, omittedImages } = omitExternalImages(html);
  return { title, html: safeHtml, omittedImages };
}
