// Formatting toolbar: wires buttons to TipTap commands and reflects active state
// via editor.isActive() (replaces the old execCommand / queryCommandState logic).

let buttons = {};

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
  const set = (btn, active) => btn?.classList.toggle('active', active);
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
  if (buttons.undo) buttons.undo.disabled = !editor.can().undo();
  if (buttons.redo) buttons.redo.disabled = !editor.can().redo();
}
