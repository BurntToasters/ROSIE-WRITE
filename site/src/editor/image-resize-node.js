import Image from '@tiptap/extension-image';

// Custom resizable image node. Extends the stock Image extension with a `width`
// attribute that is serialized to HTML (so editor.getHTML() and the RTF/PDF
// exporters, which read img width, keep dimensions). The node view adds corner
// drag handles + 25/50/75/100% preset buttons, reproducing the v1 UX.

const MIN_WIDTH = 50;

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        // Read width from the inline style or the width attribute.
        parseHTML: (element) => {
          const styleWidth = element.style?.width;
          if (styleWidth) return parseInt(styleWidth, 10) || null;
          const attrWidth = element.getAttribute('width');
          return attrWidth ? parseInt(attrWidth, 10) || null : null;
        },
        // Render width both as attribute and inline style for max compatibility
        // (exporters read img.width / style; browsers honor the style).
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px; height: auto;`,
          };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const container = document.createElement('span');
      container.className = 'img-resize-container';
      container.contentEditable = 'false';

      const img = document.createElement('img');
      img.src = node.attrs.src;
      if (node.attrs.alt) img.alt = node.attrs.alt;
      if (node.attrs.title) img.title = node.attrs.title;
      if (node.attrs.width) {
        img.style.width = `${node.attrs.width}px`;
        img.style.height = 'auto';
      } else {
        img.style.width = '300px';
        img.style.height = 'auto';
      }
      container.appendChild(img);

      const commitWidth = (px) => {
        if (typeof getPos !== 'function') return;
        const pos = getPos();
        if (pos == null) return;
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              width: Math.round(px),
            });
            return true;
          })
          .run();
      };

      // Preset size toolbar (25 / 50 / 75 / 100 % of editor content width).
      const toolbar = document.createElement('div');
      toolbar.className = 'img-size-toolbar';
      [25, 50, 75, 100].forEach((size) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'img-size-btn';
        btn.textContent = `${size}%`;
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const editorWidth = editor.view.dom.clientWidth - 50;
          const newWidth = Math.max(MIN_WIDTH, (editorWidth * size) / 100);
          img.style.width = `${newWidth}px`;
          img.style.height = 'auto';
          commitWidth(newWidth);
        });
        toolbar.appendChild(btn);
      });
      container.appendChild(toolbar);

      // Corner drag handles.
      const handles = ['se', 'sw', 'ne', 'nw'];
      handles.forEach((dir) => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-handle-${dir}`;
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          container.classList.add('resizing');

          const startX = e.clientX;
          const startY = e.clientY;
          const startWidth = img.offsetWidth;
          const startHeight = img.offsetHeight;
          const aspect = startWidth / startHeight;
          const maxWidth = editor.view.dom.clientWidth - 50;

          const onMove = (ev) => {
            let dx = ev.clientX - startX;
            let dy = ev.clientY - startY;
            if (dir === 'sw' || dir === 'nw') dx = -dx;
            if (dir === 'ne' || dir === 'nw') dy = -dy;
            const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy * aspect;
            let w = Math.max(MIN_WIDTH, startWidth + delta);
            w = Math.min(w, maxWidth);
            img.style.width = `${w}px`;
            img.style.height = 'auto';
          };

          const onUp = () => {
            container.classList.remove('resizing');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            commitWidth(img.offsetWidth);
          };

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
        container.appendChild(handle);
      });

      return {
        dom: container,
        // Re-sync the img when the node's width attr changes externally.
        update: (updatedNode) => {
          if (updatedNode.type.name !== node.type.name) return false;
          if (updatedNode.attrs.src !== node.attrs.src) return false;
          if (updatedNode.attrs.width) {
            img.style.width = `${updatedNode.attrs.width}px`;
            img.style.height = 'auto';
          }
          return true;
        },
      };
    };
  },
});
