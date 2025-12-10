# Testing MDPad Multi-Page Preview

## Quick Start

1. **Make sure the server is running:**
   ```
   python -m http.server 8080
   ```
   (The server should already be running in the background)

2. **Open MDPad in your browser:**
   - Navigate to: http://localhost:8080

3. **Load the test document:**
   - Click "File" → "Open..."
   - Select `test-long-document.md` from the mdpad directory
   - Or copy the contents of that file and paste into the editor

4. **View the multi-page preview:**
   - Look at the preview panel on the right
   - You should see multiple pages stacked vertically
   - Each page has a white background with shadow
   - There's a 30px gap between pages
   - Scroll down to see all pages

## What to Expect

✅ **Multiple Pages**: The preview should show 3-4 separate pages
✅ **Vertical Layout**: Pages stack on top of each other (not side-by-side)
✅ **Page Gaps**: Clear spacing between each page
✅ **Page Shadows**: Each page has a subtle shadow effect
✅ **Automatic Breaks**: Content automatically flows to next page when full

## Alternative Test

If you want to test manually:

1. Start typing in the editor
2. Add multiple headings and paragraphs
3. Keep adding content and watch new pages appear automatically
4. Try this quick template:

```markdown
# Page 1 Content

[Add lots of paragraphs here...]

# Page 2 Content

[Add more paragraphs...]

# Page 3 Content

[Keep going...]
```

## Troubleshooting

**If you only see one page:**
- The document might not have enough content
- Try loading the `test-long-document.md` file
- Or add more content manually

**If pages don't look right:**
- Refresh the browser (Ctrl+R)
- Check browser console for errors (F12)

**If the server isn't running:**
```
cd c:\Users\sounn\Git\mdpad
python -m http.server 8080
```

---

The pagination feature is now working! Enjoy your Word-like multi-page preview! 📝
