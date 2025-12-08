/* =====================================================
   MDPad - File Operations
   Handles import, export, and file management
   ===================================================== */

const FileOps = (function () {
    'use strict';

    // File state
    let currentFileName = 'Untitled.md';
    let hasUnsavedChanges = false;
    let autoSaveInterval = null;

    // DOM Elements (will be set on init)
    let fileInput = null;
    let editor = null;

    /**
     * Initialize file operations
     */
    function init() {
        fileInput = document.getElementById('fileInput');
        editor = document.getElementById('editor');

        if (fileInput) {
            fileInput.addEventListener('change', handleFileOpen);
        }

        // Setup drag and drop
        setupDragAndDrop();

        // Load from localStorage if available
        loadFromLocalStorage();

        // Start auto-save
        startAutoSave();

        // Warn before leaving with unsaved changes
        window.addEventListener('beforeunload', handleBeforeUnload);
    }

    /**
     * Set up drag and drop functionality
     */
    function setupDragAndDrop() {
        const app = document.getElementById('app');

        if (!app) return;

        app.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            app.classList.add('drag-over');
        });

        app.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            app.classList.remove('drag-over');
        });

        app.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            app.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (isMarkdownFile(file)) {
                    readFile(file);
                } else {
                    showNotification('Please drop a markdown file (.md, .markdown, or .txt)', 'warning');
                }
            }
        });
    }

    /**
     * Check if file is a markdown file
     */
    function isMarkdownFile(file) {
        const validTypes = ['text/markdown', 'text/plain', 'text/x-markdown'];
        const validExtensions = ['.md', '.markdown', '.txt'];

        if (validTypes.includes(file.type)) return true;

        return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    }

    /**
     * Handle file input change
     */
    function handleFileOpen(e) {
        const file = e.target.files[0];
        if (file) {
            readFile(file);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    }

    /**
     * Read file contents
     */
    function readFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target.result;
            setEditorContent(content);
            setFileName(file.name);
            markAsSaved();
            showNotification(`Opened: ${file.name}`, 'success');
        };

        reader.onerror = () => {
            showNotification('Error reading file', 'error');
        };

        reader.readAsText(file);
    }

    /**
     * Set editor content
     */
    function setEditorContent(content) {
        if (editor) {
            editor.value = content;
            // Trigger input event for live preview
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    /**
     * Get editor content
     */
    function getEditorContent() {
        return editor ? editor.value : '';
    }

    /**
     * Set file name
     */
    function setFileName(name) {
        currentFileName = name;
        const docNameEl = document.getElementById('documentName');
        if (docNameEl) {
            docNameEl.textContent = name;
        }
    }

    /**
     * Get current file name
     */
    function getFileName() {
        return currentFileName;
    }

    /**
     * Create new document
     */
    function newDocument() {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Create a new document anyway?')) {
                return;
            }
        }

        setEditorContent('');
        setFileName('Untitled.md');
        markAsSaved();
        showNotification('New document created', 'success');
    }

    /**
     * Open file dialog
     */
    function openFile() {
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Save to localStorage
     */
    function saveToLocalStorage() {
        try {
            const data = {
                content: getEditorContent(),
                fileName: currentFileName,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem('mdpad_document', JSON.stringify(data));
            markAsSaved();
            showNotification('Saved to browser', 'success');
        } catch (e) {
            showNotification('Error saving to browser storage', 'error');
        }
    }

    /**
     * Load from localStorage
     */
    function loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('mdpad_document');
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                    setEditorContent(parsed.content);
                    setFileName(parsed.fileName || 'Untitled.md');
                    markAsSaved();
                }
            }
        } catch (e) {
            console.warn('Could not load from localStorage:', e);
        }
    }

    /**
     * Start auto-save interval
     */
    function startAutoSave() {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
        // Auto-save every 30 seconds if there are changes
        autoSaveInterval = setInterval(() => {
            if (hasUnsavedChanges) {
                try {
                    const data = {
                        content: getEditorContent(),
                        fileName: currentFileName,
                        savedAt: new Date().toISOString()
                    };
                    localStorage.setItem('mdpad_document', JSON.stringify(data));
                    // Don't mark as saved for auto-save to keep indicator showing
                } catch (e) {
                    console.warn('Auto-save failed:', e);
                }
            }
        }, 30000);
    }

    /**
     * Download as markdown file
     */
    function downloadMarkdown() {
        const content = getEditorContent();
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName.endsWith('.md') ? currentFileName : currentFileName + '.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification(`Downloaded: ${a.download}`, 'success');
    }

    /**
     * Export to PDF
     */
    function exportToPDF() {
        const preview = document.getElementById('preview');
        if (!preview) {
            showNotification('Preview not available', 'error');
            return;
        }

        // Check if html2pdf is available
        if (typeof html2pdf === 'undefined') {
            showNotification('PDF library not loaded', 'error');
            return;
        }

        showNotification('Generating PDF...', 'info');

        const opt = {
            margin: [0.75, 0.75, 0.75, 0.75],
            filename: currentFileName.replace(/\.md$/, '') + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // Clone preview for PDF generation
        const clone = preview.cloneNode(true);

        html2pdf()
            .set(opt)
            .from(clone)
            .save()
            .then(() => {
                showNotification('PDF exported successfully', 'success');
            })
            .catch((err) => {
                console.error('PDF export error:', err);
                showNotification('Error exporting PDF', 'error');
            });
    }

    /**
     * Print document
     */
    function printDocument() {
        window.print();
    }

    /**
     * Mark document as having unsaved changes
     */
    function markAsUnsaved() {
        hasUnsavedChanges = true;
        updateSavedIndicator(false);
    }

    /**
     * Mark document as saved
     */
    function markAsSaved() {
        hasUnsavedChanges = false;
        updateSavedIndicator(true);
    }

    /**
     * Update saved indicator in status bar
     */
    function updateSavedIndicator(isSaved) {
        const statusItem = document.getElementById('statusSaved');
        if (!statusItem) return;

        const indicator = statusItem.querySelector('.statusbar__indicator');
        const value = statusItem.querySelector('.statusbar__value');

        if (indicator) {
            indicator.classList.toggle('statusbar__indicator--saved', isSaved);
            indicator.classList.toggle('statusbar__indicator--unsaved', !isSaved);
        }

        if (value) {
            value.textContent = isSaved ? 'Saved' : 'Unsaved';
        }
    }

    /**
     * Handle before unload
     */
    function handleBeforeUnload(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        let container = document.getElementById('notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications';
            container.style.cssText = `
                position: fixed;
                bottom: 40px;
                right: 20px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 8px;
            `;
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.style.cssText = `
            padding: 12px 16px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideIn 0.3s ease;
        `;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
        container.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Public API
    return {
        init,
        newDocument,
        openFile,
        saveToLocalStorage,
        downloadMarkdown,
        exportToPDF,
        printDocument,
        markAsUnsaved,
        markAsSaved,
        getEditorContent,
        setEditorContent,
        getFileName,
        setFileName,
        showNotification
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    FileOps.init();
});
