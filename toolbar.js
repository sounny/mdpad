/* =====================================================
   MDPad - Toolbar
   Handles formatting, view modes, and menu actions
   ===================================================== */

const Toolbar = (function () {
    'use strict';

    // DOM Elements
    let editor = null;

    /**
     * Initialize toolbar
     */
    function init() {
        editor = document.getElementById('editor');

        setupDropdowns();
        setupFormatButtons();
        setupViewModeButtons();
        setupMenuButtons();
        setupKeyboardShortcuts();
        setupHeadingSelect();
        setupModals();
    }

    /**
     * Setup dropdown menus
     */
    function setupDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown');

        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown__trigger');

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();

                // Close other dropdowns
                dropdowns.forEach(d => {
                    if (d !== dropdown) d.classList.remove('active');
                });

                dropdown.classList.toggle('active');
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            dropdowns.forEach(d => d.classList.remove('active'));
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdowns.forEach(d => d.classList.remove('active'));
            }
        });
    }

    /**
     * Setup formatting buttons
     */
    function setupFormatButtons() {
        // Bold
        setupButton('btnBold', () => wrapSelection('**', '**'));

        // Italic
        setupButton('btnItalic', () => wrapSelection('*', '*'));

        // Strikethrough
        setupButton('btnStrikethrough', () => wrapSelection('~~', '~~'));

        // Inline code
        setupButton('btnInlineCode', () => wrapSelection('`', '`'));

        // Bullet list
        setupButton('btnBulletList', () => insertAtLineStart('- '));

        // Numbered list
        setupButton('btnNumberedList', () => insertNumberedList());

        // Task list
        setupButton('btnTaskList', () => insertAtLineStart('- [ ] '));

        // Blockquote
        setupButton('btnBlockquote', () => insertAtLineStart('> '));
        setupButton('btnInsertQuote', () => insertAtLineStart('> '));

        // Code block
        setupButton('btnCodeBlock', () => insertCodeBlock());
        setupButton('btnInsertCode', () => insertCodeBlock());

        // Link
        setupButton('btnLink', () => openModal('insertLinkModal'));
        setupButton('btnInsertLink', () => openModal('insertLinkModal'));

        // Image
        setupButton('btnImage', () => openModal('insertImageModal'));
        setupButton('btnInsertImage', () => openModal('insertImageModal'));

        // Table
        setupButton('btnInsertTable', () => openModal('insertTableModal'));

        // Horizontal rule
        setupButton('btnInsertHR', () => insertText('\n\n---\n\n'));
    }

    /**
     * Setup view mode buttons
     */
    function setupViewModeButtons() {
        const container = document.getElementById('editorContainer');
        const buttons = {
            raw: ['btnModeRaw', 'btnViewRaw'],
            split: ['btnModeSplit', 'btnViewSplit'],
            preview: ['btnModePreview', 'btnViewPreview']
        };

        Object.entries(buttons).forEach(([mode, btnIds]) => {
            btnIds.forEach(id => {
                setupButton(id, () => setViewMode(mode));
            });
        });
    }

    /**
     * Set view mode
     */
    function setViewMode(mode) {
        const container = document.getElementById('editorContainer');
        if (!container) return;

        container.dataset.view = mode;

        // Update button states
        ['raw', 'split', 'preview'].forEach(m => {
            const btnFormat = document.getElementById(`btnMode${capitalize(m)}`);
            const btnMenu = document.getElementById(`btnView${capitalize(m)}`);

            if (btnFormat) btnFormat.classList.toggle('active', m === mode);
            if (btnMenu) btnMenu.classList.toggle('active', m === mode);
        });

        // Focus editor if in raw or split mode
        if (mode !== 'preview' && editor) {
            editor.focus();
        }
    }

    /**
     * Setup menu buttons
     */
    function setupMenuButtons() {
        // File menu
        setupButton('btnNew', () => FileOps.newDocument());
        setupButton('btnOpen', () => FileOps.openFile());
        setupButton('btnSave', () => FileOps.saveToLocalStorage());
        setupButton('btnDownload', () => FileOps.downloadMarkdown());
        setupButton('btnExportPDF', () => FileOps.exportToPDF());
        setupButton('btnPrint', () => FileOps.printDocument());

        // Edit menu
        setupButton('btnUndo', () => document.execCommand('undo'));
        setupButton('btnRedo', () => document.execCommand('redo'));
        setupButton('btnSelectAll', () => {
            if (editor) {
                editor.select();
                editor.focus();
            }
        });
        setupButton('btnFind', () => openModal('findReplaceModal'));

        // View menu - Zoom
        setupButton('btnZoomIn', () => adjustZoom(25));
        setupButton('btnZoomOut', () => adjustZoom(-25));
        setupButton('btnZoomReset', () => setZoom(100));

        // Help menu
        setupButton('btnMarkdownGuide', () => openModal('markdownGuideModal'));
        setupButton('btnKeyboardShortcuts', () => openModal('keyboardShortcutsModal'));
        setupButton('btnAbout', () => openModal('aboutModal'));

        // Dark mode toggle
        setupButton('btnDarkMode', toggleDarkMode);

        // Insert modals confirm buttons
        setupButton('btnInsertLinkConfirm', insertLink);
        setupButton('btnInsertImageConfirm', insertImage);
        setupButton('btnInsertTableConfirm', insertTable);

        // Find & Replace
        setupButton('btnFindNext', () => findNext());
        setupButton('btnFindPrev', () => findPrev());
        setupButton('btnReplace', () => replaceNext());
        setupButton('btnReplaceAll', () => replaceAll());
    }

    /**
     * Setup heading select
     */
    function setupHeadingSelect() {
        const select = document.getElementById('selectHeading');
        if (!select) return;

        select.addEventListener('change', () => {
            const level = select.value;
            if (level) {
                insertHeading(parseInt(level));
            }
            select.value = '';
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Check for Ctrl/Cmd key
            const mod = e.ctrlKey || e.metaKey;

            if (mod) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        wrapSelection('**', '**');
                        break;
                    case 'i':
                        e.preventDefault();
                        wrapSelection('*', '*');
                        break;
                    case 'k':
                        e.preventDefault();
                        openModal('insertLinkModal');
                        break;
                    case '`':
                        e.preventDefault();
                        wrapSelection('`', '`');
                        break;
                    case 's':
                        e.preventDefault();
                        FileOps.saveToLocalStorage();
                        break;
                    case 'o':
                        e.preventDefault();
                        FileOps.openFile();
                        break;
                    case 'n':
                        e.preventDefault();
                        FileOps.newDocument();
                        break;
                    case 'f':
                        e.preventDefault();
                        openModal('findReplaceModal');
                        break;
                    case '1':
                        e.preventDefault();
                        setViewMode('raw');
                        break;
                    case '2':
                        e.preventDefault();
                        setViewMode('split');
                        break;
                    case '3':
                        e.preventDefault();
                        setViewMode('preview');
                        break;
                }
            }
        });
    }

    /**
     * Setup modals
     */
    function setupModals() {
        // Close buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) closeModal(modal.id);
            });
        });

        // Close on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal.id);
                }
            });
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal[open]').forEach(modal => {
                    closeModal(modal.id);
                });
            }
        });
    }

    /**
     * Open modal
     */
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.showModal();
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    /**
     * Close modal
     */
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.close();
        }
    }

    /**
     * Helper: Setup button click handler
     */
    function setupButton(id, handler) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                handler();
            });
        }
    }

    /**
     * Wrap selection with prefix/suffix
     */
    function wrapSelection(prefix, suffix) {
        if (!editor) return;

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        const selectedText = text.substring(start, end);

        const newText = prefix + (selectedText || 'text') + suffix;

        editor.setRangeText(newText, start, end, 'select');
        editor.focus();

        // If no selection, position cursor inside
        if (!selectedText) {
            const cursorPos = start + prefix.length;
            editor.setSelectionRange(cursorPos, cursorPos + 4);
        }

        triggerInput();
    }

    /**
     * Insert text at cursor
     */
    function insertText(text) {
        if (!editor) return;

        const start = editor.selectionStart;
        editor.setRangeText(text, start, editor.selectionEnd, 'end');
        editor.focus();
        triggerInput();
    }

    /**
     * Insert at line start
     */
    function insertAtLineStart(prefix) {
        if (!editor) return;

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;

        // Find line start
        let lineStart = start;
        while (lineStart > 0 && text[lineStart - 1] !== '\n') {
            lineStart--;
        }

        // Get selected lines
        let lineEnd = end;
        while (lineEnd < text.length && text[lineEnd] !== '\n') {
            lineEnd++;
        }

        const lines = text.substring(lineStart, lineEnd).split('\n');
        const newLines = lines.map(line => prefix + line).join('\n');

        editor.setRangeText(newLines, lineStart, lineEnd, 'end');
        editor.focus();
        triggerInput();
    }

    /**
     * Insert numbered list
     */
    function insertNumberedList() {
        if (!editor) return;

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;

        // Find line start
        let lineStart = start;
        while (lineStart > 0 && text[lineStart - 1] !== '\n') {
            lineStart--;
        }

        // Get selected lines
        let lineEnd = end;
        while (lineEnd < text.length && text[lineEnd] !== '\n') {
            lineEnd++;
        }

        const lines = text.substring(lineStart, lineEnd).split('\n');
        const newLines = lines.map((line, i) => `${i + 1}. ${line}`).join('\n');

        editor.setRangeText(newLines, lineStart, lineEnd, 'end');
        editor.focus();
        triggerInput();
    }

    /**
     * Insert heading
     */
    function insertHeading(level) {
        const prefix = '#'.repeat(level) + ' ';
        insertAtLineStart(prefix);
    }

    /**
     * Insert code block
     */
    function insertCodeBlock() {
        if (!editor) return;

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);

        const codeBlock = `\n\`\`\`\n${selectedText || 'code here'}\n\`\`\`\n`;

        editor.setRangeText(codeBlock, start, end, 'end');
        editor.focus();

        // Position cursor inside code block
        if (!selectedText) {
            const cursorPos = start + 5;
            editor.setSelectionRange(cursorPos, cursorPos + 9);
        }

        triggerInput();
    }

    /**
     * Insert link from modal
     */
    function insertLink() {
        const text = document.getElementById('linkText').value || 'link text';
        const url = document.getElementById('linkUrl').value || 'https://';

        const markdown = `[${text}](${url})`;
        insertText(markdown);

        closeModal('insertLinkModal');

        // Clear inputs
        document.getElementById('linkText').value = '';
        document.getElementById('linkUrl').value = '';
    }

    /**
     * Insert image from modal
     */
    function insertImage() {
        const alt = document.getElementById('imageAlt').value || 'image';
        const url = document.getElementById('imageUrl').value || 'https://';

        const markdown = `![${alt}](${url})`;
        insertText(markdown);

        closeModal('insertImageModal');

        // Clear inputs
        document.getElementById('imageAlt').value = '';
        document.getElementById('imageUrl').value = '';
    }

    /**
     * Insert table from modal
     */
    function insertTable() {
        const rows = parseInt(document.getElementById('tableRows').value) || 3;
        const cols = parseInt(document.getElementById('tableCols').value) || 3;
        const hasHeader = document.getElementById('tableHeader').checked;

        let table = '\n';

        // Header row
        if (hasHeader) {
            table += '| ' + Array(cols).fill('Header').join(' | ') + ' |\n';
            table += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
        }

        // Data rows
        const dataRows = hasHeader ? rows - 1 : rows;
        for (let i = 0; i < dataRows; i++) {
            table += '| ' + Array(cols).fill('Cell').join(' | ') + ' |\n';
        }

        table += '\n';

        insertText(table);
        closeModal('insertTableModal');
    }

    /**
     * Find next occurrence
     */
    function findNext() {
        const query = document.getElementById('findInput').value;
        if (!query || !editor) return;

        const text = editor.value;
        const caseSensitive = document.getElementById('findCaseSensitive').checked;
        const searchText = caseSensitive ? text : text.toLowerCase();
        const searchQuery = caseSensitive ? query : query.toLowerCase();

        let start = editor.selectionEnd;
        let index = searchText.indexOf(searchQuery, start);

        // Wrap around
        if (index === -1 && start > 0) {
            index = searchText.indexOf(searchQuery, 0);
        }

        if (index !== -1) {
            editor.setSelectionRange(index, index + query.length);
            editor.focus();
            updateFindStatus(index, searchText, searchQuery);
        } else {
            updateFindStatus(-1);
        }
    }

    /**
     * Find previous occurrence
     */
    function findPrev() {
        const query = document.getElementById('findInput').value;
        if (!query || !editor) return;

        const text = editor.value;
        const caseSensitive = document.getElementById('findCaseSensitive').checked;
        const searchText = caseSensitive ? text : text.toLowerCase();
        const searchQuery = caseSensitive ? query : query.toLowerCase();

        let end = editor.selectionStart;
        let index = searchText.lastIndexOf(searchQuery, end - 1);

        // Wrap around
        if (index === -1) {
            index = searchText.lastIndexOf(searchQuery);
        }

        if (index !== -1) {
            editor.setSelectionRange(index, index + query.length);
            editor.focus();
            updateFindStatus(index, searchText, searchQuery);
        } else {
            updateFindStatus(-1);
        }
    }

    /**
     * Replace next occurrence
     */
    function replaceNext() {
        const query = document.getElementById('findInput').value;
        const replacement = document.getElementById('replaceInput').value;
        if (!query || !editor) return;

        // First, find and select
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);

        const caseSensitive = document.getElementById('findCaseSensitive').checked;
        const matches = caseSensitive
            ? selectedText === query
            : selectedText.toLowerCase() === query.toLowerCase();

        if (matches) {
            editor.setRangeText(replacement, start, end, 'end');
            triggerInput();
        }

        findNext();
    }

    /**
     * Replace all occurrences
     */
    function replaceAll() {
        const query = document.getElementById('findInput').value;
        const replacement = document.getElementById('replaceInput').value;
        if (!query || !editor) return;

        const caseSensitive = document.getElementById('findCaseSensitive').checked;
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(escapeRegex(query), flags);

        const newText = editor.value.replace(regex, replacement);
        const count = (editor.value.match(regex) || []).length;

        editor.value = newText;
        triggerInput();

        updateFindStatus(-1, null, null, count);
    }

    /**
     * Update find status display
     */
    function updateFindStatus(index, searchText, searchQuery, replaceCount) {
        const status = document.getElementById('findStatus');
        if (!status) return;

        if (replaceCount !== undefined) {
            status.textContent = `Replaced ${replaceCount} occurrence(s)`;
        } else if (index === -1) {
            status.textContent = 'No matches found';
        } else {
            // Count total matches
            const matches = searchText.split(searchQuery).length - 1;
            status.textContent = `Found ${matches} match(es)`;
        }
    }

    /**
     * Escape regex special characters
     */
    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Adjust zoom level
     */
    function adjustZoom(delta) {
        const wrapper = document.getElementById('previewWrapper');
        const editorWrapper = document.getElementById('editorWrapper');

        let currentZoom = parseInt(wrapper?.dataset.zoom || 100);
        let newZoom = Math.max(50, Math.min(150, currentZoom + delta));

        if (wrapper) wrapper.dataset.zoom = newZoom;
        if (editorWrapper) editorWrapper.dataset.zoom = newZoom;

        updateZoomDisplay(newZoom);
    }

    /**
     * Set exact zoom level
     */
    function setZoom(level) {
        const wrapper = document.getElementById('previewWrapper');
        const editorWrapper = document.getElementById('editorWrapper');

        if (wrapper) wrapper.dataset.zoom = level;
        if (editorWrapper) editorWrapper.dataset.zoom = level;

        updateZoomDisplay(level);
    }

    /**
     * Update zoom display in status bar
     */
    function updateZoomDisplay(level) {
        const statusZoom = document.querySelector('#statusZoom .statusbar__value');
        if (statusZoom) {
            statusZoom.textContent = `${level}%`;
        }
    }

    /**
     * Toggle dark mode
     */
    function toggleDarkMode() {
        const html = document.documentElement;
        const isDark = html.dataset.theme === 'dark';

        html.dataset.theme = isDark ? 'light' : 'dark';

        // Toggle syntax highlighting theme
        const lightTheme = document.getElementById('hljs-light');
        const darkTheme = document.getElementById('hljs-dark');

        if (lightTheme) lightTheme.disabled = !isDark;
        if (darkTheme) darkTheme.disabled = isDark;

        // Save preference
        localStorage.setItem('mdpad_theme', isDark ? 'light' : 'dark');
    }

    /**
     * Load saved theme
     */
    function loadTheme() {
        const savedTheme = localStorage.getItem('mdpad_theme');
        if (savedTheme === 'dark') {
            document.documentElement.dataset.theme = 'dark';
            const lightTheme = document.getElementById('hljs-light');
            const darkTheme = document.getElementById('hljs-dark');
            if (lightTheme) lightTheme.disabled = true;
            if (darkTheme) darkTheme.disabled = false;
        }
    }

    /**
     * Trigger input event on editor
     */
    function triggerInput() {
        if (editor) {
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    /**
     * Capitalize first letter
     */
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Public API
    return {
        init,
        setViewMode,
        openModal,
        closeModal,
        loadTheme
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Toolbar.init();
    Toolbar.loadTheme();
});
