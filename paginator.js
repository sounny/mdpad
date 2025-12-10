/* =====================================================
   MDPad - Paginator
   Handles splitting content into visual pages
   ===================================================== */

const Paginator = (function () {
    'use strict';

    const PAGE_HEIGHT = 1056; // Approx A4 height at 96dpi (11in * 96)
    const PAGE_PADDING = 144;  // 72px top + 72px bottom (total)
    const CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING;

    /**
     * Split HTML content into pages
     * @param {string} html - Full HTML string to paginate
     * @param {HTMLElement} container - Container to render pages into
     * @param {boolean} isEditable - Whether pages should be contenteditable
     */
    function paginate(html, container, isEditable = false) {
        // Clear container
        container.innerHTML = '';

        if (!html || html.trim() === '') {
            // Create an empty page
            container.appendChild(wrapPage(createPage(isEditable), 1));
            return;
        }

        // Create a temporary wrapper to parse HTML and measure elements
        const tempWrapper = document.createElement('div');
        tempWrapper.className = 'page-content markdown-body';
        tempWrapper.style.width = '816px'; // Match page width
        tempWrapper.style.padding = '72px'; // Match page padding
        tempWrapper.style.visibility = 'hidden';
        tempWrapper.style.position = 'absolute';
        tempWrapper.style.top = '-9999px';
        tempWrapper.innerHTML = html;
        document.body.appendChild(tempWrapper);

        let currentPage = createPage(isEditable);
        let currentHeight = 0;
        let pageCount = 1;

        // Iterate through top-level elements
        const children = Array.from(tempWrapper.children);

        children.forEach(child => {
            // Clone the child to measure it
            const clone = child.cloneNode(true);
            tempWrapper.appendChild(clone);
            
            // Measure the cloned element
            const childHeight = clone.offsetHeight + getMarginHeight(clone);
            
            // Remove the clone
            tempWrapper.removeChild(clone);

            // Check if adding this child exceeds content height
            if (currentHeight + childHeight > CONTENT_HEIGHT && currentHeight > 0) {
                // Add current page to container
                container.appendChild(wrapPage(currentPage, pageCount));

                // Start new page
                pageCount++;
                currentPage = createPage(isEditable);
                currentHeight = 0;
            }

            // Move the actual child to the current page
            currentPage.appendChild(child.cloneNode(true));
            currentHeight += childHeight;
        });

        // Append final page
        container.appendChild(wrapPage(currentPage, pageCount));

        // Cleanup
        document.body.removeChild(tempWrapper);
    }

    /**
     * Create a page content element
     */
    function createPage(isEditable) {
        const pageContent = document.createElement('div');
        pageContent.className = 'page-content markdown-body';
        if (isEditable) {
            pageContent.contentEditable = true;
            pageContent.classList.add('page-content--editable');
        }
        return pageContent;
    }

    /**
     * Wrap page content in the visual page structure
     */
    function wrapPage(content, pageNum) {
        const page = document.createElement('div');
        page.className = 'page page--preview';
        page.dataset.page = pageNum;
        page.appendChild(content);
        return page;
    }

    /**
     * Get vertical margins of an element
     */
    function getMarginHeight(element) {
        const style = window.getComputedStyle(element);
        return parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    }

    return {
        paginate
    };
})();
