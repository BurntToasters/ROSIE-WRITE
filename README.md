# ROSIE-WRITE

Simple, privacy-first, browser-based note creator/editor. Your notes are stored
locally in your browser — nothing leaves your computer.

### **[↗️ LAUNCH WEB APP!](https://write.rosie.run)**

## Features

- Document-focused, Google-Docs-style interface with a notes sidebar
- Rich text editing (TipTap): bold/italic/underline, headings, lists, alignment, links
- Inline images with drag-resize and preset sizes
- Export to HTML, Markdown, plain text, PDF, and RTF; import HTML/Markdown/text
- Autosave, word/character count, undo/redo, dark mode

## Tech

- [TipTap](https://tiptap.dev) v3 (ProseMirror) rich-text editor
- [Vite](https://vite.dev) build, vanilla JS ES modules — no UI framework
- localStorage persistence

## Project layout

Tooling lives at the repo root; the site source lives in [`site/`](site/).

```
package.json  vite.config.js   # tooling (build runs from root)
dist/                          # build output (gitignored)
site/
  index.html  about.html  404.html   # pages (Vite entries)
  src/                               # ES modules (editor, notes, ui, io, styles)
  public/                            # static assets (copied to dist/)
```

Vite is configured with `root: site/`, building to `/dist` at the repo root.

## Development

```bash
npm install
npm run dev      # dev server with HMR
npm run build    # production build -> ./dist/
npm run preview  # preview the production build
```

## Deploy

Static build. On Cloudflare Pages:

- **Root directory:** *(repo root — leave default. Do not set this to `site/`.)*
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node:** `^20.19.0` or `>=22.12.0` (Vite 8)

Vite copies `site/public/` (logo, favicon) into `dist/` verbatim. Cloudflare Pages
Pretty URLs serve `about.html` at `/about` — do not add a `_redirects` rewrite for
that path; it 308-loops with Pretty URLs.

Released under the Mozilla Public License 2.0.
