const APP_VERSION = "1.0.1";

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
    CHARACTER_CAPTURE_THRESHOLD: 5
};

//init blank objs

const elements = {};

const formatButtons = {};

// init
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
    elements.deleteAllNotesBtn = document.getElementById('deleteAllNotes');

    formatButtons.bold = document.getElementById('boldBtn'),
    formatButtons.italic = document.getElementById('italicBtn'),
    formatButtons.underline = document.getElementById('underlineBtn'),
    formatButtons.heading = document.getElementById('headingBtn'),
    formatButtons.list = document.getElementById('listBtn'),
    formatButtons.numList = document.getElementById('numListBtn')

    loadNotes();
    setupEventListeners();
    checkDarkModePreference();
    if (Object.keys(noteApp.notes).length > 0) {
        // load the most recent
        loadMostRecentNote();
    } else {
        // No existing notes -> create blank
        createNewNote();
    }

    elements.noteArea.addEventListener('input', (e) => {
        noteApp.isSaved = false;
        updateSaveStatus('Unsaved changes');
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
            }, 50); // delay
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
            // reset char counter
            noteApp.characterCount = 0;
            setTimeout(() => captureState(), 0);
        }
    });
    
    // capture state
    elements.noteArea.addEventListener('blur', () => {
        captureState();
        noteApp.characterCount = 0;
    });

    elements.noteArea.addEventListener('focus', () => {
        if (noteApp.undoStack.length === 0) {
            captureState();
        }
    });

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
    
    // current state -> redo stack
    noteApp.redoStack.push({
        content: elements.noteArea.innerHTML,
        title: elements.noteTitle.value
    });
    
    // previous state -> current
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
    
    // current -> undo stack
    noteApp.undoStack.push({
        content: elements.noteArea.innerHTML,
        title: elements.noteTitle.value
    });
    
    // redo state
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
    }
    
    noteApp.isSaved = false;
    updateSaveStatus('Unsaved changes');
    captureState();
}

function handleKeyboardShortcuts(e) {
    if (document.activeElement === elements.noteTitle) return;
    
    // Format shortcuts
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
                break;
            case 'y':
                e.preventDefault();
                redo();
                break;
            case 's':
                e.preventDefault();
                saveCurrentNote();
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
        
        // reset undo/redo stacks
        noteApp.undoStack = [];
        noteApp.redoStack = [];
    }
}

function switchNote() {
    const noteId = elements.noteSelector.value;
    if (!noteId) return;
    
    // save current before switching
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
    
    // Del confirmation
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
    
    const note = noteApp.notes[noteApp.currentNoteId];
    if (!note) return;
    
    const title = note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const content = note.content;
    
    let exportContent;
    let mimeType;
    let fileExtension;
    
    switch(format) {
        case 'txt':
            exportContent = convertToPlainText(content);
            mimeType = 'text/plain';
            fileExtension = 'txt';
            break;
        case 'rtf':
            exportContent = convertToRtf(content, note.title);
            mimeType = 'application/rtf';
            fileExtension = 'rtf';
            break;
        case 'html':
        default:
            exportContent = content;
            mimeType = 'text/html';
            fileExtension = 'html';
            break;
    }

    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
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

// HTML to RTF
function convertToRtf(html, title) {
    // RTF head
    let rtf = '{\\rtf1\\ansi\\ansicpg1252\\cocoartf2580\\cocoasubrtf220\n' +
              '{\\fonttbl\\f0\\fswiss\\fcharset0 Helvetica;}\n' +
              '{\\colortbl;\\red0\\green0\\blue0;}\n' +
              '\\vieww12000\\viewh15840\\viewkind0\n' +
              '\\pard\\tx720\\tx1440\\tx2160\\tx2880\\tx3600\\tx4320\\tx5040\\tx5760\\tx6480\\tx7200\\tx7920\\tx8640\\pardirnatural\\partightenfactor0\n\n' +
              '\\f0\\fs24 \\cf0 ';

    rtf += `{\\b\\fs32 ${escapeRtf(title)}}\\par\\par\n`;

    const tempElement = document.createElement('div');
    tempElement.innerHTML = html;

    function processNodeToRtf(node, inList = false, listLevel = 0) {
        let nodeRtf = '';
        
        if (node.nodeType === Node.TEXT_NODE) {
            return escapeRtf(node.textContent);
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            let prefix = '';
            let suffix = '';
            let childContent = '';

            switch (node.nodeName.toLowerCase()) {
                case 'b':
                case 'strong':
                    prefix = '{\\b ';
                    suffix = '}';
                    break;
                case 'i':
                case 'em':
                    prefix = '{\\i ';
                    suffix = '}';
                    break;
                case 'u':
                    prefix = '{\\ul ';
                    suffix = '}';
                    break;
                case 'h1':
                    prefix = '{\\b\\fs40 ';
                    suffix = '}\\par\\par\n';
                    break;
                case 'h2':
                    prefix = '{\\b\\fs36 ';
                    suffix = '}\\par\\par\n';
                    break;
                case 'h3':
                    prefix = '{\\b\\fs32 ';
                    suffix = '}\\par\\par\n';
                    break;
                case 'h4':
                case 'h5':
                case 'h6':
                    prefix = '{\\b\\fs28 ';
                    suffix = '}\\par\\par\n';
                    break;
                case 'p':
                    suffix = '\\par\\par\n';
                    break;
                case 'br':
                    nodeRtf = '\\line ';
                    break;
                case 'ul':
                    for (let i = 0; i < node.children.length; i++) {
                        if (node.children[i].nodeName.toLowerCase() === 'li') {
                            const bullet = '\\bullet ';
                            const indent = '\\li' + ((listLevel + 1) * 360) + ' \\fi-360 ';
                            const listItemContent = processNodeToRtf(node.children[i], true, listLevel + 1);
                            childContent += indent + bullet + listItemContent + '\\par\n';
                        }
                    }
                    return childContent;
                case 'ol':
                    for (let i = 0; i < node.children.length; i++) {
                        if (node.children[i].nodeName.toLowerCase() === 'li') {
                            const number = (i + 1) + '. ';
                            const indent = '\\li' + ((listLevel + 1) * 360) + ' \\fi-360 ';
                            const listItemContent = processNodeToRtf(node.children[i], true, listLevel + 1);
                            childContent += indent + number + listItemContent + '\\par\n';
                        }
                    }
                    return childContent;
                case 'li':
                    if (!inList) {
                        prefix = '\\bullet ';
                        suffix = '\\par\n';
                    }
                    break;
                case 'div':
                    if (node.children.length > 0 || node.textContent.trim()) {
                        suffix = '\\par\n';
                    }
                    break;
            }

            for (const child of node.childNodes) {
                if ((node.nodeName.toLowerCase() === 'ul' || node.nodeName.toLowerCase() === 'ol') && 
                    child.nodeName.toLowerCase() === 'li') {
                    continue;
                }
                childContent += processNodeToRtf(child, inList, listLevel);
            }
            
            nodeRtf += prefix + childContent + suffix;
        }
        
        return nodeRtf;
    }

    rtf += processNodeToRtf(tempElement);
    rtf += '}';
    
    return rtf;
}

function escapeRtf(text) {
    if (!text) return '';
    
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\n/g, '\\par\n')
        .replace(/\r/g, '')
        .replace(/\u2018|\u2019|\u201A|\uFFFD/g, '\'')
        .replace(/\u201c|\u201d|\u201e/g, '"')
        .replace(/\u2013/g, '-')
        .replace(/\u2014/g, '--')
        .replace(/\u2026/g, '...')
        .replace(/[^\x00-\x7F]/g, c => {
            const charCode = c.charCodeAt(0);
            return '\\u' + charCode + '?';
        });
}

window.onload = initApp;

// save status
function updateSaveStatus(message) {
    if (!elements.saveStatus) return;
    
    elements.saveStatus.textContent = message;
    
    if (message === 'Unsaved changes') {
        elements.saveStatus.classList.add('saving');
    } else {
        elements.saveStatus.classList.remove('saving');
    }
}

// Import
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
        } else {
            // preserve line breaks
            elements.noteArea.innerHTML = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');
        }
        
        saveCurrentNote();
        updateNotesList();
    };
    
    if (file.name.toLowerCase().endsWith('.html')) {
        reader.readAsText(file);
    } else {
        reader.readAsText(file);
    }
    
    
    e.target.value = '';
}

// save note
window.onbeforeunload = function() {
    saveCurrentNote();
};