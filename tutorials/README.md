# Tutorials Structure

This directory contains standalone tutorial pages that can be linked from YouTube descriptions or other platforms.

## Build System

Tutorials are now generated programmatically from a JSON configuration file. This ensures consistency and makes it easy to add new tutorials.

### Quick Start

1. **Add your tutorial data** to `tutorials/data.json`
2. **Run the build script**: `npm run build:tutorials`
3. **Commit and push** - the GitHub workflow will automatically build and deploy

## Structure

```
tutorials/
  data.json              # All tutorial metadata
  tutorial-template.html # HTML template for tutorials
  tutorial-styles.css    # Shared styles
  tutorial-script.js     # Shared JavaScript
  tutorial-name/         # Generated tutorial folder
    index.html          # Generated HTML (do not edit manually)
    assets/             # Tutorial-specific assets
      hero-image.png
      file1.zip
      ...
```

## Creating a New Tutorial

### Step 1: Add Tutorial Data

Edit `tutorials/data.json` and add a new entry to the `tutorials` array:

```json
{
  "slug": "my-awesome-tutorial",
  "title": "My Awesome Tutorial",
  "subtitle": "Learn how to create something amazing",
  "description": "SEO description for search engines",
  "heroImage": {
    "enabled": true,
    "src": "assets/hero-image.png",
    "alt": "Description of hero image"
  },
  "credits": [
    {
      "name": "artistname",
      "instagram": "artistname"
    }
  ],
  "video": {
    "enabled": true,
    "youtubeId": "YOUR_YOUTUBE_ID",
    "title": "YouTube video player"
  },
  "assets": [
    {
      "name": "Asset Name",
      "path": "assets/file.zip",
      "size": "2.5 MB",
      "icon": "📦"
    }
  ],
  "content": {
    "type": "html",
    "body": "<p>Optional custom HTML content</p>"
  }
}
```

### Step 2: Create Assets Folder

Create a folder for your tutorial assets:

```bash
mkdir -p tutorials/my-awesome-tutorial/assets
```

Add your assets (images, files, etc.) to this folder.

### Step 3: Build

Run the build script:

```bash
npm run build:tutorials
```

This will generate `tutorials/my-awesome-tutorial/index.html` from the template.

### Step 4: Test Locally

Open the generated HTML file in your browser or use a local server to test.

## Configuration Options

### Required Fields
- `slug`: URL-friendly identifier (e.g., "my-tutorial")
- `title`: Main tutorial title

### Optional Fields
- `subtitle`: Brief description shown below title
- `description`: Meta description for SEO
- `heroImage`: Hero image configuration
  - `enabled`: `true`/`false`
  - `src`: Path to image (relative to tutorial folder)
  - `alt`: Alt text for accessibility
- `credits`: Array of credit objects
  - `name`: Display name (shown as @name)
  - `instagram`: Instagram username (for link)
- `video`: YouTube video configuration
  - `enabled`: `true`/`false`
  - `youtubeId`: YouTube video ID (from URL)
  - `title`: Iframe title attribute
- `assets`: Array of downloadable assets
  - `name`: Display name
  - `path`: File path (relative to tutorial folder)
  - `size`: Human-readable file size
  - `icon`: Emoji or icon character
- `content.body`: Optional HTML content to insert before assets section

## URL Structure

Your tutorials will be accessible at:
- `https://g3n0m4.xyz/tutorials/tutorial-slug/`

Perfect for sharing in YouTube descriptions!

## Manual Editing (Not Recommended)

If you need to manually edit a generated tutorial page, you can do so, but your changes will be overwritten the next time you run the build script. Instead, update `data.json` and rebuild.

## Example

See `tutorials/data.json` for the complete example of the "Holographic card" tutorial.
