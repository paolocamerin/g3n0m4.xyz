// Tutorial Admin Interface
// This file handles the admin interface for managing tutorials

let tutorials = [];
let currentEditIndex = -1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('heroEnabled').addEventListener('change', toggleHeroFields);
    document.getElementById('videoEnabled').addEventListener('change', toggleVideoFields);
    
    // Close modal when clicking outside or pressing Escape
    const modal = document.getElementById('saveModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeSaveModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeSaveModal();
            }
        });
    }
    
    loadTutorials();
});

function toggleHeroFields() {
    const enabled = document.getElementById('heroEnabled').checked;
    document.getElementById('heroFields').classList.toggle('hidden', !enabled);
}

function toggleVideoFields() {
    const enabled = document.getElementById('videoEnabled').checked;
    document.getElementById('videoFields').classList.toggle('hidden', !enabled);
}

function showNewTutorialForm() {
    currentEditIndex = -1;
    document.getElementById('formTitle').textContent = 'New Tutorial';
    document.getElementById('tutorialForm').classList.remove('hidden');
    clearForm();
    document.getElementById('slug').focus();
}

function clearForm() {
    document.getElementById('slug').value = '';
    document.getElementById('title').value = '';
    document.getElementById('subtitle').value = '';
    document.getElementById('description').value = '';
    document.getElementById('heroEnabled').checked = false;
    document.getElementById('heroSrc').value = '';
    document.getElementById('heroAlt').value = '';
    document.getElementById('videoEnabled').checked = false;
    document.getElementById('youtubeId').value = '';
    document.getElementById('videoTitle').value = 'YouTube video player';
    document.getElementById('contentBody').value = '';
    document.getElementById('creditsContainer').innerHTML = '';
    document.getElementById('assetsContainer').innerHTML = '';
    document.getElementById('preview').classList.add('hidden');
    toggleHeroFields();
    toggleVideoFields();
}

function addCredit() {
    const container = document.getElementById('creditsContainer');
    const index = container.children.length;
    const item = document.createElement('div');
    item.className = 'array-item';
    item.innerHTML = `
        <div class="array-item-header">
            <span class="array-item-title">Credit ${index + 1}</span>
            <button class="btn btn-danger btn-small" onclick="removeCredit(this)">Remove</button>
        </div>
        <div class="grid-2">
            <div class="form-group">
                <label>Name (display name, e.g., "artistname")</label>
                <input type="text" class="credit-name" placeholder="artistname">
            </div>
            <div class="form-group">
                <label>Instagram Username</label>
                <input type="text" class="credit-instagram" placeholder="artistname">
            </div>
        </div>
    `;
    container.appendChild(item);
}

function removeCredit(btn) {
    btn.closest('.array-item').remove();
}

function addAsset() {
    const container = document.getElementById('assetsContainer');
    const index = container.children.length;
    const item = document.createElement('div');
    item.className = 'array-item';
    item.innerHTML = `
        <div class="array-item-header">
            <span class="array-item-title">Asset ${index + 1}</span>
            <button class="btn btn-danger btn-small" onclick="removeAsset(this)">Remove</button>
        </div>
        <div class="form-group">
            <label>Name</label>
            <input type="text" class="asset-name" placeholder="Asset Name">
        </div>
        <div class="grid-2">
            <div class="form-group">
                <label>Path (relative to tutorial folder, e.g., "assets/file.zip")</label>
                <input type="text" class="asset-path" placeholder="assets/file.zip">
            </div>
            <div class="form-group">
                <label>Size (e.g., "2.5 MB")</label>
                <input type="text" class="asset-size" placeholder="2.5 MB">
            </div>
        </div>
        <div class="form-group">
            <label>Icon (emoji or character)</label>
            <input type="text" class="asset-icon" placeholder="📦" maxlength="2">
        </div>
    `;
    container.appendChild(item);
}

function removeAsset(btn) {
    btn.closest('.array-item').remove();
}

function getFormData() {
    const credits = Array.from(document.querySelectorAll('.array-item')).map(item => {
        if (item.querySelector('.credit-name')) {
            const name = item.querySelector('.credit-name').value.trim();
            const instagram = item.querySelector('.credit-instagram').value.trim();
            if (name && instagram) {
                return { name, instagram };
            }
        }
        return null;
    }).filter(Boolean);

    const assets = Array.from(document.querySelectorAll('.array-item')).map(item => {
        if (item.querySelector('.asset-name')) {
            const name = item.querySelector('.asset-name').value.trim();
            const path = item.querySelector('.asset-path').value.trim();
            const size = item.querySelector('.asset-size').value.trim();
            const icon = item.querySelector('.asset-icon').value.trim();
            if (name && path) {
                return { name, path, size: size || '0 MB', icon: icon || '📦' };
            }
        }
        return null;
    }).filter(Boolean);

    const tutorial = {
        slug: document.getElementById('slug').value.trim(),
        title: document.getElementById('title').value.trim(),
        subtitle: document.getElementById('subtitle').value.trim() || undefined,
        description: document.getElementById('description').value.trim() || undefined,
        heroImage: document.getElementById('heroEnabled').checked ? {
            enabled: true,
            src: document.getElementById('heroSrc').value.trim() || undefined,
            alt: document.getElementById('heroAlt').value.trim() || undefined
        } : undefined,
        credits: credits.length > 0 ? credits : undefined,
        video: document.getElementById('videoEnabled').checked ? {
            enabled: true,
            youtubeId: document.getElementById('youtubeId').value.trim() || undefined,
            title: document.getElementById('videoTitle').value.trim() || 'YouTube video player'
        } : undefined,
        assets: assets.length > 0 ? assets : [],
        content: {
            type: 'html',
            body: document.getElementById('contentBody').value.trim() || ''
        }
    };

    // Remove undefined fields
    Object.keys(tutorial).forEach(key => {
        if (tutorial[key] === undefined) {
            delete tutorial[key];
        }
    });

    return tutorial;
}

function validateForm() {
    const slug = document.getElementById('slug').value.trim();
    const title = document.getElementById('title').value.trim();

    if (!slug) {
        alert('Slug is required');
        return false;
    }

    if (!title) {
        alert('Title is required');
        return false;
    }

    // Check for duplicate slug (unless editing current)
    const existingIndex = tutorials.findIndex((t, i) => t.slug === slug && i !== currentEditIndex);
    if (existingIndex !== -1) {
        alert(`A tutorial with slug "${slug}" already exists!`);
        return false;
    }

    return true;
}

function saveTutorial() {
    if (!validateForm()) return;

    const tutorial = getFormData();

    if (currentEditIndex === -1) {
        // New tutorial
        tutorials.push(tutorial);
    } else {
        // Update existing
        tutorials[currentEditIndex] = tutorial;
    }

    // Sort by slug
    tutorials.sort((a, b) => a.slug.localeCompare(b.slug));

    updateTutorialList();
    cancelEdit();
    alert('✅ Tutorial saved to memory! Click "Save" to export the JSON file.');
}

function previewJSON() {
    const tutorial = getFormData();
    const preview = document.getElementById('preview');
    preview.textContent = JSON.stringify({ tutorials: [tutorial] }, null, 2);
    preview.classList.remove('hidden');
}

function cancelEdit() {
    document.getElementById('tutorialForm').classList.add('hidden');
    clearForm();
}

function editTutorial(index) {
    currentEditIndex = index;
    const tutorial = tutorials[index];
    
    document.getElementById('formTitle').textContent = `Edit: ${tutorial.title}`;
    document.getElementById('slug').value = tutorial.slug || '';
    document.getElementById('title').value = tutorial.title || '';
    document.getElementById('subtitle').value = tutorial.subtitle || '';
    document.getElementById('description').value = tutorial.description || '';
    
    // Hero image
    const heroEnabled = tutorial.heroImage?.enabled || false;
    document.getElementById('heroEnabled').checked = heroEnabled;
    if (tutorial.heroImage) {
        document.getElementById('heroSrc').value = tutorial.heroImage.src || '';
        document.getElementById('heroAlt').value = tutorial.heroImage.alt || '';
    }
    toggleHeroFields();
    
    // Video
    const videoEnabled = tutorial.video?.enabled || false;
    document.getElementById('videoEnabled').checked = videoEnabled;
    if (tutorial.video) {
        document.getElementById('youtubeId').value = tutorial.video.youtubeId || '';
        document.getElementById('videoTitle').value = tutorial.video.title || 'YouTube video player';
    }
    toggleVideoFields();
    
    // Credits
    document.getElementById('creditsContainer').innerHTML = '';
    if (tutorial.credits && tutorial.credits.length > 0) {
        tutorial.credits.forEach(credit => {
            addCredit();
            const lastItem = document.querySelector('#creditsContainer .array-item:last-child');
            lastItem.querySelector('.credit-name').value = credit.name || '';
            lastItem.querySelector('.credit-instagram').value = credit.instagram || '';
        });
    }
    
    // Assets
    document.getElementById('assetsContainer').innerHTML = '';
    if (tutorial.assets && tutorial.assets.length > 0) {
        tutorial.assets.forEach(asset => {
            addAsset();
            const lastItem = document.querySelector('#assetsContainer .array-item:last-child');
            lastItem.querySelector('.asset-name').value = asset.name || '';
            lastItem.querySelector('.asset-path').value = asset.path || '';
            lastItem.querySelector('.asset-size').value = asset.size || '';
            lastItem.querySelector('.asset-icon').value = asset.icon || '';
        });
    }
    
    // Content
    document.getElementById('contentBody').value = tutorial.content?.body || '';
    
    document.getElementById('tutorialForm').classList.remove('hidden');
    document.getElementById('preview').classList.add('hidden');
}

function deleteTutorial(index) {
    if (confirm(`Are you sure you want to delete "${tutorials[index].title}"?\n\n⚠️ This will remove it from memory. Remember to save the JSON file after deleting.`)) {
        tutorials.splice(index, 1);
        updateTutorialList();
    }
}

function updateTutorialList() {
    const container = document.getElementById('tutorialList');
    const countElement = document.getElementById('tutorialCount');
    
    if (countElement) {
        countElement.textContent = `(${tutorials.length})`;
    }
    
    if (tutorials.length === 0) {
        container.innerHTML = '<p style="color: rgba(248, 248, 248, 0.6);">No tutorials yet. Click "New Tutorial" to add one.</p>';
        return;
    }

    container.innerHTML = tutorials.map((tutorial, index) => `
        <div class="tutorial-item">
            <div class="tutorial-item-info">
                <h3>${escapeHtml(tutorial.title)}</h3>
                <p>Slug: ${escapeHtml(tutorial.slug)}</p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-secondary btn-small" onclick="editTutorial(${index})">✏️ Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteTutorial(${index})">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSaveModal() {
    document.getElementById('saveModal').classList.remove('hidden');
}

function closeSaveModal() {
    document.getElementById('saveModal').classList.add('hidden');
}

function saveToDefaultLocation() {
    closeSaveModal();
    downloadJSON();
}

async function saveToCustomLocation() {
    // Check if File System Access API is supported
    if ('showSaveFilePicker' in window) {
        try {
            const data = {
                tutorials: tutorials
            };
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: 'data.json',
                types: [{
                    description: 'JSON files',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            closeSaveModal();
            alert('✅ File saved successfully!');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error saving file:', err);
                alert('Error saving file. Falling back to download...');
                downloadJSON();
            }
            closeSaveModal();
        }
    } else {
        // Fallback to download if File System Access API is not supported
        alert('File System Access API is not supported in this browser. Using download instead.');
        closeSaveModal();
        downloadJSON();
    }
}

function downloadJSON() {
    const data = {
        tutorials: tutorials
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
}

function loadTutorials() {
    // Try to load from local file (only works if served via HTTP server)
    fetch('../tutorials/data.json')
        .then(response => response.json())
        .then(data => {
            tutorials = data.tutorials || [];
            updateTutorialList();
        })
        .catch(err => {
            console.log('Could not load from file. Use "Load from data.json" button to load manually.');
            if (tutorials.length === 0) {
                updateTutorialList();
            }
        });
}

function loadFromFile() {
    document.getElementById('fileInput').click();
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            tutorials = data.tutorials || [];
            updateTutorialList();
            alert(`Loaded ${tutorials.length} tutorial(s) from file!`);
        } catch (err) {
            alert('Error parsing JSON file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// Make functions globally available
window.addCredit = addCredit;
window.removeCredit = removeCredit;
window.addAsset = addAsset;
window.removeAsset = removeAsset;
window.saveTutorial = saveTutorial;
window.previewJSON = previewJSON;
window.cancelEdit = cancelEdit;
window.editTutorial = editTutorial;
window.deleteTutorial = deleteTutorial;
window.loadTutorials = loadTutorials;
window.loadFromFile = loadFromFile;
window.handleFileLoad = handleFileLoad;
window.showNewTutorialForm = showNewTutorialForm;
window.showSaveModal = showSaveModal;
window.closeSaveModal = closeSaveModal;
window.saveToDefaultLocation = saveToDefaultLocation;
window.saveToCustomLocation = saveToCustomLocation;
