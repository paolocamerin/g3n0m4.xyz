// ----- Global state ----------------------------------------------------
let font;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let displayText = document.getElementById('textInput').value;
let fontSize = parseInt(document.getElementById('fontSizeSlider').value);
let kerningFactor = parseFloat(document.getElementById('kerningSlider').value);
let phaseSpeed = parseFloat(document.getElementById('phaseSpeedSlider').value);
let phase = parseFloat(document.getElementById('phaseSlider').value);
let waveFrequency = parseFloat(document.getElementById('waveFrequencySlider').value);
let waveAmplitude = parseFloat(document.getElementById('waveAmplitudeSlider').value);
let scaleFactor = parseFloat(document.getElementById('scaleSlider').value);
let useWaveScale = document.getElementById('waveScale').checked;
//let showControlPoints = document.getElementById('togglePoints').checked;

let isPaused = false;
let animationPhase = 0;
let baseX = 50;
let baseY = 0;

let bgColor = '#ffffff';
let fillColor = '#000000';

let isSwapped = false;

// Store original glyph properties to prevent cumulative edits
const originalGlyphProperties = new Map();

// Add this near the top with other DOM queries
const closeButton = document.getElementById('closeControls');
const controlsPanel = document.querySelector('.controls');
const showPanelHint = document.getElementById('showPanelHint');
const showControlsBtn = document.getElementById('showControlsBtn');

// Add near the top with other initialization code
let db;
const DB_NAME = 'FontToolDB';
const STORE_NAME = 'fonts';
const DB_VERSION = 1;

// Add near the top with other constants
const LAST_FONT_KEY = 'lastUsedFont';
const MAX_STORED_FONTS = 10;

// ----------------- Utilities -------------------------------------------
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function storeOriginalGlyphProperties() {
    originalGlyphProperties.clear();
    for (let ch of displayText) {
        const glyph = font.charToGlyph(ch);
        originalGlyphProperties.set(ch, {
            advanceWidth: glyph.advanceWidth,
            leftSideBearing: glyph.leftSideBearing
        });
    }
}

function resetGlyphProperties() {
    for (let ch of displayText) {
        const glyph = font.charToGlyph(ch);
        const orig = originalGlyphProperties.get(ch);
        if (orig) {
            glyph.advanceWidth = orig.advanceWidth;
            glyph.leftSideBearing = orig.leftSideBearing;
        }
    }
}

// --------------- Font loading ------------------------------------------
async function loadDefaultFont() {
    try {
        // First try to load the last used font
        const lastFontLoaded = await loadLastUsedFont();
        if (lastFontLoaded) {
            animate(); // Start animation with the loaded font
            return;
        }

        // If no stored font, load Inter as default
        const interURL = './Assets/Inter_28pt-Regular.ttf';

        const response = await fetch(interURL);
        const buffer = await response.arrayBuffer();
        await processFontData(buffer, 'Inter (default)', false); // Don't store Inter as last used
        animate(); // Start animation with default font
    } catch (err) {
        console.error('Error loading font:', err);
    }
}

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
        };
    });
}

// Store font in IndexedDB with limit management
async function storeFont(file, arrayBuffer) {
    return new Promise(async (resolve, reject) => {
        try {
            // First, check how many fonts we currently have
            const existingFonts = await listStoredFonts();

            // If we're at or over the limit, remove the oldest fonts
            if (existingFonts.length >= MAX_STORED_FONTS) {
                // Sort by timestamp (oldest first)
                existingFonts.sort((a, b) => a.timestamp - b.timestamp);

                // Remove oldest fonts until we're under the limit
                const fontsToRemove = existingFonts.slice(0, existingFonts.length - MAX_STORED_FONTS + 1);

                for (const fontToRemove of fontsToRemove) {
                    await removeFont(fontToRemove.name);
                    console.log(`Removed oldest font: ${fontToRemove.name}`);
                }
            }

            // Now store the new font
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const fontData = {
                name: file.name,
                data: arrayBuffer,
                timestamp: new Date().getTime()
            };

            const request = store.put(fontData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (err) {
            reject(err);
        }
    });
}

// Load font from IndexedDB
async function loadStoredFont(fontName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(fontName);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// List stored fonts
async function listStoredFonts() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Process font data - only for canvas rendering, not UI fonts
async function processFontData(arrayBuffer, fileName, shouldStoreAsLast = true) {
    try {
        const loadedFont = opentype.parse(arrayBuffer);
        font = loadedFont;
        storeOriginalGlyphProperties();

        // Store as last used font
        if (shouldStoreAsLast) {
            localStorage.setItem(LAST_FONT_KEY, fileName);
        }

        // Note: We don't use FontFace API here since we only need the font for canvas rendering
        // The UI font (Inter) stays the same
    } catch (err) {
        console.error('Error processing font:', err);
        throw err;
    }
}

// Load the last used font
async function loadLastUsedFont() {
    const lastFontName = localStorage.getItem(LAST_FONT_KEY);
    if (lastFontName) {
        try {
            const fontData = await loadStoredFont(lastFontName);
            if (fontData) {
                await processFontData(fontData.data, fontData.name);
                // Update the font selector if it exists
                const fontSelect = document.getElementById('fontSelect');
                if (fontSelect) {
                    fontSelect.value = lastFontName;
                }
                return true;
            }
        } catch (err) {
            console.warn('Could not load last used font:', err);
            // Clear the invalid font from localStorage
            localStorage.removeItem(LAST_FONT_KEY);
        }
    }
    return false;
}

// Enhanced upload handler with font limit management
const fileInput = document.getElementById('fontFile');
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedExt = /\.(ttf|otf|woff)$/i;
    if (!allowedExt.test(file.name)) {
        console.warn('Unsupported file type:', file.name);
        return;
    }

    try {
        const buffer = await file.arrayBuffer();
        await processFontData(buffer, file.name);
        await storeFont(file, buffer);

        // Refresh the font selector to reflect changes
        await createFontSelector();

        console.log(`Font stored: ${file.name}`);
    } catch (err) {
        console.error('Error processing font:', err);
    }
});

// ---------------- Animation loop ---------------------------------------
function animate() {
    if (!isPaused) {
        animationPhase += phaseSpeed;
        draw();
    }
    requestAnimationFrame(animate);
}

function renderText(text, x, y, size = 20, color = 'black') {
    ctx.font = `${size}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

function draw() {
    if (!font) return;   // safeguard

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill background
    const currentBg = isSwapped ? bgColor : fillColor;
    ctx.fillStyle = currentBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    baseY = fontSize;

    resetGlyphProperties();

    let x = baseX;
    const characterPositions = [];
    for (let ch of displayText) {
        const glyph = font.charToGlyph(ch);
        characterPositions.push(x);
        x += glyph.advanceWidth * (fontSize / font.unitsPerEm);
    }

    let currentX = baseX;
    characterPositions.forEach((pos, i) => {
        const ch = displayText[i];
        const glyph = font.charToGlyph(ch);

        const normalized = (pos - baseX) / fontSize;
        // Separate wave effect from kerning - wave amplitude is independent
        const waveEffect = Math.sin(normalized * waveFrequency + animationPhase + phase) * waveAmplitude;
        // Kerning affects letter spacing directly
        const kerningAdjustment = kerningFactor * fontSize;

        const path = font.getPath(ch, currentX, baseY, fontSize);
        const bounds = path.getBoundingBox();
        const cx = currentX + (bounds.x2 - bounds.x1) / 2;
        const cy = baseY - (bounds.y2 - bounds.y1) / 2;

        let finalScale = scaleFactor;
        if (useWaveScale) {
            finalScale *= Math.sin(normalized * waveFrequency + animationPhase + phase) * 0.5 + 1;
        }

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(finalScale, finalScale);
        ctx.translate(-cx, -cy);
        const currentFill = isSwapped ? fillColor : bgColor;
        ctx.fillStyle = currentFill;
        ctx.beginPath();
        path.commands.forEach(cmd => {
            switch (cmd.type) {
                case 'M': ctx.moveTo(cmd.x, cmd.y); break;
                case 'L': ctx.lineTo(cmd.x, cmd.y); break;
                case 'C': ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y); break;
                case 'Q': ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y); break;
                case 'Z': ctx.closePath(); break;
            }
        });
        ctx.fill();

        // Draw control points if enabled
        // if (showControlPoints) {
        //     ctx.strokeStyle = 'rgba(255,0,0,0.5)';
        //     ctx.fillStyle = 'red';
        //     path.commands.forEach(cmd => {
        //         if (cmd.type === 'C') {
        //             ctx.beginPath();
        //             ctx.arc(cmd.x1, cmd.y1, 3, 0, Math.PI * 2);
        //             ctx.arc(cmd.x2, cmd.y2, 3, 0, Math.PI * 2);
        //             ctx.fill();
        //             ctx.beginPath();
        //             ctx.moveTo(cmd.x1, cmd.y1);
        //             ctx.lineTo(cmd.x2, cmd.y2);
        //             ctx.stroke();
        //         }
        //         if (cmd.type === 'C' || cmd.type === 'L' || cmd.type === 'M') {
        //             ctx.fillStyle = 'green';
        //             ctx.beginPath();
        //             ctx.arc(cmd.x, cmd.y, 2, 0, Math.PI * 2);
        //             ctx.fill();
        //             ctx.fillStyle = 'red';
        //         }
        //     });
        // }

        ctx.restore();

        // Apply both wave effect and kerning to character positioning
        currentX += glyph.advanceWidth * (fontSize / font.unitsPerEm) + waveEffect + kerningAdjustment;
    });
}

// -------------------- NEW: utility to force a redraw when paused --------------------
function requestRender() {
    if (isPaused) {
        draw();
    }
}

// ---------------- UI bindings ------------------------------------------
document.getElementById('kerningSlider').addEventListener('input', e => {
    kerningFactor = parseFloat(e.target.value);
    requestRender();
});

document.getElementById('textInput').addEventListener('input', e => {
    displayText = e.target.value;
    storeOriginalGlyphProperties();
    requestRender();
});

document.getElementById('fontSizeSlider').addEventListener('input', e => {
    fontSize = parseInt(e.target.value);
    document.getElementById('fontSizeValue').textContent = fontSize;
    requestRender();
});

document.getElementById('phaseSpeedSlider').addEventListener('input', e => {
    phaseSpeed = parseFloat(e.target.value);
    document.getElementById('phaseSpeedValue').textContent = phaseSpeed.toFixed(3);
    requestRender();
});

document.getElementById('phaseSlider').addEventListener('input', e => {
    phase = parseFloat(e.target.value);
    document.getElementById('phaseValue').textContent = phase.toFixed(3);
    requestRender();
});

// document.getElementById('togglePoints').addEventListener('change', e => {
//     showControlPoints = e.target.checked;
// });

document.getElementById('togglePause').addEventListener('click', () => {
    isPaused = !isPaused;
});

document.getElementById('scaleSlider').addEventListener('input', e => {
    scaleFactor = parseFloat(e.target.value);
    document.getElementById('scaleValue').textContent = scaleFactor.toFixed(2);
    requestRender();
});

document.getElementById('waveScale').addEventListener('change', e => {
    useWaveScale = e.target.checked;
    requestRender();
});

document.getElementById('waveFrequencySlider').addEventListener('input', e => {
    waveFrequency = parseFloat(e.target.value);
    document.getElementById('waveFrequencyValue').textContent = waveFrequency.toFixed(4);
    requestRender();
});

document.getElementById('waveAmplitudeSlider').addEventListener('input', e => {
    waveAmplitude = parseFloat(e.target.value);
    document.getElementById('waveAmplitudeValue').textContent = waveAmplitude;
    requestRender();
});

document.getElementById('swapColors').addEventListener('change', e => {
    isSwapped = !isSwapped;
    syncPickers();
    requestRender();
});

// Export SVG (unchanged)
document.getElementById('exportSVG').addEventListener('click', exportToSVG);

function exportToSVG() {
    if (!font) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', canvas.width);
    svg.setAttribute('height', canvas.height);
    svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);

    let x = baseX;
    const charPositions = [];
    for (let ch of displayText) {
        const glyph = font.charToGlyph(ch);
        charPositions.push(x);
        x += glyph.advanceWidth * (fontSize / font.unitsPerEm);
    }

    const group = document.createElementNS(svgNS, 'g');
    svg.appendChild(group);

    let currentX = baseX;
    charPositions.forEach((pos, i) => {
        const ch = displayText[i];
        const glyph = font.charToGlyph(ch);
        const normalized = (pos - baseX) / fontSize;
        const waveEffect = Math.sin(normalized * waveFrequency + animationPhase + phase) * waveAmplitude;

        const path = font.getPath(ch, currentX, baseY, fontSize);
        const bounds = path.getBoundingBox();
        const cx = currentX + (bounds.x2 - bounds.x1) / 2;
        const cy = baseY - (bounds.y2 - bounds.y1) / 2;

        let finalScale = scaleFactor;
        if (useWaveScale) finalScale *= Math.sin(normalized * waveFrequency + animationPhase + phase) * 0.5 + 1;

        const svgPath = document.createElementNS(svgNS, 'path');
        const d = path.commands.map(cmd => {
            switch (cmd.type) {
                case 'M': return `M ${cmd.x} ${cmd.y}`;
                case 'L': return `L ${cmd.x} ${cmd.y}`;
                case 'C': return `C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
                case 'Q': return `Q ${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`;
                case 'Z': return 'Z';
                default: return '';
            }
        }).join(' ');
        svgPath.setAttribute('d', d);
        svgPath.setAttribute('fill', 'black');
        svgPath.setAttribute('transform', `translate(${cx},${cy}) scale(${finalScale}) translate(${-cx},${-cy})`);
        group.appendChild(svgPath);

        currentX += glyph.advanceWidth * (fontSize / font.unitsPerEm) + waveEffect;
    });

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'animated-text.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Initialize Pickr instances
const fillPickr = Pickr.create({
    el: '#fillPicker',
    theme: 'classic',
    default: fillColor,
    components: {
        preview: true,
        hue: true,
        interaction: { input: true }
    }
});

const bgPickr = Pickr.create({
    el: '#bgPicker',
    theme: 'classic',
    default: bgColor,
    components: {
        preview: true,
        hue: true,
        interaction: { input: true }
    }
});

fillPickr.on('change', (c) => {
    fillColor = c.toHEXA().toString();
    syncPickers();
    requestRender();
});

bgPickr.on('change', (c) => {
    bgColor = c.toHEXA().toString();
    syncPickers();
    requestRender();
});

// keep pickers in sync when swapped
function syncPickers() {
    fillPickr.setColor(fillColor);
    bgPickr.setColor(bgColor);
}

// Function to show the panel
function showPanel() {
    controlsPanel.classList.remove('hidden');
    showPanelHint.classList.remove('visible');
    showControlsBtn.classList.add('hidden');
}

// Function to hide the panel
function hidePanel() {
    controlsPanel.classList.add('hidden');
    showControlsBtn.classList.remove('hidden');
    // Show the hint briefly
    showPanelHint.classList.add('visible');
    setTimeout(() => {
        showPanelHint.classList.remove('visible');
    }, 2000);
}

// Add the click handlers
closeButton.addEventListener('click', hidePanel);
showControlsBtn.addEventListener('click', showPanel);

// Add a way to show the panel again (e.g., pressing 'c')
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'c') {
        showPanel();
    }
});

// Create font selection UI - use existing HTML dropdown
async function createFontSelector() {
    const fonts = await listStoredFonts();
    const select = document.getElementById('fontSelect');

    if (!select) return; // Exit if dropdown doesn't exist

    // Clear existing options except the first default one
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }

    // Add stored fonts as options
    fonts.forEach(fontData => {
        const option = document.createElement('option');
        option.value = fontData.name;
        option.textContent = fontData.name;
        select.appendChild(option);
    });

    // Set the current selection
    const lastFontName = localStorage.getItem(LAST_FONT_KEY);
    if (lastFontName) {
        select.value = lastFontName;
    }

    // Remove existing event listener to avoid duplicates
    select.removeEventListener('change', handleFontChange);
    select.addEventListener('change', handleFontChange);

    // Show the dropdown container if we have fonts
    const container = document.querySelector('.stored-fonts');
    if (container) {
        if (fonts.length > 0) {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }
}

// Separate function for font change handling
async function handleFontChange(e) {
    if (!e.target.value) return;

    try {
        const fontData = await loadStoredFont(e.target.value);
        await processFontData(fontData.data, fontData.name);
    } catch (err) {
        console.error('Error loading stored font:', err);
    }
}

// Remove font from IndexedDB
async function removeFont(fontName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(fontName);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Initialize database and UI
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        await createFontSelector();
        await loadDefaultFont();
    } catch (err) {
        console.error('Error initializing app:', err);
        // Fallback: try to load default font anyway
        loadDefaultFont();
    }
}); 