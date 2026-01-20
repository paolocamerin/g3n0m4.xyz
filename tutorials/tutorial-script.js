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

// Render assets using safe DOM methods (prevents XSS)
function renderAssets() {
    const container = document.getElementById('assetsContainer');
    if (!container) return;

    const tutorialDir = getTutorialDir();
    
    // Clear container safely
    container.textContent = '';
    
    if (assets.length === 0) {
        const msg = document.createElement('p');
        msg.style.color = 'var(--secondary-color)';
        msg.textContent = 'No assets available for this tutorial.';
        container.appendChild(msg);
        return;
    }

    assets.forEach(asset => {
        // Construct the correct path relative to the tutorial directory
        const assetPath = tutorialDir 
            ? `./${tutorialDir}/${asset.path}`
            : asset.path;
        
        const link = document.createElement('a');
        link.href = assetPath;
        link.download = '';
        link.className = 'asset-button';
        
        const icon = document.createElement('span');
        icon.className = 'asset-icon';
        icon.textContent = asset.icon;
        
        const name = document.createElement('span');
        name.className = 'asset-name';
        name.textContent = asset.name;
        
        const size = document.createElement('span');
        size.className = 'asset-size';
        size.textContent = asset.size;
        
        link.append(icon, name, size);
        container.appendChild(link);
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', renderAssets);
