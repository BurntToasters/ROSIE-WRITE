import { Editor } from '@tiptap/core';
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
    onUpdate: ({ editor }) => onChange?.(editor),
    onSelectionUpdate: ({ editor }) => onSelection?.(editor),
    onTransaction: ({ editor }) => onSelection?.(editor),
  });
  return editor;
}
