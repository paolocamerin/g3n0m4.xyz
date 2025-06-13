// ----- Global state ----------------------------------------------------
let font;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let displayText = document.getElementById('textInput').value;
let fontSize = parseInt(document.getElementById('fontSizeSlider').value);
let kerningFactor = parseFloat(document.getElementById('kerningSlider').value);
let phaseSpeed = parseFloat(document.getElementById('phaseSpeedSlider').value);
let waveFrequency = parseFloat(document.getElementById('waveFrequencySlider').value);
let scaleFactor = parseFloat(document.getElementById('scaleSlider').value);
let useWaveScale = document.getElementById('waveScale').checked;
//let showControlPoints = document.getElementById('togglePoints').checked;

let isPaused = false;
let animationPhase = 0;
let waveAmplitude = 400;   // px
let baseX = 50;
let baseY = 0;

let bgColor = '#ffffff';
let fillColor = '#000000';

let isSwapped = false;

// Store original glyph properties to prevent cumulative edits
const originalGlyphProperties = new Map();

// Add this near the top with other DOM queries
const statusElement = document.getElementById('status');

// Add near the top with other DOM queries
const closeButton = document.getElementById('closeControls');
const controlsPanel = document.querySelector('.controls');
const showPanelHint = document.getElementById('showPanelHint');
const showControlsBtn = document.getElementById('showControlsBtn');

// Initially hide the status
document.addEventListener('DOMContentLoaded', () => {
    statusElement.classList.add('hidden');
});

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
function loadDefaultFont() {
    const interURL = './Assets/Inter_28pt-Regular.ttf';
    statusElement.textContent = 'Loading default font...';
    statusElement.classList.remove('hidden');

    fetch(interURL)
        .then(resp => resp.arrayBuffer())
        .then(buf => {
            try {
                font = opentype.parse(buf);
                storeOriginalGlyphProperties();
                statusElement.textContent = 'Current font: Inter (default)';
                animate();
            } catch (e) {
                console.error('Error parsing default Inter font:', e);
                statusElement.textContent = 'Error loading default font';
                setTimeout(() => statusElement.classList.add('hidden'), 3000);
            }
        })
        .catch(err => {
            console.error('Error fetching default Inter font:', err);
            statusElement.textContent = 'Error loading default font';
            setTimeout(() => statusElement.classList.add('hidden'), 3000);
        });
}

// Enhanced upload: use both opentype.js (ArrayBuffer) AND FontFace API
const fileInput = document.getElementById('fontFile');
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Extension validation (.ttf .otf .woff)
    const allowedExt = /\.(ttf|otf|woff)$/i;
    if (!allowedExt.test(file.name)) {
        statusElement.textContent = 'Unsupported file type. Please select a .ttf, .otf, or .woff font.';
        statusElement.classList.remove('hidden');
        setTimeout(() => statusElement.classList.add('hidden'), 3000);
        return;
    }

    // Show loading status for custom fonts
    statusElement.textContent = 'Loading font…';
    statusElement.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const buffer = ev.target.result;
            const loadedFont = opentype.parse(buffer);
            font = loadedFont;
            storeOriginalGlyphProperties();
            statusElement.textContent = `Current font: ${file.name}`;
            // Keep status visible - no setTimeout to hide

            // ---- FontFace API (for DOM usage) ---------------
            try {
                const blobURL = URL.createObjectURL(file);
                const family = file.name.replace(/\.[^/.]+$/, '');
                const face = new FontFace(family, `url(${blobURL})`);
                await face.load();
                document.fonts.add(face);
                document.documentElement.style.setProperty('--user-font', `"${family}", sans-serif`);
                // Reclaim memory next frame
                requestAnimationFrame(() => URL.revokeObjectURL(blobURL));
            } catch (ffErr) {
                console.warn('FontFace load failed:', ffErr);
            }
        } catch (err) {
            statusElement.textContent = 'Error: ' + err.message;
            setTimeout(() => statusElement.classList.add('hidden'), 3000); // Only hide on error
            console.error(err);
        }
    };
    reader.readAsArrayBuffer(file);
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
        const waveEffect = Math.sin(normalized * waveFrequency + animationPhase) * waveAmplitude * kerningFactor;

        const path = font.getPath(ch, currentX, baseY, fontSize);
        const bounds = path.getBoundingBox();
        const cx = currentX + (bounds.x2 - bounds.x1) / 2;
        const cy = baseY - (bounds.y2 - bounds.y1) / 2;

        let finalScale = scaleFactor;
        if (useWaveScale) {
            finalScale *= Math.sin(normalized * waveFrequency + animationPhase) * 0.5 + 1;
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

        currentX += glyph.advanceWidth * (fontSize / font.unitsPerEm) + waveEffect;
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
        const waveEffect = Math.sin(normalized * waveFrequency + animationPhase) * waveAmplitude * kerningFactor;

        const path = font.getPath(ch, currentX, baseY, fontSize);
        const bounds = path.getBoundingBox();
        const cx = currentX + (bounds.x2 - bounds.x1) / 2;
        const cy = baseY - (bounds.y2 - bounds.y1) / 2;

        let finalScale = scaleFactor;
        if (useWaveScale) finalScale *= Math.sin(normalized * waveFrequency + animationPhase) * 0.5 + 1;

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

// Kick things off
loadDefaultFont(); 