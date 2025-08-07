# Note Editor

## Overview
This project is a simple note editor that allows users to create, format, and save notes directly in their web browser. The notes are stored in the browser's local storage, enabling users to revisit their notes even after closing the browser.

## Features
- Create and format notes with options for bold, italic, and underline.
- Save notes to local storage for persistent access.
- Load saved notes automatically when the editor is opened.

## File Structure
```
note-editor
├── index.html        # Main HTML document for the note editor
├── v1.css           # Styles for the note editor
├── scr.js           # JavaScript for handling user interactions
├── assets
│   ├── icons
│   │   ├── bold.svg  # Icon for bold formatting
│   │   ├── italic.svg # Icon for italic formatting
│   │   └── underline.svg # Icon for underline formatting
│   └── fonts
│       └── roboto.woff2 # Web font for better typography
├── .gitignore        # Files and directories to ignore in version control
└── README.md         # Documentation for the project
```

## Getting Started
1. Clone the repository to your local machine.
2. Open `index.html` in your web browser to start using the note editor.
3. Use the formatting buttons to style your notes.
4. Your notes will be automatically saved in local storage.

## Future Improvements
- Implement additional formatting options (e.g., lists, text color).
- Add a feature to export notes as text files.
- Enhance the user interface for better usability.