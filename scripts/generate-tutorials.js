#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TUTORIALS_DIR = path.join(__dirname, '..', 'tutorials');
const DATA_FILE = path.join(TUTORIALS_DIR, 'data.json');
const TEMPLATE_FILE = path.join(TUTORIALS_DIR, 'tutorial-template.html');

// Instagram icon SVG (reusable)
const INSTAGRAM_ICON_SVG = `<svg class="instagram-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="currentColor"/>
</svg>`;

function generateHeroImageSection(heroImage, credits) {
    if (!heroImage || !heroImage.enabled) {
        return '';
    }

    let html = `<div class="hero-image-section">\n`;
    html += `                <img src="${heroImage.src}" alt="${heroImage.alt || ''}" class="hero-image">\n`;

    if (credits && credits.length > 0) {
        html += `                <div class="hero-tags">\n`;
        credits.forEach(credit => {
            html += `                    <div class="credit-chip">\n`;
            html += `                        <a href="https://www.instagram.com/${credit.instagram}/" target="_blank" rel="noopener noreferrer" class="credit-link">\n`;
            html += `                            ${INSTAGRAM_ICON_SVG}\n`;
            html += `                            <span>@${credit.name}</span>\n`;
            html += `                        </a>\n`;
            html += `                    </div>\n`;
        });
        html += `                </div>\n`;
    }

    html += `            </div>`;
    return html;
}

function generateSubtitleHTML(subtitle) {
    if (!subtitle) return '';
    return `<p class="tutorial-subtitle">${escapeHtml(subtitle)}</p>`;
}

function generateVideoSection(video) {
    if (!video || !video.enabled) return '';

    return `<div class="tutorial-video-section" style="margin: 2rem 0; text-align: center;">
                <iframe 
                    width="560" 
                    height="315" 
                    src="https://www.youtube.com/embed/${video.youtubeId}" 
                    title="${video.title || 'YouTube video player'}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen
                    style="max-width: 100%; border-radius: 16px; box-shadow: 0px 4px 24px rgba(0,0,0,0.15);">
                </iframe>
                <div style="margin-top: 0.5rem; font-size: 0.95em; color: var(--secondary-color);">
                    Watch the full tutorial on YouTube
                </div>
            </div>`;
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function generateTutorial(tutorial, template) {
    let html = template;

    // Basic replacements
    html = html.replace(/\{\{TITLE\}\}/g, escapeHtml(tutorial.title));
    html = html.replace(/\{\{DESCRIPTION\}\}/g, escapeHtml(tutorial.description || tutorial.subtitle || ''));

    // Hero image section
    const heroSection = generateHeroImageSection(tutorial.heroImage, tutorial.credits);
    html = html.replace(/\{\{HERO_IMAGE_SECTION\}\}/g, heroSection);

    // Subtitle
    const subtitleHTML = generateSubtitleHTML(tutorial.subtitle);
    html = html.replace(/\{\{SUBTITLE_HTML\}\}/g, subtitleHTML);

    // Video section
    const videoSection = generateVideoSection(tutorial.video);
    html = html.replace(/\{\{VIDEO_SECTION\}\}/g, videoSection);

    // Content HTML (if provided)
    const contentHTML = tutorial.content?.body || '';
    html = html.replace(/\{\{CONTENT_HTML\}\}/g, contentHTML);

    // Assets JSON
    const assetsJSON = JSON.stringify(tutorial.assets || [], null, 8);
    html = html.replace(/__ASSETS_JSON__/g, assetsJSON);

    return html;
}

function main() {
    console.log('🚀 Generating tutorial pages...\n');

    // Read data file
    if (!fs.existsSync(DATA_FILE)) {
        console.error(`❌ Error: ${DATA_FILE} not found!`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const tutorials = data.tutorials || [];

    if (tutorials.length === 0) {
        console.warn('⚠️  No tutorials found in data.json');
        return;
    }

    // Read template
    if (!fs.existsSync(TEMPLATE_FILE)) {
        console.error(`❌ Error: ${TEMPLATE_FILE} not found!`);
        process.exit(1);
    }

    const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');

    // Generate each tutorial
    tutorials.forEach(tutorial => {
        if (!tutorial.slug) {
            console.warn('⚠️  Skipping tutorial without slug');
            return;
        }

        const tutorialDir = path.join(TUTORIALS_DIR, tutorial.slug);
        const outputFile = path.join(tutorialDir, 'index.html');

        // Create directory if it doesn't exist
        if (!fs.existsSync(tutorialDir)) {
            fs.mkdirSync(tutorialDir, { recursive: true });
            console.log(`📁 Created directory: ${tutorial.slug}/`);
        }

        // Generate HTML
        const html = generateTutorial(tutorial, template);

        // Write file
        fs.writeFileSync(outputFile, html, 'utf8');
        console.log(`✅ Generated: ${tutorial.slug}/index.html`);
    });

    console.log(`\n✨ Successfully generated ${tutorials.length} tutorial page(s)!`);
}

main();
