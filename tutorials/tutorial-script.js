// Tutorial Assets Download Script
// Configure your assets in the assets array below

const assets = [
    {
        name: "Example File 1",
        path: "assets/example-file-1.zip",
        size: "2.5 MB",
        icon: "📦"
    },
    {
        name: "Example File 2",
        path: "assets/example-file-2.pdf",
        size: "1.2 MB",
        icon: "📄"
    },
    {
        name: "Example File 3",
        path: "assets/example-file-3.zip",
        size: "5.8 MB",
        icon: "📁"
    }
];

// Get the current tutorial directory name
function getTutorialDir() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(part => part);
    // Find 'tutorials' in the path and get the next part
    const tutorialsIndex = parts.indexOf('tutorials');
    if (tutorialsIndex !== -1 && parts[tutorialsIndex + 1]) {
        return parts[tutorialsIndex + 1];
    }
    return null;
}

// Render assets
function renderAssets() {
    const container = document.getElementById('assetsContainer');
    if (!container) return;

    const tutorialDir = getTutorialDir();
    
    if (assets.length === 0) {
        container.innerHTML = '<p style="color: var(--secondary-color);">No assets available for this tutorial.</p>';
        return;
    }

    container.innerHTML = assets.map(asset => {
        // Construct the correct path relative to the tutorial directory
        const assetPath = tutorialDir 
            ? `./${tutorialDir}/${asset.path}`
            : asset.path;
        
        return `
            <a href="${assetPath}" download class="asset-button">
                <span class="asset-icon">${asset.icon}</span>
                <span class="asset-name">${asset.name}</span>
                <span class="asset-size">${asset.size}</span>
            </a>
        `;
    }).join('');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', renderAssets);
