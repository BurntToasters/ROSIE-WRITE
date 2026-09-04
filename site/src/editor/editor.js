import { Editor } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';
import { buildExtensions } from './extensions.js';

// Creates the TipTap editor mounted into `element`. Callbacks let the rest of the
// app stay decoupled: onChange fires on every doc edit (for autosave + counts),
// onSelection fires on selection/transaction (for toolbar active-state refresh).
export function createEditor({ element, onChange, onSelection }) {
  // Use the `editor` instance TipTap passes into each handler. Referencing the
  // outer const would throw a TDZ error, because TipTap emits an initial
  // transaction synchronously inside the constructor — before the const binds.
  const editor = new Editor({
    element,
    extensions: buildExtensions(),
    content: '',
    autofocus: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Note content',
        'aria-multiline': 'true',
        'aria-describedby': 'saveStatus',
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor),
    onSelectionUpdate: ({ editor }) => onSelection?.(editor),
    onTransaction: ({ editor }) => onSelection?.(editor),
  });
  return editor;
}

// Drop the undo/redo stack, keeping the current document as the new baseline.
//
// ProseMirror's history is document-agnostic: it tracks steps, not which note
// they belong to. Because every note shares one editor instance, a leftover
// stack lets undo restore the *previous* note's content while a different note
// is open — and autosave would then persist it over that note. `setContent`
// with `emitUpdate: false` does not help: it only sets `preventUpdate`, so the
// swap still lands in history. Re-creating the state from the same plugin specs
// gives the history plugin a fresh, empty stack.
export function resetEditorHistory(editor) {
  const { state, view } = editor;
  view.updateState(
    EditorState.create({
      doc: state.doc,
      selection: state.selection,
      storedMarks: state.storedMarks,
      plugins: state.plugins,
    })
  );
}
