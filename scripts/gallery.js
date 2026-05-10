(function () {
    const images = Array.from(document.querySelectorAll('.media-frame:not(.media-frame--hero) img'));
    if (!images.length) return;

    // Build overlay
    const overlay = document.createElement('div');
    overlay.className = 'gallery-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image gallery');
    overlay.innerHTML = `
        <button class="gallery-btn gallery-close" aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6 6 L18 18 M18 6 L6 18"/></svg>
        </button>
        <button class="gallery-btn gallery-prev" aria-label="Previous image">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M14 6 L8 12 L14 18"/></svg>
        </button>
        <button class="gallery-btn gallery-next" aria-label="Next image">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M10 6 L16 12 L10 18"/></svg>
        </button>
        <div class="gallery-track" role="presentation"></div>
        <div class="gallery-counter" aria-live="polite"></div>
    `;
    document.body.appendChild(overlay);

    const track = overlay.querySelector('.gallery-track');
    const counter = overlay.querySelector('.gallery-counter');
    const btnClose = overlay.querySelector('.gallery-close');
    const btnPrev = overlay.querySelector('.gallery-prev');
    const btnNext = overlay.querySelector('.gallery-next');

    // Pre-build slides
    images.forEach((img) => {
        const slide = document.createElement('div');
        slide.className = 'gallery-slide';
        const full = document.createElement('img');
        full.src = img.currentSrc || img.src;
        full.alt = img.alt || '';
        full.draggable = false;
        slide.appendChild(full);
        track.appendChild(slide);
    });

    let currentIndex = 0;
    let isOpen = false;
    let suppressClick = false;
    let lockedScrollY = 0;
    let trackWidth = 0;

    function setTransform(px, animate) {
        track.style.transition = animate ? '' : 'none';
        track.style.transform = `translate3d(${px}px, 0, 0)`;
    }

    function update(animate) {
        if (!trackWidth) trackWidth = track.offsetWidth;
        setTransform(-currentIndex * trackWidth, animate !== false);
        counter.textContent = `${currentIndex + 1} / ${images.length}`;
        btnPrev.disabled = currentIndex === 0;
        btnNext.disabled = currentIndex === images.length - 1;
    }

    function open(index) {
        currentIndex = index;
        isOpen = true;
        // iOS-safe scroll lock
        lockedScrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${lockedScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        overlay.classList.add('is-open');
        // Measure track width *after* overlay is visible
        requestAnimationFrame(() => {
            trackWidth = track.offsetWidth;
            update(false);
        });
    }

    function close() {
        isOpen = false;
        overlay.classList.remove('is-open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        window.scrollTo(0, lockedScrollY);
    }

    function next() {
        if (currentIndex < images.length - 1) {
            currentIndex++;
            update(true);
        }
    }

    function prev() {
        if (currentIndex > 0) {
            currentIndex--;
            update(true);
        }
    }

    // Wire image clicks
    images.forEach((img, i) => {
        img.classList.add('is-zoomable');
        img.addEventListener('click', () => open(i));
    });

    btnClose.addEventListener('click', close);
    btnNext.addEventListener('click', next);
    btnPrev.addEventListener('click', prev);

    // Tap on backdrop closes (but suppress the synthetic click after a swipe)
    overlay.addEventListener('click', (e) => {
        if (suppressClick) return;
        if (e.target === overlay || e.target === track || e.target.classList.contains('gallery-slide')) {
            close();
        }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (!isOpen) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowRight') next();
        else if (e.key === 'ArrowLeft') prev();
    });

    // Re-measure on viewport resize (rotation, address bar collapse)
    window.addEventListener('resize', () => {
        if (!isOpen) return;
        trackWidth = track.offsetWidth;
        update(false);
    });

    // ---------- Touch swipe ----------
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let isSwiping = false;
    let pointerActive = false;

    function isOnButton(target) {
        return target && target.closest && target.closest('.gallery-btn');
    }

    function onStart(clientX, clientY, target) {
        if (isOnButton(target)) return;
        startX = clientX;
        startY = clientY;
        deltaX = 0;
        isSwiping = true;
        trackWidth = track.offsetWidth;
        // Snap to current index immediately so the next move is anchored correctly
        setTransform(-currentIndex * trackWidth, false);
        // Force layout flush
        void track.offsetWidth;
    }

    function onMove(clientX, clientY) {
        if (!isSwiping) return;
        const dx = clientX - startX;
        const dy = clientY - startY;
        // Abandon if mostly vertical
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 24) {
            isSwiping = false;
            update(true);
            return;
        }
        deltaX = dx;
        setTransform(-currentIndex * trackWidth + deltaX, false);
    }

    function onEnd() {
        if (!isSwiping) return;
        const moved = Math.abs(deltaX) > 8;
        if (moved) {
            suppressClick = true;
            setTimeout(() => { suppressClick = false; }, 450);
            const threshold = Math.min(80, trackWidth * 0.18);
            if (deltaX < -threshold && currentIndex < images.length - 1) {
                currentIndex++;
            } else if (deltaX > threshold && currentIndex > 0) {
                currentIndex--;
            }
        }
        update(true);
        isSwiping = false;
        deltaX = 0;
    }

    // Touch events on the overlay so they catch finger movement anywhere
    overlay.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        onStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, { passive: true });

    overlay.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;
        onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    overlay.addEventListener('touchend', onEnd, { passive: true });
    overlay.addEventListener('touchcancel', () => {
        if (!isSwiping) return;
        update(true);
        isSwiping = false;
        deltaX = 0;
    }, { passive: true });

    // Pointer events as a fallback for trackpad / mouse drag
    overlay.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return;
        if (e.button !== 0) return;
        onStart(e.clientX, e.clientY, e.target);
        pointerActive = true;
    });
    overlay.addEventListener('pointermove', (e) => {
        if (!pointerActive) return;
        onMove(e.clientX, e.clientY);
    });
    function endPointer() {
        if (!pointerActive) return;
        pointerActive = false;
        onEnd();
    }
    overlay.addEventListener('pointerup', endPointer);
    overlay.addEventListener('pointercancel', endPointer);
    overlay.addEventListener('pointerleave', endPointer);
})();
