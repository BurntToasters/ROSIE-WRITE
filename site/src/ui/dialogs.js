// Link insert/edit dialog + export-format chooser dialog.
import { exportNote } from '../io/export.js';

let editor = null;
let els = {};
let getTitle = () => 'Untitled';

function showLink() {
  // Prefill display text with the current selection, URL with an existing link.
  const { from, to } = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(from, to, ' ');
  els.linkText.value = selectedText || '';
  els.linkUrl.value = editor.getAttributes('link').href || '';
  els.linkDialog.classList.add('active');
  els.linkUrl.focus();
}

function hideLink() {
  els.linkDialog.classList.remove('active');
  els.linkText.value = '';
  els.linkUrl.value = '';
}

function insertLink() {
  const text = els.linkText.value.trim();
  let url = els.linkUrl.value.trim();
  if (!url) {
    alert('Please enter a URL');
    return;
  }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  hideLink();

  const { from, to, empty } = editor.state.selection;
  const chain = editor.chain().focus();
  if (empty) {
    // No selection: insert the display text (or URL) as a linked run.
    const label = text || url;
    chain
      .insertContent({
        type: 'text',
        text: label,
        marks: [{ type: 'link', attrs: { href: url } }],
      })
      .run();
  } else if (text && text !== editor.state.doc.textBetween(from, to, ' ')) {
    // Replace the selected text with new display text, linked.
    chain
      .insertContent({
        type: 'text',
        text,
        marks: [{ type: 'link', attrs: { href: url } }],
      })
      .run();
  } else {
    // Keep selected text, just apply the link.
    chain.setLink({ href: url }).run();
  }
}

function showExport() {
  if (!editor) return;
  els.exportDialog.classList.add('active');
}

function hideExport() {
  els.exportDialog.classList.remove('active');
}

export function initDialogs(config) {
  editor = config.editor;
  els = config.els;
  if (config.getNoteTitle) getTitle = config.getNoteTitle;

  els.insertLinkBtn?.addEventListener('click', insertLink);
  els.cancelLinkBtn?.addEventListener('click', hideLink);

  els.exportBtn?.addEventListener('click', showExport);
  els.cancelExportBtn?.addEventListener('click', hideExport);
  els.formatBtns?.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const format = e.currentTarget.dataset.format;
      exportNote(editor, getTitle(), format);
      hideExport();
    });
  });

  // Close dialogs on overlay click.
  [els.linkDialog, els.exportDialog].forEach((overlay) => {
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
}

export function openLinkDialog() {
  showLink();
}
