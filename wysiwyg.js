/* =====================================================
   MDPad - WYSIWYG Manager
   Handles text-to-markdown syncing
   ===================================================== */

const WYSIWYG = (function () {
    'use strict';

    let turndownService = null;
    let isEnabled = false;
    let editor = null;

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
            // Configure tables support if plugin available, standard doesn't support generic tables well
            // For MVP v2.0, standard turndown handles basic blocks.
        } else {
            console.error('TurndownService is missing');
        }
    }

    /**
     * Convert HTML content of all pages back to Markdown
     * @param {HTMLElement} container - Container holding all .page elements
     */
    function getMarkdown(container) {
        if (!turndownService) return '';

        // Aggregate HTML from all pages
        const pages = container.querySelectorAll('.page-content');
        let fullHtml = '';
        pages.forEach(page => {
            fullHtml += page.innerHTML + '\n';
        });

        // Convert to Markdown
        return turndownService.turndown(fullHtml);
    }

    /**
     * Setup event listeners for pages
     * @param {HTMLElement} container 
     * @param {Function} onUpdate - Callback when content changes
     */
    function setupListeners(container, onUpdate) {
        // We use event delegation on the container
        container.addEventListener('input', (e) => {
            if (!isEnabled) return;

            // Debounce or immediate? Let callback handle it.
            // Pushing to callback: (newMarkdown) => {}
            const md = getMarkdown(container);
            onUpdate(md);
        });
    }

    return {
        init,
        setupListeners,
        get isEnabled() { return isEnabled; },
        set isEnabled(val) { isEnabled = val; }
    };
})();
