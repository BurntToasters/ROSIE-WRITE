// Formatting toolbar: wires buttons to TipTap commands and reflects active state
// via editor.isActive() (replaces the old execCommand / queryCommandState logic).

let buttons = {};
let locked = false;

// While editing is disabled (storage unavailable / awaiting recovery) undo and
// redo must stay off, even though refreshToolbar runs on every selection change.
export function setToolbarLocked(value) {
  locked = value;
}

export function initToolbar({ editor, els, onLink, onImage }) {
  buttons = {
    bold: els.boldBtn,
    italic: els.italicBtn,
    underline: els.underlineBtn,
    heading: els.headingBtn,
    bulletList: els.listBtn,
    orderedList: els.numListBtn,
    alignLeft: els.alignLeftBtn,
    alignCenter: els.alignCenterBtn,
    alignRight: els.alignRightBtn,
    link: els.linkBtn,
    undo: els.undoBtn,
    redo: els.redoBtn,
  };

  els.boldBtn?.addEventListener('click', () =>
    editor.chain().focus().toggleBold().run()
  );
  els.italicBtn?.addEventListener('click', () =>
    editor.chain().focus().toggleItalic().run()
  );
  els.underlineBtn?.addEventListener('click', () =>
    editor.chain().focus().toggleUnderline().run()
  );
  els.headingBtn?.addEventListener('click', () =>
    editor.chain().focus().toggleHeading({ level: 2 }).run()
  );
  els.listBtn?.addEventListener('click', () =>
    editor.chain().focus().toggleBulletList().run()
  );
  els.numListBtn?.addEventListener('click', () =>
    editor.chain().focus().toggleOrderedList().run()
  );
  els.alignLeftBtn?.addEventListener('click', () =>
    editor.chain().focus().setTextAlign('left').run()
  );
  els.alignCenterBtn?.addEventListener('click', () =>
    editor.chain().focus().setTextAlign('center').run()
  );
  els.alignRightBtn?.addEventListener('click', () =>
    editor.chain().focus().setTextAlign('right').run()
  );
  els.undoBtn?.addEventListener('click', () =>
    editor.chain().focus().undo().run()
  );
  els.redoBtn?.addEventListener('click', () =>
    editor.chain().focus().redo().run()
  );
  els.linkBtn?.addEventListener('click', () => onLink?.());
  els.imageBtn?.addEventListener('click', () => onImage?.());

  refreshToolbar(editor);
}

// Reflect current selection's marks/nodes on the toolbar buttons.
export function refreshToolbar(editor) {
  // Active state has to be conveyed non-visually too, or screen reader users
  // can't tell whether bold/italic/alignment is currently on.
  const set = (btn, active) => {
    if (!btn) return;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  };
  set(buttons.bold, editor.isActive('bold'));
  set(buttons.italic, editor.isActive('italic'));
  set(buttons.underline, editor.isActive('underline'));
  set(buttons.heading, editor.isActive('heading', { level: 2 }));
  set(buttons.bulletList, editor.isActive('bulletList'));
  set(buttons.orderedList, editor.isActive('orderedList'));
  set(buttons.alignLeft, editor.isActive({ textAlign: 'left' }));
  set(buttons.alignCenter, editor.isActive({ textAlign: 'center' }));
  set(buttons.alignRight, editor.isActive({ textAlign: 'right' }));
  set(buttons.link, editor.isActive('link'));

  // Disable undo/redo when there is nothing to undo/redo.
  if (buttons.undo) buttons.undo.disabled = locked || !editor.can().undo();
  if (buttons.redo) buttons.redo.disabled = locked || !editor.can().redo();
}
