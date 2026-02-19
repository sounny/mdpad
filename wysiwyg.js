/* =====================================================
   MDPad - WYSIWYG Manager
   Handles text-to-markdown syncing
   ===================================================== */

const WYSIWYG = (function () {
    'use strict';

    let turndownService = null;
    let isEnabled = false;
    let editor = null;
    /** Saved Range so toolbar clicks don't lose the selection */
    let savedRange = null;

    /**
     * Initialize WYSIWYG
     */
    function init(editorInstance) {
        editor = editorInstance;

        if (typeof TurndownService !== 'undefined') {
            turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced'
            });
            // Rule for Task Lists
            turndownService.addRule('taskList', {
                filter: function (node) {
                    return node.nodeName === 'LI' && node.classList.contains('task-list-item');
                },
                replacement: function (content, node) {
                    const checkbox = node.querySelector('input[type="checkbox"]');
                    const symbol = checkbox && checkbox.checked ? '[x]' : '[ ]';
                    return '- ' + symbol + ' ' + content.trim() + '\n';
                }
            });

            // Rule to clean up highlight.js spans in code blocks
            turndownService.addRule('highlightJS', {
                filter: function (node) {
                    return node.nodeName === 'PRE' && node.querySelector('code');
                },
                replacement: function (content, node) {
                    const code = node.querySelector('code');
                    const langMatch = code.className.match(/language-(\w+)/) || code.className.match(/hljs\s+(\w+)/);
                    const lang = langMatch ? langMatch[1] : '';
                    return '\n```' + lang + '\n' + code.innerText + '\n```\n';
                }
            });
        } else {
            console.error('TurndownService is missing');
        }

        // ── Selection Preservation ──────────────────────────────────────
        // When user mousedowns on a toolbar button (or any non-pages element)
        // while WYSIWYG is active, save the current selection so we can
        // restore it before executing formatting commands.
        const toolbarMain   = document.getElementById('mainToolbar');
        const toolbarFormat = document.getElementById('formatToolbar');

        function saveOnMousedown(e) {
            if (!isEnabled) return;
            const pages = document.getElementById('pagesContainer');
            if (pages && pages.contains(e.target)) return; // click is inside pages – no need to save
            saveSelection();
        }

        if (toolbarMain)   toolbarMain.addEventListener('mousedown',   saveOnMousedown);
        if (toolbarFormat) toolbarFormat.addEventListener('mousedown', saveOnMousedown);
    }

    /**
     * Save the current window selection as a Range.
     */
    function saveSelection() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedRange = sel.getRangeAt(0).cloneRange();
        }
    }

    /**
     * Restore the previously saved selection.
     * @returns {boolean} true if a selection was restored
     */
    function restoreSelection() {
        if (!savedRange) return false;
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
        return true;
    }

    /**
     * Convert HTML content of all pages back to Markdown
     * @param {HTMLElement} container - Container holding all .page elements
     */
    function getMarkdown(container) {
        if (!turndownService) return '';

        // Aggregate HTML from all pages
        const pages = container.querySelectorAll('.page-content');
        const htmlParts = [];
        pages.forEach(page => {
            htmlParts.push(page.innerHTML);
        });

        const fullHtml = htmlParts.join('\n\n');

        // Convert to Markdown
        return turndownService.turndown(fullHtml);
    }

    /**
     * Setup event listeners for pages
     * @param {HTMLElement} container 
     * @param {Function} onUpdate - Callback when content changes
     */
    function setupListeners(container, onUpdate) {
        // Handle text input
        container.addEventListener('input', (e) => {
            if (!isEnabled) return;
            const md = getMarkdown(container);
            onUpdate(md);
        });

        // Handle checkbox clicks for task lists
        container.addEventListener('change', (e) => {
            if (!isEnabled) return;
            if (e.target.type === 'checkbox' && e.target.closest('.task-list-item')) {
                // Turndown will pick up the checkbox state from the DOM
                const md = getMarkdown(container);
                onUpdate(md);
            }
        });

        // Save selection whenever user releases mouse or lifts a key, so
        // we always have a fresh snapshot for the toolbar to restore.
        container.addEventListener('mouseup', saveSelection);
        container.addEventListener('keyup',   saveSelection);
    }

    return {
        init,
        setupListeners,
        saveSelection,
        restoreSelection,
        get isEnabled() { return isEnabled; },
        set isEnabled(val) { isEnabled = val; }
    };
})();
