# Tutorials Structure

This directory contains standalone tutorial pages that can be linked from YouTube descriptions or other platforms.

## Structure

Each tutorial should be organized as follows:

```
tutorials/
  tutorial-name/
    index.html          # The tutorial page
    assets/             # Tutorial-specific assets
      hero-image.png    # Optional hero image
      file1.zip
      file2.pdf
      ...
```

## Creating a New Tutorial

1. **Create a new folder** in the `tutorials/` directory with a URL-friendly name (e.g., `my-awesome-tutorial`)

2. **Copy the template** or create a new `index.html` file based on `example-tutorial/index.html`

3. **Update the paths** in your `index.html`:
   - CSS: `../../styles.css` and `../tutorial-styles.css`
   - Script: `../tutorial-script.js`

4. **Create an assets folder** inside your tutorial folder

5. **Add a hero image (optional)** by adding the hero image section after the header:
```html
<div class="hero-image-section">
    <img src="assets/hero-image.png" alt="Tutorial hero image" class="hero-image">
</div>
```
   - Place your hero image in the `assets/` folder
   - Remove this section if you don't need a hero image

6. **Add your assets** to the `assets/` folder

7. **Configure assets in your HTML** by adding a script section that defines the assets array:

```javascript
<script>
    const assets = [
        {
            name: "Asset Name",
            path: "assets/your-file.zip",
            size: "2.5 MB",
            icon: "📦"
        }
    ];
    
    // Render assets
    document.addEventListener('DOMContentLoaded', function() {
        const container = document.getElementById('assetsContainer');
        if (!container) return;
        
        container.innerHTML = assets.map(asset => {
            return `
                <a href="${asset.path}" download class="asset-button">
                    <span class="asset-icon">${asset.icon}</span>
                    <span class="asset-name">${asset.name}</span>
                    <span class="asset-size">${asset.size}</span>
                </a>
            `;
        }).join('');
    });
</script>
```

## URL Structure

Your tutorials will be accessible at:
- `https://g3n0m4.xyz/tutorials/tutorial-name/`

Perfect for sharing in YouTube descriptions!

## Example

See `example-tutorial/` for a complete example.
