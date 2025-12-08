# MDPad - Agent Guidelines

## Project Overview
MDPad is a vanilla HTML/CSS/JavaScript markdown notepad application with live preview, Word-like page view, and comprehensive editing tools. **No frameworks, no build step required.**

## Technology Stack
- **HTML5**: Semantic structure
- **CSS3**: Modern styling with custom properties, flexbox, grid
- **Vanilla JavaScript**: ES6+ modules
- **External CDN Libraries**:
  - `marked.js` - Markdown parsing
  - `html2pdf.js` - PDF export
  - `highlight.js` - Syntax highlighting for code blocks

## File Structure
```
mdpad/
├── index.html      # Main HTML entry point
├── styles.css      # All styling (design system + components)
├── app.js          # Core editor/preview logic
├── toolbar.js      # Toolbar functionality & formatting
├── file-ops.js     # File import/export operations
├── AGENTS.md       # This file - agent guidelines
└── README.md       # User documentation
```

## Key Design Decisions

### 1. Page View (Word-like)
- Document is rendered as a centered white "page" with shadow
- Uses A4/Letter-like dimensions for familiar document feel
- Pages should have visible margins and proper typography

### 2. View Modes
- **Raw**: Full editor, markdown source only
- **Preview**: Full rendered preview, read-only
- **Split**: Side-by-side editor and preview (default)

### 3. Live Preview
- Preview updates in real-time as user types
- Debounced (300ms delay) to prevent lag on fast typing
- Scroll sync between editor and preview in split mode

### 4. Toolbar Architecture
- **Main Toolbar**: File operations (New, Open, Save, Export)
- **Formatting Toolbar**: Quick formatting buttons (Bold, Italic, Headings)
- Both toolbars are responsive and collapse on mobile

### 5. File Operations
- All operations are client-side only (no server)
- Uses Blob API for downloads
- Uses FileReader API for imports
- LocalStorage for auto-save and recovery

## Code Style Guidelines

### CSS
- Use CSS custom properties for theming
- Mobile-first responsive design
- Prefer flexbox/grid over floats
- Use BEM-like naming: `.toolbar__button`, `.editor__content`

### JavaScript
- Use ES6+ features (const/let, arrow functions, template literals)
- Avoid global variables - use module pattern or IIFE
- Event delegation where appropriate
- Prefer async/await for any async operations

### HTML
- Semantic elements (main, nav, article, section)
- Accessible (ARIA labels, keyboard navigation)
- Unique IDs for all interactive elements

## Testing Approach
- Manual browser testing (Chrome, Firefox, Edge)
- Test responsive breakpoints
- Verify file operations work correctly
- Check localStorage persistence

## Common Tasks

### Adding a New Toolbar Button
1. Add button HTML in `index.html` within the toolbar section
2. Add styling in `styles.css` under toolbar button styles
3. Add click handler in `toolbar.js`
4. If it inserts markdown, use the `insertAtCursor()` utility

### Modifying the Page Layout
1. Edit `.page` and `.page-container` styles in `styles.css`
2. Test with different content lengths
3. Verify print/PDF export still works

### Adding Keyboard Shortcuts
1. Add event listener in `app.js` for `keydown`
2. Check for modifier keys (Ctrl/Cmd)
3. Call appropriate toolbar function
4. Prevent default browser behavior where needed
