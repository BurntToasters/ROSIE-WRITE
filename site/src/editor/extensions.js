import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import { ResizableImage } from './image-resize-node.js';

// StarterKit v3 already bundles: Bold, Italic, Underline, Strike, Code, Heading,
// BulletList, OrderedList, ListItem, Blockquote, HorizontalRule, HardBreak, Link,
// Dropcursor, Gapcursor, History (undo/redo), ListKeymap, TrailingNode.
export function buildExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    FontSize,
    Placeholder.configure({ placeholder: 'Start writing your note…' }),
    ResizableImage.configure({ allowBase64: true }),
  ];
}
