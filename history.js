/* =====================================================
   MDPad - History Manager
   Robust undo/redo stack for the editor
   ===================================================== */

class HistoryManager {
    constructor(editor, limit = 100) {
        this.editor = editor;
        this.limit = limit;
        this.stack = [];
        this.currentIndex = -1;
        this.isLocked = false;

        // Initial state
        this.pushState();
    }

    /**
     * Push current editor state to history
     */
    pushState() {
        if (this.isLocked) return;

        const state = {
            content: this.editor.value,
            selectionStart: this.editor.selectionStart,
            selectionEnd: this.editor.selectionEnd,
            timestamp: Date.now()
        };

        // If we're not at the end of the stack, truncate the future
        if (this.currentIndex < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.currentIndex + 1);
        }

        // Add new state
        this.stack.push(state);
        this.currentIndex++;

        // Maintain limit
        if (this.stack.length > this.limit) {
            this.stack.shift();
            this.currentIndex--;
        }
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.restoreState(this.stack[this.currentIndex]);
            return true;
        }
        return false;
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.currentIndex < this.stack.length - 1) {
            this.currentIndex++;
            this.restoreState(this.stack[this.currentIndex]);
            // Re-render preview since content changed without input event sometimes
            this.editor.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
        }
        return false;
    }

    /**
     * Restore specific state
     */
    restoreState(state) {
        if (!state) return;

        this.isLocked = true; // Prevent pushing state during restore

        this.editor.value = state.content;
        this.editor.setSelectionRange(state.selectionStart, state.selectionEnd);
        this.editor.focus();

        this.isLocked = false;

        // Trigger generic input to update preview, but maybe mark as "history-restore"
        // to prevent duplicate pushes if we had auto-push on input (which we should debounce)
        const event = new Event('input', { bubbles: true });
        event.isHistoryRestore = true;
        this.editor.dispatchEvent(event);
    }

    /**
     * Clear history (e.g. on new document)
     */
    clear() {
        this.stack = [];
        this.currentIndex = -1;
        this.pushState();
    }
}
