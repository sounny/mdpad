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

    // DOM Elements
    let editor = null;
    let preview = null;
    let editorWrapper = null;
    let previewWrapper = null;

    /**
     * Initialize the application
     */
    function init() {
        // Get DOM elements
        editor = document.getElementById('editor');
        preview = document.getElementById('preview');
        editorWrapper = document.getElementById('editorWrapper');
        previewWrapper = document.getElementById('previewWrapper');

        if (!editor || !preview) {
            console.error('Required elements not found');
            return;
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

        // Custom renderer for better output
        const renderer = new marked.Renderer();

        // Add syntax highlighting for code blocks
        renderer.code = function (code, language) {
            let highlighted = code;

            if (typeof hljs !== 'undefined' && language && hljs.getLanguage(language)) {
                try {
                    highlighted = hljs.highlight(code, { language }).value;
                } catch (e) {
                    console.warn('Highlight error:', e);
                }
            } else if (typeof hljs !== 'undefined') {
                try {
                    highlighted = hljs.highlightAuto(code).value;
                } catch (e) {
                    console.warn('Highlight error:', e);
                }
            }

            return `<pre><code class="hljs ${language || ''}">${highlighted}</code></pre>`;
        };

        // Make links open in new tab
        renderer.link = function (href, title, text) {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
        };

        // Task list support
        renderer.listitem = function (text, task, checked) {
            if (task) {
                return `<li class="task-list-item"><input type="checkbox" ${checked ? 'checked' : ''} disabled> ${text}</li>`;
            }
            return `<li>${text}</li>`;
        };

        // Configure marked options
        marked.setOptions({
            renderer: renderer,
            gfm: true,           // GitHub Flavored Markdown
            breaks: true,        // Convert \n to <br>
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
        // Input event for live preview
        editor.addEventListener('input', () => {
            debouncePreview();
            updateStats();
            autoGrowEditor();
            FileOps.markAsUnsaved();
        });

        // Track cursor position
        editor.addEventListener('keyup', updateCursorPosition);
        editor.addEventListener('click', updateCursorPosition);
        editor.addEventListener('select', updateCursorPosition);

        // Tab key handling
        editor.addEventListener('keydown', handleTabKey);

        // Auto-pairs
        editor.addEventListener('keydown', handleAutoPairs);
    }

    /**
     * Handle tab key for indentation
     */
    function handleTabKey(e) {
        if (e.key === 'Tab') {
            e.preventDefault();

            const start = editor.selectionStart;
            const end = editor.selectionEnd;

            if (e.shiftKey) {
                // Outdent - remove leading spaces/tab
                const text = editor.value;
                let lineStart = start;
                while (lineStart > 0 && text[lineStart - 1] !== '\n') {
                    lineStart--;
                }

                const lineText = text.substring(lineStart, end);
                const outdented = lineText.replace(/^(\t|  )/, '');
                const diff = lineText.length - outdented.length;

                editor.setRangeText(outdented, lineStart, end, 'end');
                editor.setSelectionRange(Math.max(lineStart, start - diff), end - diff);
            } else {
                // Indent - add two spaces
                editor.setRangeText('  ', start, end, 'end');
            }

            triggerInput();
        }
    }

    /**
     * Handle auto-pairs (brackets, quotes, etc.)
     */
    function handleAutoPairs(e) {
        const pairs = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            "'": "'",
            '`': '`',
            '*': '*',
            '_': '_'
        };

        if (pairs[e.key]) {
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const selectedText = editor.value.substring(start, end);

            // Only wrap if there's a selection
            if (selectedText && ['*', '_', '`', '"', "'"].includes(e.key)) {
                e.preventDefault();
                const wrapped = e.key + selectedText + pairs[e.key];
                editor.setRangeText(wrapped, start, end, 'select');
                triggerInput();
            }
        }
    }

    /**
     * Debounced preview update
     */
    function debouncePreview() {
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(renderPreview, config.previewDelay);
    }

    /**
     * Render markdown preview
     */
    function renderPreview() {
        if (!editor || !preview) return;

        try {
            const markdown = editor.value;
            const html = marked.parse(markdown);
            preview.innerHTML = html;

            // Re-apply syntax highlighting to any code blocks
            preview.querySelectorAll('pre code').forEach((block) => {
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(block);
                }
            });

            // Update preview status
            const status = document.getElementById('previewStatus');
            if (status) {
                status.textContent = 'Updated';
                setTimeout(() => { status.textContent = ''; }, 1000);
            }
        } catch (e) {
            console.error('Preview render error:', e);
            preview.innerHTML = '<p style="color: var(--color-danger);">Error rendering preview</p>';
        }
    }

    /**
     * Auto-grow editor textarea
     */
    function autoGrowEditor() {
        if (!config.autoGrow || !editor) return;

        editor.style.height = 'auto';
        const minHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--page-min-height')) - 144;
        editor.style.height = Math.max(minHeight, editor.scrollHeight) + 'px';
    }

    /**
     * Update word/character counts
     */
    function updateStats() {
        const text = editor.value;

        // Word count
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const wordEl = document.querySelector('#statusWords .statusbar__value');
        if (wordEl) wordEl.textContent = words;

        // Character count
        const chars = text.length;
        const charEl = document.querySelector('#statusChars .statusbar__value');
        if (charEl) charEl.textContent = chars;
    }

    /**
     * Update cursor position display
     */
    function updateCursorPosition() {
        const text = editor.value;
        const pos = editor.selectionStart;

        // Calculate line number
        const lines = text.substring(0, pos).split('\n');
        const lineNum = lines.length;
        const colNum = lines[lines.length - 1].length + 1;

        const lineEl = document.querySelector('#statusLines .statusbar__value');
        if (lineEl) {
            lineEl.textContent = `Ln ${lineNum}, Col ${colNum}`;
        }
    }

    /**
     * Setup scroll sync between editor and preview
     */
    function setupScrollSync() {
        if (!config.syncScroll) return;

        editorWrapper.addEventListener('scroll', () => {
            if (lastScrollSource === 'preview') {
                lastScrollSource = null;
                return;
            }
            lastScrollSource = 'editor';

            const percentage = editorWrapper.scrollTop / (editorWrapper.scrollHeight - editorWrapper.clientHeight);
            previewWrapper.scrollTop = percentage * (previewWrapper.scrollHeight - previewWrapper.clientHeight);
        });

        previewWrapper.addEventListener('scroll', () => {
            if (lastScrollSource === 'editor') {
                lastScrollSource = null;
                return;
            }
            lastScrollSource = 'preview';

            const percentage = previewWrapper.scrollTop / (previewWrapper.scrollHeight - previewWrapper.clientHeight);
            editorWrapper.scrollTop = percentage * (editorWrapper.scrollHeight - editorWrapper.clientHeight);
        });
    }

    /**
     * Setup resize handle for split view
     */
    function setupResizeHandle() {
        const handle = document.getElementById('resizeHandle');
        const container = document.getElementById('editorContainer');
        const editorPanel = document.getElementById('editorPanel');
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

            // Constrain between 20% and 80%
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

    /**
     * Load welcome content
     */
    function loadWelcomeContent() {
        const welcomeContent = `# Welcome to MDPad! 📝

MDPad is a beautiful, feature-rich markdown editor with **live preview** and a Word-like page view.

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
| Keyboard Shortcuts | ✅ | Power user features |

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

---

*Start editing to create your own document!*
`;
        editor.value = welcomeContent;
        renderPreview();
        updateStats();
        autoGrowEditor();
    }

    /**
     * Trigger input event
     */
    function triggerInput() {
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Public API
    return {
        init,
        renderPreview,
        updateStats
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    MDPad.init();
});

// Add notification animation styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    .drag-over {
        outline: 3px dashed var(--color-primary) !important;
        outline-offset: -3px;
    }
`;
document.head.appendChild(notificationStyles);
