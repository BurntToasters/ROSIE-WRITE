const APP_VERSION = "1.2.0";

const noteApp = {
    currentNoteId: null,
    notes: {},
    isDarkMode: false,
    isSaved: true,
    saveTimeout: null,
    undoStack: [],
    redoStack: [],
    isUndoOperation: false,
    stateCapturePending: false,
    lastCaptureTime: Date.now(),
    characterCount: 0,
    STATE_CAPTURE_INTERVAL: 2000,
    CHARACTER_CAPTURE_THRESHOLD: 5,
    currentFontSize: 12,
    savedSelection: null
};

const elements = {};

const formatButtons = {};

function initApp() {
    elements.noteArea = document.getElementById('noteArea'),
    elements.noteTitle = document.getElementById('noteTitle'),
    elements.noteSelector = document.getElementById('noteSelector'),
    elements.saveStatus = document.getElementById('saveStatus'),
    elements.newNoteBtn = document.getElementById('newNote'),
    elements.deleteNoteBtn = document.getElementById('deleteNote'),
    elements.exportBtn = document.getElementById('exportBtn'),
    elements.importFile = document.getElementById('importFile'),
    elements.toggleThemeBtn = document.getElementById('toggleTheme'),
    elements.undoBtn = document.getElementById('undoBtn'),
    elements.redoBtn = document.getElementById('redoBtn'),
    elements.versionIndicator = document.querySelector('.version-indicator'),
    elements.exportFormatDialog = document.getElementById('exportFormatDialog'),
    elements.cancelExport = document.getElementById('cancelExport'),
    elements.formatButtons = document.querySelectorAll('.format-btn'),
    elements.deleteAllNotesBtn = document.getElementById('deleteAllNotes'),
    elements.wordCount = document.getElementById('wordCount'),
    elements.noteSearch = document.getElementById('noteSearch'),
    elements.alignLeftBtn = document.getElementById('alignLeftBtn'),
    elements.alignCenterBtn = document.getElementById('alignCenterBtn'),
    elements.alignRightBtn = document.getElementById('alignRightBtn'),
    elements.fontDecreaseBtn = document.getElementById('fontDecreaseBtn'),
    elements.fontIncreaseBtn = document.getElementById('fontIncreaseBtn'),
    elements.fontSizeIndicator = document.getElementById('fontSizeIndicator'),
    elements.linkBtn = document.getElementById('linkBtn'),
    elements.imageBtn = document.getElementById('imageBtn'),
    elements.imageInput = document.getElementById('imageInput'),
    elements.linkDialog = document.getElementById('linkDialog'),
    elements.linkText = document.getElementById('linkText'),
    elements.linkUrl = document.getElementById('linkUrl'),
    elements.insertLinkBtn = document.getElementById('insertLink'),
    elements.cancelLinkBtn = document.getElementById('cancelLink');

    formatButtons.bold = document.getElementById('boldBtn'),
    formatButtons.italic = document.getElementById('italicBtn'),
    formatButtons.underline = document.getElementById('underlineBtn'),
    formatButtons.heading = document.getElementById('headingBtn'),
    formatButtons.list = document.getElementById('listBtn'),
    formatButtons.numList = document.getElementById('numListBtn'),
    formatButtons.alignLeft = document.getElementById('alignLeftBtn'),
    formatButtons.alignCenter = document.getElementById('alignCenterBtn'),
    formatButtons.alignRight = document.getElementById('alignRightBtn')

    loadNotes();
    setupEventListeners();
    checkDarkModePreference();
    loadFontSizePreference();
    if (Object.keys(noteApp.notes).length > 0) {
        loadMostRecentNote();
    } else {
        createNewNote();
    }

    elements.noteArea.addEventListener('input', (e) => {
        noteApp.isSaved = false;
        updateSaveStatus('Unsaved changes');
        updateWordCount();
        clearTimeout(noteApp.saveTimeout);
        noteApp.saveTimeout = setTimeout(() => {
            saveCurrentNote();
        }, 1000);
        noteApp.characterCount++;
        
        const now = Date.now();
        const timeSinceLastCapture = now - noteApp.lastCaptureTime;
        
        if (!noteApp.stateCapturePending && 
            (noteApp.characterCount >= noteApp.CHARACTER_CAPTURE_THRESHOLD || 
             timeSinceLastCapture > noteApp.STATE_CAPTURE_INTERVAL)) {
            
            noteApp.stateCapturePending = true;
            setTimeout(() => {
                captureState();
                noteApp.stateCapturePending = false;
                noteApp.lastCaptureTime = Date.now();
                noteApp.characterCount = 0; 
            }, 50);
        }
    });

    elements.noteArea.addEventListener('keydown', (e) => {
        if (e.key === ' ' || 
            e.key === '.' || 
            e.key === '!' || 
            e.key === '?' ||
            e.key === ',' ||
            e.key === ';' ||
            e.key === ':' ||
            e.key === 'Enter' || 
            e.key === 'Tab') {
            noteApp.characterCount = 0;
            setTimeout(() => captureState(), 0);
        }
    });
    
    elements.noteArea.addEventListener('blur', () => {
        captureState();
        noteApp.characterCount = 0;
    });

    elements.noteArea.addEventListener('focus', () => {
        if (noteApp.undoStack.length === 0) {
            captureState();
        }
    });

    elements.noteArea.addEventListener('mouseup', updateFormatButtonStates);
    elements.noteArea.addEventListener('keyup', updateFormatButtonStates);
    elements.noteArea.addEventListener('click', updateFormatButtonStates);

    elements.noteTitle.addEventListener('input', () => {
        noteApp.isSaved = false;
        updateSaveStatus('Unsaved changes');

        clearTimeout(noteApp.saveTimeout);
        noteApp.saveTimeout = setTimeout(() => {
            saveCurrentNote();
            updateNotesList();
        }, 1000);
    });

    if (elements.versionIndicator) {
        elements.versionIndicator.textContent = `v${APP_VERSION}`;
    }

    console.log("Undo button exists:", !!elements.undoBtn);
    console.log("Redo button exists:", !!elements.redoBtn);
    console.log("Undo stack:", noteApp.undoStack);
    console.log("Redo stack:", noteApp.redoStack);
}

function setupEventListeners() {
    for (const [format, button] of Object.entries(formatButtons)) {
        button.addEventListener('click', () => formatText(format));
    }

    elements.newNoteBtn.addEventListener('click', createNewNote);
    elements.noteSelector.addEventListener('change', switchNote);
    elements.deleteNoteBtn.addEventListener('click', deleteCurrentNote);

    elements.exportBtn.addEventListener('click', showExportDialog);
    elements.importFile.addEventListener('change', importNote);
    elements.cancelExport.addEventListener('click', hideExportDialog);
    elements.formatButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const format = e.currentTarget.dataset.format;
            exportNote(format);
            hideExportDialog();
        });
    });

    elements.toggleThemeBtn.addEventListener('click', toggleTheme);
    elements.undoBtn.addEventListener('click', undo);
    elements.redoBtn.addEventListener('click', redo);
    elements.deleteAllNotesBtn.addEventListener('click', confirmDeleteAllNotes);
    elements.noteSearch.addEventListener('input', filterNotes);
    elements.fontDecreaseBtn.addEventListener('click', () => changeFontSize(-1));
    elements.fontIncreaseBtn.addEventListener('click', () => changeFontSize(1));
    elements.linkBtn.addEventListener('click', showLinkDialog);
    elements.insertLinkBtn.addEventListener('click', insertLink);
    elements.cancelLinkBtn.addEventListener('click', hideLinkDialog);
    elements.imageBtn.addEventListener('click', () => elements.imageInput.click());
    elements.imageInput.addEventListener('change', handleImageUpload);
    elements.noteArea.addEventListener('paste', handlePaste);

    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function loadNotes() {
    const savedNotes = localStorage.getItem('rosieWriteNotes');
    if (savedNotes) {
        noteApp.notes = JSON.parse(savedNotes);
        updateNotesList();
    }

    const darkMode = localStorage.getItem('rosieWriteDarkMode');
    if (darkMode === 'true') {
        noteApp.isDarkMode = true;
        document.body.classList.add('dark-mode');
        elements.toggleThemeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function checkDarkModePreference() {
    const savedPreference = localStorage.getItem('rosieWriteDarkMode');
    if (savedPreference !== null) {
        return;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        noteApp.isDarkMode = true;
        document.body.classList.add('dark-mode');
        elements.toggleThemeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('rosieWriteDarkMode', true);
    }
}

function toggleTheme() {
    noteApp.isDarkMode = !noteApp.isDarkMode;
    
    if (noteApp.isDarkMode) {
        document.body.classList.add('dark-mode');
        elements.toggleThemeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-mode');
        elements.toggleThemeBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    localStorage.setItem('rosieWriteDarkMode', noteApp.isDarkMode);
}

function captureState() {
    if (!elements.noteArea.innerHTML.trim()) return;

    const lastState = noteApp.undoStack[noteApp.undoStack.length - 1];
    if (lastState && 
        lastState.content === elements.noteArea.innerHTML && 
        lastState.title === elements.noteTitle.value) {
        return;
    }
    
    noteApp.undoStack.push({
        content: elements.noteArea.innerHTML,
        title: elements.noteTitle.value
    });
    
    console.log("State captured, undo stack size:", noteApp.undoStack.length);

    if (noteApp.undoStack.length > 30) {
        noteApp.undoStack.shift();
    }

    if (!noteApp.isUndoOperation) {
        noteApp.redoStack = [];
    }
}

function undo() {
    if (noteApp.undoStack.length === 0) {
        console.log("Nothing to undo");
        updateSaveStatus('Nothing to undo');
        setTimeout(() => {
            updateSaveStatus('All changes saved');
        }, 1500);
        return;
    }
    
    console.log("Performing undo, stack size before:", noteApp.undoStack.length);
    noteApp.isUndoOperation = true;
    
    noteApp.redoStack.push({
        content: elements.noteArea.innerHTML,
        title: elements.noteTitle.value
    });
    
    const previousState = noteApp.undoStack.pop();
    elements.noteArea.innerHTML = previousState.content;
    elements.noteTitle.value = previousState.title;
    
    noteApp.isSaved = false;
    updateSaveStatus('Undid last change');
    setTimeout(() => {
        updateSaveStatus('Unsaved changes');
        noteApp.isUndoOperation = false;
    }, 100);
}

function redo() {
    if (noteApp.redoStack.length === 0) {
        console.log("Nothing to redo");
        updateSaveStatus('Nothing to redo');
        setTimeout(() => {
            updateSaveStatus('All changes saved');
        }, 1500);
        return;
    }
    
    console.log("Performing redo, stack size before:", noteApp.redoStack.length);
    
    noteApp.undoStack.push({
        content: elements.noteArea.innerHTML,
        title: elements.noteTitle.value
    });
    
    const redoState = noteApp.redoStack.pop();
    elements.noteArea.innerHTML = redoState.content;
    elements.noteTitle.value = redoState.title;
    
    noteApp.isSaved = false;
    updateSaveStatus('Redid last change');
    setTimeout(() => {
        updateSaveStatus('Unsaved changes');
    }, 1500);
}

function formatText(format) {
    elements.noteArea.focus();
    
    switch (format) {
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'italic':
            document.execCommand('italic', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'heading':
            document.execCommand('formatBlock', false, '<h2>');
            break;
        case 'list':
            document.execCommand('insertUnorderedList', false, null);
            break;
        case 'numList':
            document.execCommand('insertOrderedList', false, null);
            break;
        case 'alignLeft':
            document.execCommand('justifyLeft', false, null);
            break;
        case 'alignCenter':
            document.execCommand('justifyCenter', false, null);
            break;
        case 'alignRight':
            document.execCommand('justifyRight', false, null);
            break;
    }
    
    noteApp.isSaved = false;
    updateSaveStatus('Unsaved changes');
    captureState();
    updateFormatButtonStates();
}

function updateFormatButtonStates() {
    const isBold = document.queryCommandState('bold');
    formatButtons.bold.classList.toggle('active', isBold);

    const isItalic = document.queryCommandState('italic');
    formatButtons.italic.classList.toggle('active', isItalic);

    const isUnderline = document.queryCommandState('underline');
    formatButtons.underline.classList.toggle('active', isUnderline);

    const isUnorderedList = document.queryCommandState('insertUnorderedList');
    formatButtons.list.classList.toggle('active', isUnorderedList);
    
    const isOrderedList = document.queryCommandState('insertOrderedList');
    formatButtons.numList.classList.toggle('active', isOrderedList);

    const isJustifyLeft = document.queryCommandState('justifyLeft');
    formatButtons.alignLeft.classList.toggle('active', isJustifyLeft);
    
    const isJustifyCenter = document.queryCommandState('justifyCenter');
    formatButtons.alignCenter.classList.toggle('active', isJustifyCenter);
    
    const isJustifyRight = document.queryCommandState('justifyRight');
    formatButtons.alignRight.classList.toggle('active', isJustifyRight);

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        let node = selection.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode;
        }
        
        let isHeading = false;
        while (node && node !== elements.noteArea) {
            if (node.tagName && /^H[1-6]$/.test(node.tagName)) {
                isHeading = true;
                break;
            }
            node = node.parentNode;
        }
        formatButtons.heading.classList.toggle('active', isHeading);
    }
}

function handleKeyboardShortcuts(e) {
    if (document.activeElement === elements.noteTitle) return;
    
    if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                formatText('bold');
                break;
            case 'i':
                e.preventDefault();
                formatText('italic');
                break;
            case 'u':
                e.preventDefault();
                formatText('underline');
                break;
            case 'z':
                e.preventDefault();
                undo();
                updateFormatButtonStates();
                break;
            case 'y':
                e.preventDefault();
                redo();
                updateFormatButtonStates();
                break;
            case 's':
                e.preventDefault();
                saveCurrentNote();
                break;
            case 'k':
                e.preventDefault();
                showLinkDialog();
                break;
        }
    }
}

function saveCurrentNote() {
    if (!noteApp.currentNoteId) return;
    
    const title = elements.noteTitle.value || 'Untitled Note';
    const content = elements.noteArea.innerHTML;
    
    noteApp.notes[noteApp.currentNoteId] = {
        id: noteApp.currentNoteId,
        title: title,
        content: content,
        lastModified: new Date().toISOString()
    };
    
    localStorage.setItem('rosieWriteNotes', JSON.stringify(noteApp.notes));
    noteApp.isSaved = true;
    updateSaveStatus('All changes saved');
}

function createNewNote() {
    if (noteApp.currentNoteId) {
        saveCurrentNote();
    }

    const newId = 'note_' + Date.now();
    const newNote = {
        id: newId,
        title: 'Untitled Note',
        content: '',
        lastModified: new Date().toISOString()
    };
    
    noteApp.notes[newId] = newNote;
    noteApp.currentNoteId = newId;

    elements.noteTitle.value = newNote.title;
    elements.noteArea.innerHTML = '';
    elements.noteArea.focus();

    updateNotesList();
    localStorage.setItem('rosieWriteNotes', JSON.stringify(noteApp.notes));

    noteApp.undoStack = [];
    noteApp.redoStack = [];
    updateWordCount();
}

function loadMostRecentNote() {
    const sortedNotes = Object.values(noteApp.notes).sort((a, b) => {
        return new Date(b.lastModified) - new Date(a.lastModified);
    });
    
    if (sortedNotes.length > 0) {
        const mostRecent = sortedNotes[0];

        noteApp.currentNoteId = mostRecent.id;

        elements.noteTitle.value = mostRecent.title;
        elements.noteArea.innerHTML = mostRecent.content;
        updateNotesList();
        elements.noteSelector.value = mostRecent.id;
        
        noteApp.undoStack = [];
        noteApp.redoStack = [];
        updateWordCount();
        reinitializeImageHandlers();
    }
}

function switchNote() {
    const noteId = elements.noteSelector.value;
    if (!noteId) return;
    
    if (noteApp.currentNoteId) {
        saveCurrentNote();
    }

    const note = noteApp.notes[noteId];
    if (note) {
        noteApp.currentNoteId = noteId;
        elements.noteTitle.value = note.title;
        elements.noteArea.innerHTML = note.content;

        noteApp.undoStack = [];
        noteApp.redoStack = [];
        updateWordCount();
        reinitializeImageHandlers();
    }
}

function updateNotesList() {
    const currentSelection = elements.noteSelector.value;

    elements.noteSelector.innerHTML = '<option value="">Select a note...</option>';

    Object.values(noteApp.notes).sort((a, b) => {
        return new Date(b.lastModified) - new Date(a.lastModified);
    }).forEach(note => {
        const option = document.createElement('option');
        option.value = note.id;
        option.textContent = note.title;
        elements.noteSelector.appendChild(option);
    });

    if (noteApp.currentNoteId) {
        elements.noteSelector.value = noteApp.currentNoteId;
    }
}

function deleteCurrentNote() {
    if (!noteApp.currentNoteId) return;
    
    if (Object.keys(noteApp.notes).length <= 1) {
        alert("You can't delete your only note. Create a new note first.");
        return;
    }
    
    const confirmDelete = confirm("Are you sure you want to delete this note?");
    if (confirmDelete) {
        delete noteApp.notes[noteApp.currentNoteId];
        localStorage.setItem('rosieWriteNotes', JSON.stringify(noteApp.notes));

        const nextNoteId = Object.keys(noteApp.notes)[0];
        noteApp.currentNoteId = nextNoteId;

        updateNotesList();
        elements.noteSelector.value = nextNoteId;
        switchNote();
    }
}

function confirmDeleteAllNotes() {
    const noteCount = Object.keys(noteApp.notes).length;
    
    if (noteCount === 0) {
        alert("You don't have any notes to delete.");
        return;
    }
    
    const confirmMessage = `Are you sure you want to delete ALL ${noteCount} notes? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
        deleteAllNotes();
    }
}

function deleteAllNotes() {
    noteApp.notes = {};

    localStorage.setItem('rosieWriteNotes', JSON.stringify(noteApp.notes));

    elements.noteSelector.innerHTML = '<option value="">Select a note...</option>';
    
    noteApp.currentNoteId = null;

    createNewNote();
    
    updateSaveStatus('All notes deleted');
    setTimeout(() => {
        updateSaveStatus('All changes saved');
    }, 3000);
}

function showExportDialog() {
    if (!noteApp.currentNoteId) return;
    elements.exportFormatDialog.classList.add('active');
}

function hideExportDialog() {
    elements.exportFormatDialog.classList.remove('active');
}

function exportNote(format = 'html') {
    if (!noteApp.currentNoteId) return;
    saveCurrentNote();
    
    const note = noteApp.notes[noteApp.currentNoteId];
    if (!note) return;
    
    const title = note.title || 'Untitled';
    const content = elements.noteArea.innerHTML;
    
    console.log('Exporting note:', title, 'Content length:', content.length);
    
    if (format === 'pdf') {
        exportToPdf(title, content);
        return;
    }

    if (format === 'docx') {
        exportToRtf(title, content);
        return;
    }
    
    let exportContent;
    let mimeType;
    let fileExtension;
    
    switch(format) {
        case 'txt':
            exportContent = convertToPlainText(content);
            mimeType = 'text/plain';
            fileExtension = 'txt';
            break;
        case 'md':
            exportContent = convertToMarkdown(content);
            mimeType = 'text/markdown';
            fileExtension = 'md';
            break;
        case 'html':
        default:
            exportContent = createFullHtmlDocument(title, content);
            mimeType = 'text/html';
            fileExtension = 'html';
            break;
    }

    const safeFilename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFilename}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

function createFullHtmlDocument(title, content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
        }
        img { max-width: 100%; height: auto; }
        h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
        p { margin: 1em 0; }
        ul, ol { padding-left: 2em; }
        a { color: #4f86f7; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${content}
</body>
</html>`;
}

function exportToPdf(title, content) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const resizeContainers = tempDiv.querySelectorAll('.img-resize-container');
    resizeContainers.forEach(container => {
        const img = container.querySelector('img');
        if (img) {
            const newImg = img.cloneNode(true);
            container.parentNode.replaceChild(newImg, container);
        }
    });
    const cleanContent = tempDiv.innerHTML;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
        alert('Please allow pop-ups to export PDF. You can also use your browser\'s Print function (Ctrl+P) and select "Save as PDF".');
        return;
    }
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                @media print {
                    body { margin: 0; padding: 20mm; }
                }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: Arial, Helvetica, sans-serif; 
                    padding: 40px; 
                    background: white; 
                    color: #000;
                    max-width: 800px;
                    margin: 0 auto;
                    line-height: 1.6;
                }
                h1 { margin-bottom: 20px; font-size: 28px; color: #000; }
                h2 { margin: 20px 0 10px; font-size: 22px; }
                h3 { margin: 15px 0 8px; font-size: 18px; }
                p { margin: 10px 0; }
                img { max-width: 100%; height: auto; display: block; margin: 15px 0; }
                ul, ol { margin: 10px 0; padding-left: 30px; }
                li { margin: 5px 0; }
                .content { font-size: 14px; }
                .print-instructions {
                    background: #f0f0f0;
                    padding: 15px;
                    margin-bottom: 20px;
                    border-radius: 5px;
                    font-size: 14px;
                }
                .print-instructions button {
                    background: #4f86f7;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-right: 10px;
                }
                .print-instructions button:hover {
                    background: #3a6fd8;
                }
                @media print {
                    .print-instructions { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="print-instructions">
                <p><strong>To save as PDF:</strong> Click the button below, then select "Save as PDF" as your printer.</p>
                <button onclick="window.print()">Print / Save as PDF</button>
                <button onclick="window.close()">Cancel</button>
            </div>
            <h1>${title}</h1>
            <div class="content">${cleanContent}</div>
            <script>
                // Auto-print after a short delay to let images load
                window.onload = function() {
                    // Give images time to load
                    setTimeout(function() {
                        // Uncomment the next line to auto-trigger print dialog
                        // window.print();
                    }, 1000);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function exportToRtf(title, content) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const resizeContainers = tempDiv.querySelectorAll('.img-resize-container');
    resizeContainers.forEach(container => {
        const img = container.querySelector('img');
        if (img) {
            const newImg = img.cloneNode(true);
            container.parentNode.replaceChild(newImg, container);
        }
    });

    // Convert HTML to RTF with embedded images
    const rtfContent = convertHtmlToRtf(title, tempDiv);
    console.log('Exporting RTF content, length:', rtfContent.length);
    
    const blob = new Blob([rtfContent], {
        type: 'application/rtf'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.rtf`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

// Convert HTML content to RTF format with embedded images
function convertHtmlToRtf(title, container) {
    let rtfBody = '';
    
    // Process all child nodes
    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Escape special RTF characters and convert to RTF
            let text = node.textContent;
            text = text.replace(/\\/g, '\\\\');
            text = text.replace(/\{/g, '\\{');
            text = text.replace(/\}/g, '\\}');
            // Handle unicode characters
            let rtfText = '';
            for (let i = 0; i < text.length; i++) {
                const code = text.charCodeAt(i);
                if (code > 127) {
                    rtfText += '\\u' + code + '?';
                } else {
                    rtfText += text[i];
                }
            }
            return rtfText;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            let result = '';
            
            // Handle different HTML elements
            switch (tag) {
                case 'h1':
                    result += '\\pard\\sb200\\sa100{\\b\\fs48 ';
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
                    result += '}\\par\n';
                    break;
                case 'h2':
                    result += '\\pard\\sb150\\sa80{\\b\\fs36 ';
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
                    result += '}\\par\n';
                    break;
                case 'h3':
                    result += '\\pard\\sb100\\sa60{\\b\\fs28 ';
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
                    result += '}\\par\n';
                    break;
                case 'p':
                case 'div':
                    result += '\\pard\\sa100 ';
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
                    result += '\\par\n';
                    break;
                case 'br':
                    result += '\\line\n';
                    break;
                case 'b':
                case 'strong':
                    result += '{\\b ';
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
                    result += '}';
                    break;
                case 'i':
                case 'em':
                    result += '{\\i ';
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
                    result += '}';
                    break;
                case 'u':
                    result += '{\\ul ';
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
                    result += '}';
                    break;
                case 'strike':
                case 's':
                    result += '{\\strike ';
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
                    result += '}';
                    break;
                case 'ul':
                case 'ol':
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
                    break;
                case 'li':
                    result += '\\pard\\li720\\sa60 \\bullet  ';
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
                    result += '\\par\n';
                    break;
                case 'a':
                    // Just include the text for links
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
                    break;
                case 'img':
                    const src = node.getAttribute('src');
                    if (src && src.startsWith('data:')) {
                        result += convertImageToRtf(node);
                    }
                    break;
                default:
                    // For other elements, just process children
                    for (const child of node.childNodes) {
                        result += processNode(child);
                    }
            }
            return result;
        }
        
        return '';
    }
    
    // Convert base64 image to RTF hex format
    function convertImageToRtf(imgElement) {
        const src = imgElement.getAttribute('src');
        const matches = src.match(/^data:image\/(jpeg|jpg|png|gif);base64,(.+)$/i);
        
        if (!matches) return '';
        
        const imageType = matches[1].toLowerCase();
        const base64Data = matches[2];
        
        // Convert base64 to hex
        const binaryString = atob(base64Data);
        let hexString = '';
        for (let i = 0; i < binaryString.length; i++) {
            const hex = binaryString.charCodeAt(i).toString(16).padStart(2, '0');
            hexString += hex;
        }
        
        // Get image dimensions
        let width = imgElement.width || imgElement.naturalWidth || 400;
        let height = imgElement.height || imgElement.naturalHeight || 300;
        
        // Limit max size
        const maxWidth = 400;
        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = Math.round(height * ratio);
        }
        
        // Convert pixels to twips (1 pixel ≈ 15 twips)
        const widthTwips = width * 15;
        const heightTwips = height * 15;
        
        // Determine picture type for RTF
        let picType = 'jpegblip';
        if (imageType === 'png') {
            picType = 'pngblip';
        }
        
        // Build RTF picture command
        // Break hex string into lines for readability (RTF allows this)
        let formattedHex = '';
        for (let i = 0; i < hexString.length; i += 128) {
            formattedHex += hexString.substr(i, 128) + '\n';
        }
        
        return `\\pard\\sa100{\\pict\\${picType}\\picwgoal${widthTwips}\\pichgoal${heightTwips}\n${formattedHex}}\\par\n`;
    }
    
    // Process all content
    for (const child of container.childNodes) {
        rtfBody += processNode(child);
    }
    
    // Build complete RTF document
    const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033
{\\fonttbl{\\f0\\fswiss\\fcharset0 Calibri;}{\\f1\\fswiss\\fcharset0 Arial;}}
{\\colortbl;\\red0\\green0\\blue0;}
\\viewkind4\\uc1\\pard\\f0\\fs24
\\pard\\sb200\\sa200{\\b\\fs56 ${title.replace(/[\\{}]/g, '\\$&')}}\\par
${rtfBody}
}`;
    
    return rtf;
}

function convertToPlainText(html) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = html;

    const processNode = (node) => {
        let result = '';
        
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {

            const blockElements = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'BR'];
            if (blockElements.includes(node.nodeName)) {
                result += '\n';
            }

            for (const child of node.childNodes) {
                result += processNode(child);
            }

            if (blockElements.includes(node.nodeName) && node.nodeName !== 'BR') {
                result += '\n';
            }
        }
        
        return result;
    };
    
    let text = processNode(tempElement);

    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text;
}

function convertToMarkdown(html) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = html;

    const processNode = (node, listType = null, listLevel = 0) => {
        let result = '';
        
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.nodeName.toLowerCase();
            let childContent = '';

            for (const child of node.childNodes) {
                if (tag === 'ul' || tag === 'ol') {
                    if (child.nodeName.toLowerCase() === 'li') {
                        childContent += processNode(child, tag, listLevel);
                    } else {
                        childContent += processNode(child, listType, listLevel);
                    }
                } else {
                    childContent += processNode(child, listType, listLevel);
                }
            }

            switch (tag) {
                case 'h1':
                    return '# ' + childContent.trim() + '\n\n';
                case 'h2':
                    return '## ' + childContent.trim() + '\n\n';
                case 'h3':
                    return '### ' + childContent.trim() + '\n\n';
                case 'h4':
                    return '#### ' + childContent.trim() + '\n\n';
                case 'h5':
                    return '##### ' + childContent.trim() + '\n\n';
                case 'h6':
                    return '###### ' + childContent.trim() + '\n\n';
                case 'p':
                    return childContent.trim() + '\n\n';
                case 'br':
                    return '\n';
                case 'strong':
                case 'b':
                    return '**' + childContent + '**';
                case 'em':
                case 'i':
                    return '*' + childContent + '*';
                case 'u':
                    return '<u>' + childContent + '</u>';
                case 'ul':
                    return childContent + '\n';
                case 'ol':
                    return childContent + '\n';
                case 'li':
                    const indent = '  '.repeat(listLevel);
                    if (listType === 'ul') {
                        return indent + '- ' + childContent.trim() + '\n';
                    } else if (listType === 'ol') {
                        return indent + '1. ' + childContent.trim() + '\n';
                    }
                    return '- ' + childContent.trim() + '\n';
                case 'blockquote':
                    return '> ' + childContent.trim().replace(/\n/g, '\n> ') + '\n\n';
                case 'code':
                    return '`' + childContent + '`';
                case 'pre':
                    return '```\n' + childContent + '\n```\n\n';
                case 'a':
                    const href = node.getAttribute('href') || '';
                    return '[' + childContent + '](' + href + ')';
                case 'img':
                    const src = node.getAttribute('src') || '';
                    const alt = node.getAttribute('alt') || '';
                    return '![' + alt + '](' + src + ')';
                case 'hr':
                    return '\n---\n\n';
                case 'div':
                    if (childContent.trim()) {
                        return childContent + '\n';
                    }
                    return childContent;
                default:
                    return childContent;
            }
        }
        
        return result;
    };
    
    let markdown = processNode(tempElement);

    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    markdown = markdown.trim();
    
    return markdown;
}

function convertMarkdownToHtml(markdown) {
    let html = markdown;

    html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return '<pre><code>' + escapedCode + '</code></pre>';
    });

    html = html.replace(/`([^`]+?)`/g, function(match, code) {
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return '<code>' + escapedCode + '</code>';
    });

    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');

    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    const ulLines = html.split('\n');
    let inUl = false;
    let ulResult = [];
    
    for (let i = 0; i < ulLines.length; i++) {
        const line = ulLines[i];
        const ulMatch = line.match(/^(\s*)[-*+] (.+)$/);
        
        if (ulMatch) {
            if (!inUl) {
                ulResult.push('<ul>');
                inUl = true;
            }
            ulResult.push('<li>' + ulMatch[2] + '</li>');
        } else {
            if (inUl) {
                ulResult.push('</ul>');
                inUl = false;
            }
            ulResult.push(line);
        }
    }
    if (inUl) {
        ulResult.push('</ul>');
    }
    html = ulResult.join('\n');

    const olLines = html.split('\n');
    let inOl = false;
    let olResult = [];
    
    for (let i = 0; i < olLines.length; i++) {
        const line = olLines[i];
        const olMatch = line.match(/^(\s*)\d+\. (.+)$/);
        
        if (olMatch) {
            if (!inOl) {
                olResult.push('<ol>');
                inOl = true;
            }
            olResult.push('<li>' + olMatch[2] + '</li>');
        } else {
            if (inOl) {
                olResult.push('</ol>');
                inOl = false;
            }
            olResult.push(line);
        }
    }
    if (inOl) {
        olResult.push('</ol>');
    }
    html = olResult.join('\n');

    const bqLines = html.split('\n');
    let inBq = false;
    let bqResult = [];
    
    for (let i = 0; i < bqLines.length; i++) {
        const line = bqLines[i];
        const bqMatch = line.match(/^> (.+)$/);
        
        if (bqMatch) {
            if (!inBq) {
                bqResult.push('<blockquote>');
                inBq = true;
            }
            bqResult.push(bqMatch[1]);
        } else {
            if (inBq) {
                bqResult.push('</blockquote>');
                inBq = false;
            }
            bqResult.push(line);
        }
    }
    if (inBq) {
        bqResult.push('</blockquote>');
    }
    html = bqResult.join('\n');

    html = html.split('\n\n').map(para => {
        para = para.trim();
        if (!para) return '';
        if (para.match(/^<(h[1-6]|ul|ol|blockquote|pre|hr)/)) {
            return para;
        }
        return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');

    html = html.replace(/\n{3,}/g, '\n\n');

    return html;
}

function filterNotes() {
    const searchTerm = elements.noteSearch.value.toLowerCase().trim();
    const options = elements.noteSelector.querySelectorAll('option');
    
    options.forEach(option => {
        if (option.value === '') {
            return;
        }
        
        const note = noteApp.notes[option.value];
        if (!note) return;
        
        const titleMatch = note.title.toLowerCase().includes(searchTerm);
        const contentMatch = note.content.toLowerCase().includes(searchTerm);
        
        if (searchTerm === '' || titleMatch || contentMatch) {
            option.style.display = '';
        } else {
            option.style.display = 'none';
        }
    });
}

function changeFontSize(delta) {
    noteApp.currentFontSize = Math.max(8, Math.min(24, noteApp.currentFontSize + delta));
    elements.noteArea.style.fontSize = `${noteApp.currentFontSize}pt`;
    elements.fontSizeIndicator.textContent = `${noteApp.currentFontSize}pt`;
    localStorage.setItem('rosieWriteFontSize', noteApp.currentFontSize);
}

function loadFontSizePreference() {
    const savedFontSize = localStorage.getItem('rosieWriteFontSize');
    if (savedFontSize) {
        noteApp.currentFontSize = parseInt(savedFontSize);
        // Handle migration from old percentage-based values
        if (noteApp.currentFontSize > 24) {
            noteApp.currentFontSize = 12; // Reset to default if old % value
        }
        elements.noteArea.style.fontSize = `${noteApp.currentFontSize}pt`;
        elements.fontSizeIndicator.textContent = `${noteApp.currentFontSize}pt`;
    }
}

function saveSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        noteApp.savedSelection = selection.getRangeAt(0).cloneRange();
    }
}

function restoreSelection() {
    if (noteApp.savedSelection) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(noteApp.savedSelection);
    }
}

function showLinkDialog() {
    saveSelection();

    const selection = window.getSelection();
    if (selection.toString().trim()) {
        elements.linkText.value = selection.toString();
    } else {
        elements.linkText.value = '';
    }
    elements.linkUrl.value = '';
    
    elements.linkDialog.classList.add('active');
    elements.linkUrl.focus();
}

function hideLinkDialog() {
    elements.linkDialog.classList.remove('active');
    elements.linkText.value = '';
    elements.linkUrl.value = '';
}

function insertLink() {
    const text = elements.linkText.value.trim();
    let url = elements.linkUrl.value.trim();
    
    if (!url) {
        alert('Please enter a URL');
        return;
    }

    if (!url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
    }
    
    hideLinkDialog();
    elements.noteArea.focus();
    restoreSelection();
    
    const linkText = text || url;
    const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    
    document.execCommand('insertHTML', false, linkHtml);
    
    noteApp.isSaved = false;
    updateSaveStatus('Unsaved changes');
    captureState();
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert('Image is too large. Please select an image under 5MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        insertImage(event.target.result, file.name);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
}

function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            
            const file = item.getAsFile();
            if (!file) continue;

            if (file.size > 5 * 1024 * 1024) {
                alert('Pasted image is too large. Please use an image under 5MB.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(event) {
                insertImage(event.target.result, 'pasted-image');
            };
            reader.readAsDataURL(file);
            
            break;
        }
    }
}

function insertImage(dataUrl, altText) {
    elements.noteArea.focus();
    
    const imgId = 'img_' + Date.now();
    const imgHtml = `<span class="img-resize-container" contenteditable="false" data-img-id="${imgId}">
        <img src="${dataUrl}" alt="${altText}" style="max-width: 100%; width: 300px;">
        <div class="img-size-toolbar">
            <button class="img-size-btn" data-size="25">25%</button>
            <button class="img-size-btn" data-size="50">50%</button>
            <button class="img-size-btn" data-size="75">75%</button>
            <button class="img-size-btn" data-size="100">100%</button>
        </div>
        <div class="resize-handle resize-handle-se" data-handle="se"></div>
        <div class="resize-handle resize-handle-sw" data-handle="sw"></div>
        <div class="resize-handle resize-handle-ne" data-handle="ne"></div>
        <div class="resize-handle resize-handle-nw" data-handle="nw"></div>
    </span>&nbsp;`;
    document.execCommand('insertHTML', false, imgHtml);
    setTimeout(() => setupImageResizeHandlers(), 50);
    
    noteApp.isSaved = false;
    updateSaveStatus('Unsaved changes');
    captureState();
}

function setupImageResizeHandlers() {
    const containers = elements.noteArea.querySelectorAll('.img-resize-container');
    
    containers.forEach(container => {
        if (container.dataset.initialized) return;
        container.dataset.initialized = 'true';
        
        const img = container.querySelector('img');
        const handles = container.querySelectorAll('.resize-handle');
        const sizeButtons = container.querySelectorAll('.img-size-btn');

        sizeButtons.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const size = parseInt(btn.dataset.size);
                const containerWidth = elements.noteArea.clientWidth - 50;
                const newWidth = (containerWidth * size) / 100;
                img.style.width = newWidth + 'px';
                img.style.height = 'auto';
                
                noteApp.isSaved = false;
                updateSaveStatus('Unsaved changes');
                captureState();
            });
        });

        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                container.classList.add('resizing');
                
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = img.offsetWidth;
                const startHeight = img.offsetHeight;
                const aspectRatio = startWidth / startHeight;
                const handleType = handle.dataset.handle;
                
                function onMouseMove(e) {
                    let deltaX = e.clientX - startX;
                    let deltaY = e.clientY - startY;

                    if (handleType === 'sw' || handleType === 'nw') {
                        deltaX = -deltaX;
                    }
                    if (handleType === 'ne' || handleType === 'nw') {
                        deltaY = -deltaY;
                    }

                    const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY * aspectRatio;
                    
                    let newWidth = Math.max(50, startWidth + delta);
                    const maxWidth = elements.noteArea.clientWidth - 50;
                    newWidth = Math.min(newWidth, maxWidth);
                    
                    img.style.width = newWidth + 'px';
                    img.style.height = 'auto';
                }
                
                function onMouseUp() {
                    container.classList.remove('resizing');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    
                    noteApp.isSaved = false;
                    updateSaveStatus('Unsaved changes');
                    captureState();
                }
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    });
}

function reinitializeImageHandlers() {
    const containers = elements.noteArea.querySelectorAll('.img-resize-container');
    containers.forEach(container => {
        delete container.dataset.initialized;
    });
    setupImageResizeHandlers();
}

window.onload = initApp;

function updateSaveStatus(message) {
    if (!elements.saveStatus) return;
    
    elements.saveStatus.textContent = message;
    
    if (message === 'Unsaved changes') {
        elements.saveStatus.classList.add('saving');
    } else {
        elements.saveStatus.classList.remove('saving');
    }
}

function updateWordCount() {
    if (!elements.wordCount || !elements.noteArea) return;
    
    const text = elements.noteArea.innerText || elements.noteArea.textContent || '';
    
    const charCount = text.trim().length;
    
    let wordCount = 0;
    if (text.trim().length > 0) {
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        wordCount = words.length;
    }
    
    elements.wordCount.textContent = `${wordCount} ${wordCount === 1 ? 'word' : 'words'} | ${charCount} ${charCount === 1 ? 'character' : 'characters'}`;
}

function importNote(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        createNewNote();

        const content = event.target.result;
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        elements.noteTitle.value = file.name.replace(/\.[^/.]+$/, "");
        
        if (fileExtension === 'html') {
            const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            elements.noteArea.innerHTML = bodyMatch ? bodyMatch[1] : content;
        } else if (fileExtension === 'md' || fileExtension === 'markdown') {
            elements.noteArea.innerHTML = convertMarkdownToHtml(content);
        } else {
            elements.noteArea.innerHTML = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');
        }
        
        saveCurrentNote();
        updateNotesList();
        updateWordCount();
        reinitializeImageHandlers();
    };
    
    reader.readAsText(file);
    
    e.target.value = '';
}

window.onbeforeunload = function() {
    saveCurrentNote();
};