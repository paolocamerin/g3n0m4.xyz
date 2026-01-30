# Tutorial Admin Interface

This is a local backoffice interface for managing tutorials. **This folder is not deployed** - it's for local use only.

## Usage

1. **Start a local server** (required for loading data.json):
   ```bash
   # From project root
   python3 -m http.server 8080
   # Or use any other local server
   ```

2. **Open the admin interface**:
   ```
   http://localhost:8080/admin/
   ```

3. **Load existing tutorials**:
   - Click "🔄 Reload from data.json" to load existing tutorials
   - Or use "📤 Load from data.json" to manually select the file

4. **Create/Edit tutorials**:
   - Click "➕ New Tutorial" to create a new one
   - Click "✏️ Edit" on any existing tutorial to modify it
   - Fill in all the fields
   - Click "💾 Save Tutorial" to add it to the list

5. **Export**:
   - Click "📥 Download data.json" to download the updated JSON file
   - Replace `tutorials/data.json` with the downloaded file
   - Run `npm run build:tutorials` to generate the HTML pages

## Features

- ✅ Create new tutorials with all fields
- ✅ Edit existing tutorials
- ✅ Delete tutorials
- ✅ Manage credits (multiple Instagram credits)
- ✅ Manage assets (multiple downloadable files)
- ✅ Preview JSON before saving
- ✅ Load from existing data.json
- ✅ Download updated data.json

## File Structure

```
admin/
  index.html    # Admin interface
  admin.js      # Admin logic
  README.md     # This file
```

## Note

The admin interface doesn't handle file uploads directly. You'll need to:
1. Create the tutorial folder manually: `tutorials/[slug]/assets/`
2. Add your asset files to that folder
3. Reference them in the admin interface (e.g., `assets/hero.png`)
