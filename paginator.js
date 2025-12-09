/* =====================================================
   MDPad - Paginator
   Handles splitting content into visual pages
   ===================================================== */

const Paginator = (function () {
    'use strict';

    const PAGE_HEIGHT = 1056; // Approx A4 height at 96dpi (11in * 96)
    const PAGE_PADDING = 80;  // 40px top + 40px bottom
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

        // Create a temporary wrapper to parse HTML and measure elements
        const tempWrapper = document.createElement('div');
        tempWrapper.style.width = '210mm'; // A4 width
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
            // Clone to measure height without layout thrashing ideally, 
            // but we need them in document to measure.
            // We'll append to current page and see if it overflows.

            currentPage.appendChild(child);
            const childHeight = child.offsetHeight + getMarginHeight(child);

            // If element itself is taller than a page, we have to keep it here 
            // (or sophisticated splitting which is hard).
            // If it fits, we keep it. If it overflows, move to next page.

            // Check if adding this child exceeds content height
            // We use scrollHeight of the page text content area to check overflow
            if (currentHeight + childHeight > CONTENT_HEIGHT && currentHeight > 0) {
                // Remove from current page
                currentPage.removeChild(child);

                // Add current page to container
                container.appendChild(wrapPage(currentPage, pageCount));

                // Start new page
                pageCount++;
                currentPage = createPage(isEditable);
                currentPage.appendChild(child);
                currentHeight = childHeight;
            } else {
                currentHeight += childHeight;
            }
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
        pageContent.className = 'page-content';
        pageContent.contentEditable = isEditable;
        if (isEditable) {
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

        // Add footer/header visual if needed (optional)
        // const footer = document.createElement('div');
        // footer.className = 'page-footer';
        // footer.textContent = `Page ${pageNum}`;

        page.appendChild(content);
        // page.appendChild(footer);

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
