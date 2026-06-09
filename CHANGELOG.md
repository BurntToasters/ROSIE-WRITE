> [!NOTE]
> 🅱️ This is a Beta build.
> Go to: https://b-write.rosie.run to view the current beta.

# ⬇️ Web App

**[Launch ROSIE-WRITE](https://write.rosie.run)** — no install required. Runs entirely in your browser.

To run locally or build for deploy, see [README.md](README.md).

> [!IMPORTANT]
> This is a beta rewrite of the v1 web app. Your existing v1 notes will **not** appear
> automatically — see **Breaking Changes** below. Dark mode and font-size preferences
> carry over; note data does not.

### ℹ️ Enjoying ROSIE-WRITE? Consider [❤️ Supporting Me! ❤️](https://rosie.run/support)

# Welcome to ROSIE-WRITE v2!!!

v2 is a ground-up rewrite of the note editor I shipped as v1. Same privacy promise —
everything stays in your browser — but a new editor engine, a new layout, and a codebase
I can actually maintain :)

## Why a full rewrite?

v1 was one big `scr.js` file and one big `v1.css` file. It worked, but every feature
I added made the next one harder. v2 splits the app into small ES modules, swaps the
hand-rolled `contenteditable` layer for [TipTap](https://tiptap.dev) v3, and adds a
proper [Vite](https://vite.dev) build so I can develop and ship without fighting the
browser cache on every change.

## Breaking Changes

**Your v1 notes will not show up in this beta.**

- v1 stored notes under the `rosieWriteNotes` localStorage key.
- v2 uses a fresh `rosieWriteNotesV2` key — no automatic migration.
- **Before you try the beta:** open the [v1 stable app](https://write.rosie.run) (while
  v1 is still deployed) and export any notes you care about as HTML or Markdown. Import
  them back in v2 with the import button.

Dark mode (`rosieWriteDarkMode`) and editor font size (`rosieWriteFontSize`) still read
the same keys, so those preferences should carry over.

## Changes in `v2.0.0-beta.1:`

- **Ver:** Bumped version to `v2.0.0-beta.1`.
- **NEW - TipTap Editor:** Rich text editing now runs on TipTap v3 (ProseMirror) instead
  of a hand-rolled `contenteditable` layer. Undo/redo, lists, headings, links, and
  alignment all go through the editor's built-in history and extensions.
- **NEW - Document Rail:** Replaced the v1 note `<select>` dropdown with a left sidebar
  that lists every note, shows last-modified dates, and filters as you type.
- **NEW - Resizable Images:** Custom image node with corner drag handles and 25 / 50 /
  75 / 100 % preset buttons — same idea as v1, rebuilt for TipTap.
- **NEW - Vite Build:** The site now builds with Vite from a `site/` source tree. Dev
  server has HMR; production output lands in `dist/` for Cloudflare Pages.
- **UI:** Full visual redesign — document-focused, Google-Docs-style layout with a
  sticky app bar, toolbar, and centered page canvas. Dropped the glass-morphism look
  from v1.
- **UI:** Added a mobile sidebar toggle so the notes rail doesn't eat the whole screen
  on small viewports.
- **UI:** Added quick links to About and GitHub in the app bar.
- **UI:** Refreshed About and 404 pages to match the v2 styling; About/404 share a
  lightweight `pages.js` entry instead of pulling in the full editor bundle.
- **Codebase:** Split the monolithic `scr.js` (~1,600 lines) into focused modules under
  `site/src/` — `editor/`, `notes/`, `ui/`, `io/`, and `styles/`.
- **Codebase:** Split the monolithic `v1.css` into themed stylesheets (`base.css`,
  `app.css`, `editor.css`, `dialogs.css`, `pages.css`).
- **Codebase:** Bundled Font Awesome (solid + brands icon sets only) via npm instead of
  loading the full CDN `all.min.css`.
- **Codebase:** Removed the `html2pdf.js` CDN dependency. PDF export now opens a print
  window you save as PDF — same workflow v1 fell back to when pop-ups were blocked.
- **Codebase:** Added a Cloudflare `_redirects` rule so `/about` serves `about.html`.
- **Security:** Export now HTML-escapes note titles before embedding them in exported
  HTML/PDF documents, so a title like `<script>` can't execute in the output file.
- **Misc:** Fixed an issue where switching notes could autosave the outgoing note's
  title/content into the note you switched to.
- **Misc:** Image paste from the clipboard and the 5 MB image size cap behave the same
  as v1, but go through the new editor pipeline.
- **PKG:** Updated packages.

## ℹ️ Release Info

- **Privacy:** Notes live in your browser's localStorage only. No account, no sync, no
  server-side storage of your content.
- **Open Source:** Source on GitHub — [BurntToasters/ROSIE-WRITE](https://github.com/BurntToasters/ROSIE-WRITE).
- **License:** Mozilla Public License 2.0.
- **Analytics:** Cloudflare Web Analytics on the hosted site (no cookies, no
  fingerprinting — see About page for the Cloudflare quote).
