/* =====================================================
   MDPad - Main Application
   Core editor and preview functionality
   ===================================================== */

const MDPad = (function () {
    'use strict';

    // Configuration
    const config = {
        previewDelay: 150, // Debounce delay for preview updates
        autoGrow: true,    // Auto-grow textarea
        syncScroll: true   // Sync scroll between editor and preview
    };

    // State
    let previewTimeout = null;
    let lastScrollSource = null;
    let history = null;

    // DOM Elements
    let editor = null;
    let preview = null; // Still needed for some refs, but we use pagesContainer mostly
    let pagesContainer = null;
    let editorWrapper = null;
    let previewWrapper = null;
    let lineNumbers = null;
    let editorPanel = null;

    /**
     * Initialize the application
     */
    function init() {
        // Get DOM elements
        editor = document.getElementById('editor');
        preview = document.getElementById('preview'); // Keep for backward compat or ref
        pagesContainer = document.getElementById('pagesContainer');
        editorWrapper = document.getElementById('editorWrapper');
        previewWrapper = document.getElementById('previewWrapper');
        lineNumbers = document.getElementById('lineNumbers');
        editorPanel = document.getElementById('editorPanel');

        if (!editor || !pagesContainer) {
            console.error('Required elements not found');
            return;
        }

        // Initialize History Manager
        if (typeof HistoryManager !== 'undefined') {
            history = new HistoryManager(editor);
            window.mdHistory = history;
        }

        // Initialize WYSIWYG
        if (typeof WYSIWYG !== 'undefined') {
            WYSIWYG.init(editor);
            WYSIWYG.setupListeners(pagesContainer, (newMarkdown) => {
                // Update editor value without triggering input
                const scrollPos = editor.scrollTop;
                editor.value = newMarkdown;
                editor.scrollTop = scrollPos;

                // We don't re-render preview here to avoid losing cursor focus in contenteditable
                // But we should push to history?
                // For now, let's just update the model.
                updateStats();
                FileOps.markAsUnsaved();
            });
        }

        // Configure marked.js
        configureMarked();

        // Setup event listeners
        setupEditorEvents();
        setupScrollSync();
        setupResizeHandle();

        // Initial render
        renderPreview();

        // Update stats
        updateStats();

        // Update line numbers
        updateLineNumbers();

        // Load sample content if empty
        if (!editor.value) {
            loadWelcomeContent();
        }

        console.log('MDPad initialized successfully');
    }

    /**
     * Configure marked.js parser
     */
    function configureMarked() {
        if (typeof marked === 'undefined') {
            console.error('marked.js not loaded');
            return;
        }

        const renderer = new marked.Renderer();

        renderer.code = function (code, language) {
            let highlighted = code;
            if (typeof hljs !== 'undefined' && language && hljs.getLanguage(language)) {
                try { highlighted = hljs.highlight(code, { language }).value; } catch (e) { }
            } else if (typeof hljs !== 'undefined') {
                try { highlighted = hljs.highlightAuto(code).value; } catch (e) { }
            }
            return `<pre><code class="hljs ${language || ''}">${highlighted}</code></pre>`;
        };

        renderer.link = function (href, title, text) {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
        };

        renderer.listitem = function (text, task, checked) {
            if (task) {
                return `<li class="task-list-item"><input type="checkbox" ${checked ? 'checked' : ''} disabled> ${text}</li>`;
            }
            return `<li>${text}</li>`;
        };

        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: true,
            pedantic: false,
            smartLists: true,
            smartypants: false,
            xhtml: false
        });
    }

    /**
     * Setup editor event listeners
     */
    function setupEditorEvents() {
        editor.addEventListener('input', (e) => {
            if (history && !e.isHistoryRestore) {
                clearTimeout(editor.historyTimeout);
                editor.historyTimeout = setTimeout(() => {
                    history.pushState();
                }, 500);
            }
            debouncePreview();
            updateStats();
            autoGrowEditor();
            updateLineNumbers();
            FileOps.markAsUnsaved();
        });

        editor.addEventListener('keyup', updateCursorPosition);
        editor.addEventListener('click', updateCursorPosition);
        editor.addEventListener('select', updateCursorPosition);
        editor.addEventListener('keydown', handleTabKey);
        editor.addEventListener('keydown', handleUndoRedo);
        editor.addEventListener('keydown', handleAutoPairs);

        // Listen for view changes from Toolbar
        document.addEventListener('viewchange', (e) => {
            const mode = e.detail.mode;
            if (mode === 'preview') {
                setWYSIWYG(true);
            } else {
                setWYSIWYG(false);
            }
        });

        // Toggle Edit Page View Shortcut (Ctrl+E)
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.code === 'KeyE' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                toggleWYSIWYG();
            }
        });
    }

    /**
     * Set Edit Page View Mode
     * @param {boolean} enabled
     */
    function setWYSIWYG(enabled) {
        if (typeof WYSIWYG === 'undefined') return;

        WYSIWYG.isEnabled = enabled;

        if (WYSIWYG.isEnabled) {
            // Enter Edit Page View Mode
            editorPanel.style.display = 'none';
            document.getElementById('previewPanel').style.width = '100%';
            renderPreview(); // Re-render with contenteditable=true
            // Only show notification if manually toggled or explicit interaction, 
            // but for seamless switching we might want to be quiet or show a subtle hint.
            // keeping notification for now but maybe shorter?
        } else {
            // Exit Edit Mode
            editorPanel.style.display = 'flex';
            document.getElementById('previewPanel').style.width = '50%'; // Reset to split
            editorPanel.style.width = '50%';
            renderPreview(); // Re-render read-only
        }
    }

    /**
     * Toggle Edit Page View Mode
     */
    function toggleWYSIWYG() {
        setWYSIWYG(!WYSIWYG.isEnabled);
        showNotification(WYSIWYG.isEnabled ? 'Edit Page View Enabled' : 'Split View Enabled');
    }

    // Helper for notifications (simple version)
    function showNotification(msg) {
        const notif = document.createElement('div');
        notif.textContent = msg;
        notif.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            background: var(--color-primary); color: white;
            padding: 10px 20px; border-radius: 4px;
            animation: slideIn 0.3s ease-out; z-index: 1000;
        `;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notif.remove(), 300);
        }, 2000);
    }

    /**
     * Handle Undo/Redo
     */
    function handleUndoRedo(e) {
        if (!history) return;
        const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z';
        const isRedo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y';
        if (isUndo) { e.preventDefault(); history.undo(); }
        else if (isRedo) { e.preventDefault(); history.redo(); }
    }

    /**
     * Handle tab key
     */
    function handleTabKey(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (history) history.pushState();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            if (e.shiftKey) {
                const text = editor.value;
                let lineStart = start;
                while (lineStart > 0 && text[lineStart - 1] !== '\n') lineStart--;
                const lineText = text.substring(lineStart, end);
                const outdented = lineText.replace(/^(\t|  )/, '');
                const diff = lineText.length - outdented.length;
                editor.setRangeText(outdented, lineStart, end, 'end');
                editor.setSelectionRange(Math.max(lineStart, start - diff), end - diff);
            } else {
                editor.setRangeText('  ', start, end, 'end');
            }
            if (history) history.pushState();
            triggerInput();
        }
    }

    /**
     * Handle auto-pairs
     */
    function handleAutoPairs(e) {
        const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`', '*': '*', '_': '_' };
        if (pairs[e.key]) {
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const selectedText = editor.value.substring(start, end);
            if (selectedText && ['*', '_', '`', '"', "'"].includes(e.key)) {
                e.preventDefault();
                if (history) history.pushState();
                const wrapped = e.key + selectedText + pairs[e.key];
                editor.setRangeText(wrapped, start, end, 'select');
                if (history) history.pushState();
                triggerInput();
            }
        }
    }

    function debouncePreview() {
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(renderPreview, config.previewDelay);
    }

    /**
     * Render markdown preview with Pagination
     */
    function renderPreview() {
        if (!editor || !pagesContainer) return;

        try {
            const markdown = editor.value;
            let html = marked.parse(markdown);

            if (typeof DOMPurify !== 'undefined') {
                html = DOMPurify.sanitize(html);
            }

            // Use Paginator to render
            if (typeof Paginator !== 'undefined') {
                const isEditable = (typeof WYSIWYG !== 'undefined') && WYSIWYG.isEnabled;
                Paginator.paginate(html, pagesContainer, isEditable);
            } else {
                // Fallback
                pagesContainer.innerHTML = html;
            }

            // Re-apply syntax highlighting
            pagesContainer.querySelectorAll('pre code').forEach((block) => {
                if (typeof hljs !== 'undefined') hljs.highlightElement(block);
            });

            // Update preview status
            const status = document.getElementById('previewStatus');
            if (status) {
                status.textContent = 'Updated';
                setTimeout(() => { status.textContent = ''; }, 1000);
            }
        } catch (e) {
            console.error('Preview render error:', e);
            pagesContainer.innerHTML = '<p style="color: var(--color-danger);">Error rendering preview</p>';
        }
    }

    function autoGrowEditor() {
        if (!config.autoGrow || !editor) return;
        editor.style.height = 'auto';
        const minHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--page-min-height')) - 144;
        editor.style.height = Math.max(minHeight, editor.scrollHeight) + 'px';
    }

    function updateLineNumbers() {
        if (!lineNumbers || !editor) return;
        const lines = editor.value.split('\n').length;
        if (lineNumbers.childElementCount === lines) return;
        lineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => `<div>${i + 1}</div>`).join('');
    }

    function updateStats() {
        const text = editor.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        const readingTime = Math.ceil(words / 200);

        const wordEl = document.querySelector('#statusWords .statusbar__value');
        if (wordEl) wordEl.textContent = words;

        const charEl = document.querySelector('#statusChars .statusbar__value');
        if (charEl) charEl.textContent = chars;

        const readEl = document.querySelector('#statusReadingTime .statusbar__value');
        if (readEl) readEl.textContent = `${readingTime} min`;
    }

    function updateCursorPosition() {
        const text = editor.value;
        const pos = editor.selectionStart;
        const lines = text.substring(0, pos).split('\n');
        const lineNum = lines.length;
        const colNum = lines[lines.length - 1].length + 1;
        const lineEl = document.querySelector('#statusLines .statusbar__value');
        if (lineEl) lineEl.textContent = `Ln ${lineNum}, Col ${colNum}`;
    }

    function setupScrollSync() {
        if (!config.syncScroll) return;
        editorWrapper.addEventListener('scroll', () => {
            if (lastScrollSource === 'preview') { lastScrollSource = null; return; }
            lastScrollSource = 'editor';
            const percentage = editorWrapper.scrollTop / (editorWrapper.scrollHeight - editorWrapper.clientHeight);
            previewWrapper.scrollTop = percentage * (previewWrapper.scrollHeight - previewWrapper.clientHeight);
        });
        previewWrapper.addEventListener('scroll', () => {
            if (lastScrollSource === 'editor') { lastScrollSource = null; return; }
            lastScrollSource = 'preview';
            const percentage = previewWrapper.scrollTop / (previewWrapper.scrollHeight - previewWrapper.clientHeight);
            editorWrapper.scrollTop = percentage * (editorWrapper.scrollHeight - editorWrapper.clientHeight);
        });
    }

    function setupResizeHandle() {
        const handle = document.getElementById('resizeHandle');
        const container = document.getElementById('editorContainer');
        const previewPanel = document.getElementById('previewPanel');
        if (!handle || !container) return;
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = editorPanel.offsetWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const containerWidth = container.offsetWidth;
            const delta = e.clientX - startX;
            const newWidth = startWidth + delta;
            const minWidth = containerWidth * 0.2;
            const maxWidth = containerWidth * 0.8;
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                const percentage = (newWidth / containerWidth) * 100;
                editorPanel.style.width = `${percentage}%`;
                previewPanel.style.width = `${100 - percentage}%`;
            }
        });
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    function loadWelcomeContent() {
        const welcomeContent = `# Welcome to MDPad! 📝

MDPad is a beautiful, feature-rich markdown editor with **live multi-page view**.

## New in v2.0
- **Visual Pagination**: Long content is automatically split into visual pages.
- **Edit Page View**: Toggle edit mode (Ctrl+E) to type directly on the page!

## Getting Started

Start typing in the editor on the left and see your changes rendered instantly on the right!

### Text Formatting

- **Bold text** with \`**double asterisks**\`
- *Italic text* with \`*single asterisks*\`
- ~~Strikethrough~~ with \`~~double tildes~~\`
- \`Inline code\` with backticks

### Lists

1. Numbered lists are easy
2. Just start with numbers
3. And they auto-increment

- Bullet lists work too
- They use hyphens or asterisks
  - And can be nested
  - Like this

### Task Lists

- [x] Learn markdown basics
- [x] Try MDPad
- [ ] Create amazing documents

### Code Blocks

\`\`\`javascript
function greet(name) {
    console.log(\`Hello, \${name}!\`);
}

greet('World');
\`\`\`

### Blockquotes

> "The best way to predict the future is to create it."
> — *Peter Drucker*

### Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Live Preview | ✅ | Real-time rendering |
| Dark Mode | ✅ | Easy on the eyes |
| PDF Export | ✅ | Print-ready output |
| Pagination | ✅ | Visual page splitting |

### Links & Images

[Visit GitHub](https://github.com) for more markdown examples.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+K | Insert Link |
| Ctrl+S | Save |
| Ctrl+1/2/3 | Switch View |
| Ctrl+Z | Undo |
| Ctrl+E | Edit Page View |

---

*Start editing to create your own document!*
`;
        editor.value = welcomeContent;
        if (history) history.clear();
        renderPreview();
        updateStats();
        autoGrowEditor();
        updateLineNumbers();
    }

    function triggerInput() {
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    return {
        init,
        renderPreview,
        updateStats,
        toggleWYSIWYG
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    MDPad.init();
});
