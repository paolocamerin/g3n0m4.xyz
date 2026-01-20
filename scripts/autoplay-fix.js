document.addEventListener('DOMContentLoaded', function () {
    const videos = document.querySelectorAll('video');

    videos.forEach(video => {
        // Try to play video after page load
        video.play().catch(() => {
            // Autoplay was prevented, add click listener as fallback
            document.body.addEventListener('click', () => {
                video.play();
            }, { once: true });
        });
    });
});