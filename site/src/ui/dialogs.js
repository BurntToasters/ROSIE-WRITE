// Accessible link, export-format, and confirmation dialogs.
import { exportNote } from '../io/export.js';

let editor = null;
let els = {};
let getTitle = () => 'Untitled';
let activeDialog = null;
let previouslyFocused = null;
let confirmOnConfirm = null;

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableElements(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

function openDialog(dialog, initialFocus) {
  if (!dialog) return;
  if (!activeDialog && document.activeElement instanceof HTMLElement) {
    previouslyFocused = document.activeElement;
  }
  if (activeDialog && activeDialog !== dialog) closeDialog(activeDialog, false);

  activeDialog = dialog;
  dialog.classList.add('active');
  dialog.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    const target = initialFocus || focusableElements(dialog)[0] || dialog;
    target.focus?.();
  });
}

function closeDialog(dialog, restoreFocus = true) {
  if (!dialog) return;
  dialog.classList.remove('active');
  dialog.setAttribute('aria-hidden', 'true');

  if (activeDialog === dialog) {
    activeDialog = null;
    if (restoreFocus && previouslyFocused?.isConnected) previouslyFocused.focus();
    previouslyFocused = null;
  }
}

function showLink() {
  // Prefill display text with the current selection, URL with an existing link.
  const { from, to } = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(from, to, ' ');
  els.linkText.value = selectedText || '';
  els.linkUrl.value = editor.getAttributes('link').href || '';
  openDialog(els.linkDialog, els.linkUrl);
}

function hideLink() {
  closeDialog(els.linkDialog);
  els.linkText.value = '';
  els.linkUrl.value = '';
}

function insertLink() {
  const text = els.linkText.value.trim();
  let url = els.linkUrl.value.trim();
  if (!url) {
    showToast('Please enter a URL.', 'warning');
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
  openDialog(els.exportDialog, els.formatBtns?.[0]);
}

function hideExport() {
  closeDialog(els.exportDialog);
}

function showConfirm(title, message, onConfirm, options = {}) {
  if (!els.confirmDialog) return;
  els.confirmTitle.textContent = title;
  els.confirmMessage.textContent = message;
  els.okConfirmBtn.textContent = options.confirmLabel || 'Confirm';
  els.cancelConfirmBtn.textContent = options.cancelLabel || 'Cancel';
  confirmOnConfirm = onConfirm;
  openDialog(els.confirmDialog, els.cancelConfirmBtn);
}

function hideConfirm() {
  if (!els.confirmDialog) return;
  closeDialog(els.confirmDialog);
  confirmOnConfirm = null;
  els.okConfirmBtn.textContent = 'Confirm';
  els.cancelConfirmBtn.textContent = 'Cancel';
}

function closeActiveDialog() {
  if (activeDialog === els.linkDialog) hideLink();
  else if (activeDialog === els.exportDialog) hideExport();
  else if (activeDialog === els.confirmDialog) hideConfirm();
}

function handleDialogKeydown(event) {
  if (!activeDialog) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeActiveDialog();
    return;
  }
  if (event.key !== 'Tab') return;

  const focusable = focusableElements(activeDialog);
  if (focusable.length === 0) {
    event.preventDefault();
    activeDialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function initDialogs(config) {
  editor = config.editor;
  els = config.els;
  if (config.getNoteTitle) getTitle = config.getNoteTitle;

  [els.linkDialog, els.exportDialog, els.confirmDialog].forEach((dialog) => {
    dialog?.setAttribute('aria-hidden', 'true');
  });

  els.insertLinkBtn?.addEventListener('click', insertLink);
  els.cancelLinkBtn?.addEventListener('click', hideLink);
  els.linkUrl?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      insertLink();
    }
  });

  els.exportBtn?.addEventListener('click', showExport);
  els.cancelExportBtn?.addEventListener('click', hideExport);
  els.formatBtns?.forEach((button) => {
    button.addEventListener('click', (event) => {
      const format = event.currentTarget.dataset.format;
      exportNote(editor, getTitle(), format);
      hideExport();
    });
  });

  els.cancelConfirmBtn?.addEventListener('click', hideConfirm);
  els.okConfirmBtn?.addEventListener('click', () => {
    const action = confirmOnConfirm;
    hideConfirm();
    action?.();
  });

  // Close dialogs on overlay click.
  [els.linkDialog, els.exportDialog, els.confirmDialog].forEach((overlay) => {
    overlay?.addEventListener('click', (event) => {
      if (event.target === overlay) closeActiveDialog();
    });
  });
  document.addEventListener('keydown', handleDialogKeydown);
}

export function openLinkDialog() {
  showLink();
}

export { showConfirm };

export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  let iconClass = 'fa-info-circle';
  if (type === 'error') iconClass = 'fa-exclamation-circle';
  else if (type === 'success') iconClass = 'fa-check-circle';
  else if (type === 'warning') iconClass = 'fa-exclamation-triangle';

  const icon = document.createElement('i');
  icon.className = `fas ${iconClass}`;
  icon.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = String(message);
  toast.append(icon, text);
  container.appendChild(toast);

  // Trigger reflow/animation.
  setTimeout(() => toast.classList.add('visible'), 10);

  // Errors linger longer than confirmations — they may need acting on.
  const duration = type === 'error' ? 6000 : 3000;
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.classList.add('fade-out');
    const remove = () => toast.remove();
    toast.addEventListener('transitionend', remove, { once: true });
    setTimeout(remove, 300);
  }, duration);
}
