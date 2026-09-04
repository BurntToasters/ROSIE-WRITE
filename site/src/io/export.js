// Export the current note to html / md / txt / pdf / rtf.
import { convertToPlainText } from './html-to-plain.js';
import { convertToMarkdown } from './html-to-md.js';
import { convertHtmlToRtf } from './html-to-rtf.js';
import { showToast } from '../ui/dialogs.js';

function downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function safeName(title) {
  return title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// Escape the note title (plain text from an input) before embedding it in the
// exported HTML/PDF markup, so a title like `<script>` can't execute there.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createFullHtmlDocument(title, content) {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }
        img { max-width: 100%; height: auto; }
        h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
        p { margin: 1em 0; }
        ul, ol { padding-left: 2em; }
        a { color: #1a73e8; }
    </style>
</head>
<body>
    <h1>${safeTitle}</h1>
    ${content}
</body>
</html>`;
}

function exportToPdf(title, content) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    showToast(
      'Please allow pop-ups to export PDF. You can also use your browser\'s Print function (Ctrl+P) and select "Save as PDF".',
      'warning'
    );
    return;
  }
  const safeTitle = escapeHtml(title);
  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>${safeTitle}</title>
<style>
  @media print { body { margin: 0; padding: 20mm; } .print-instructions { display: none; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 40px; background: white; color: #000; max-width: 800px; margin: 0 auto; line-height: 1.6; }
  h1 { margin-bottom: 20px; font-size: 28px; }
  h2 { margin: 20px 0 10px; font-size: 22px; }
  h3 { margin: 15px 0 8px; font-size: 18px; }
  p { margin: 10px 0; }
  img { max-width: 100%; height: auto; display: block; margin: 15px 0; }
  ul, ol { margin: 10px 0; padding-left: 30px; }
  li { margin: 5px 0; }
  .content { font-size: 14px; }
  .print-instructions { background: #f0f0f0; padding: 15px; margin-bottom: 20px; border-radius: 5px; font-size: 14px; }
  .print-instructions button { background: #1a73e8; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; margin-right: 10px; }
  .print-instructions button:hover { background: #1666c1; }
</style></head>
<body>
  <div class="print-instructions">
    <p><strong>To save as PDF:</strong> Click the button below, then select "Save as PDF" as your printer.</p>
    <button onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Cancel</button>
  </div>
  <h1>${safeTitle}</h1>
  <div class="content">${content}</div>
</body></html>`);
  printWindow.document.close();
}

function exportToRtf(title, content) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const rtf = convertHtmlToRtf(title, tempDiv);
  downloadBlob(rtf, 'application/rtf', `${safeName(title)}.rtf`);
}

// editor: TipTap editor instance, title: note title, format: html|md|txt|pdf|rtf
export function exportNote(editor, title, format = 'html') {
  if (!editor) return;
  const safeTitle = title || 'Untitled';
  const content = editor.getHTML();

  if (format === 'pdf') return exportToPdf(safeTitle, content);
  if (format === 'rtf') return exportToRtf(safeTitle, content);

  let out, mime, ext;
  switch (format) {
    case 'txt':
      out = convertToPlainText(content);
      mime = 'text/plain';
      ext = 'txt';
      break;
    case 'md':
      out = convertToMarkdown(content);
      mime = 'text/markdown';
      ext = 'md';
      break;
    case 'html':
    default:
      out = createFullHtmlDocument(safeTitle, content);
      mime = 'text/html';
      ext = 'html';
      break;
  }
  downloadBlob(out, mime, `${safeName(safeTitle)}.${ext}`);
}
