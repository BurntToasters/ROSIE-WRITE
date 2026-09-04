# ⬇️ Web App

**[Launch ROSIE-WRITE](https://write.rosie.run)** — no install required. Runs entirely in your browser.

To run locally or build for deploy, see [README.md](README.md).

> [!IMPORTANT]
> v2 is a ground-up rewrite of the v1 web app. Your existing v1 notes will **not** appear
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

**Your v1 notes will not show up in v2.**

- v1 stored notes under the `rosieWriteNotes` localStorage key.
- v2 uses a fresh `rosieWriteNotesV2` key. No automatic migration.

Dark mode (`rosieWriteDarkMode`) and editor font size (`rosieWriteFontSize`) still read
the same keys, so those preferences should carry over.

## Changes in `v2.0.0:`

### Welcome to ROSIE-WRITE v2!

- **NEW - TipTap Editor:** Rich text editing runs on TipTap v3 (ProseMirror) instead
  of a hand-rolled `contenteditable` layer. Undo/redo, lists, headings, links, and
  alignment all go through the editor's built-in history and extensions.
- **NEW - Document Rail:** Replaced the v1 note `<select>` dropdown with a left sidebar
  that lists every note, shows last-modified dates, and filters as you type.
- **NEW - Pinned Notes:** Group notes into a "Pinned" section at the top of the sidebar
  by clicking the pin button on note items, followed by a "Recent" section.
- **NEW - Resizable Images:** Custom image node with corner drag handles and 25 / 50 /
  75 / 100 % preset buttons — same idea as v1, rebuilt for TipTap.
- **NEW - Vite Build:** The site builds with Vite from a `site/` source tree. Dev
  server has HMR; production output lands in `dist/` for Cloudflare Pages.
- **NEW - Custom Dialog Overlays:** Replaced native browser `alert()` and `confirm()`
  popups with custom styled overlay dialogs for note deletion and "Delete All" actions
  (featuring danger buttons).
- **NEW - Toast Notifications:** Custom slide-in toast notifications for warnings,
  success updates, and alert messages.
- **NEW - LED Saving Indicator:** Status bar save message with a glowing status dot
  (steady green for saved, pulsing amber for saving or unsaved changes, red for errors).
- **NEW - Storage Recovery:** If saved note data is corrupt or partially damaged, the app
  offers to download a JSON backup and start fresh instead of silently wiping your notes.
- **NEW - Multi-Tab Sync:** Multiple open tabs merge writes instead of clobbering each
  other; if a note is deleted elsewhere, on-screen text is rescued into a new note.
- **UI:** Full visual redesign — document-focused, Google-Docs-style layout with a
  sticky app bar, toolbar, and centered page canvas. Dropped the glass-morphism look
  from v1.
- **UI:** Mobile sidebar toggle so the notes rail doesn't eat the whole screen on small
  viewports; hidden rail is inert so keyboard focus can't leak into off-screen controls.
- **UI:** Added quick links to About and GitHub in the app bar.
- **UI:** Refreshed About and 404 pages to match the v2 styling; About/404 share a
  lightweight `pages.js` entry instead of pulling in the full editor bundle.
- **UI:** Custom slim styled scrollbars configured globally across light and dark modes.
- **UI:** Smooth rotation animation on the theme toggle icon and hover/click scale
  feedback for action items.
- **UI:** Toolbar and editor lock when storage is unavailable or awaiting recovery.
- **Security:** Export HTML-escapes note titles before embedding them in exported
  HTML/PDF documents, so a title like `<script>` can't execute in the output file.
- **Security:** Import strips external images and remote-fetching attributes from HTML
  so pasted or imported notes can't silently phone home.
- **Codebase:** Split the monolithic `scr.js` (~1,600 lines) into focused modules under
  `site/src/` — `editor/`, `notes/`, `ui/`, `io/`, and `styles/`.
- **Codebase:** Split the monolithic `v1.css` into themed stylesheets (`base.css`,
  `app.css`, `editor.css`, `dialogs.css`, `pages.css`).
- **Codebase:** Bundled Font Awesome (solid + brands icon sets only) via npm instead of
  loading the full CDN `all.min.css`.
- **Codebase:** Removed the `html2pdf.js` CDN dependency. PDF export opens a print
  window you save as PDF — same workflow v1 fell back to when pop-ups were blocked.
- **Codebase:** Added a Cloudflare `_redirects` rule so `/about` serves `about.html`.
- **Codebase:** Guarded preference reads/writes so blocked localStorage (private mode,
  site data disabled) no longer aborts startup.
- **Codebase:** Fixed Vite config path resolution for the `site/` root layout.
- **Misc:** Fixed an issue where switching notes could autosave the outgoing note's
  title/content into the note you switched to.
- **Misc:** Image paste from the clipboard accepts PNG, JPEG, GIF, and WebP up to 1 MiB
  (images are stored as base64 in localStorage).
- **Misc:** Damaged individual notes are quarantined instead of blocking access to every
  other note in storage.
- **PKG:** Updated packages.
