(function () {
    const segmented = document.querySelector('.segmented');
    const segments = document.querySelectorAll('.segment');
    const views = {
        design: document.getElementById('view-design'),
        art: document.getElementById('view-art')
    };

    function setView(name) {
        if (!views[name]) name = 'design';

        segments.forEach((btn) => {
            const active = btn.dataset.view === name;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        Object.entries(views).forEach(([key, el]) => {
            const active = key === name;
            el.classList.toggle('is-active', active);
            if (active) {
                el.removeAttribute('hidden');
            } else {
                el.setAttribute('hidden', '');
            }
        });

        segmented.dataset.active = name;

        if (location.hash.replace('#', '') !== name) {
            history.replaceState(null, '', '#' + name);
        }
    }

    segments.forEach((btn) => {
        btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    window.addEventListener('hashchange', () => {
        setView(location.hash.replace('#', '') || 'design');
    });

    const initial = location.hash.replace('#', '');
    setView(initial === 'art' ? 'art' : 'design');
})();
