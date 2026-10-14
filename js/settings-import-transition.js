// Presentation only. Settings are already applied before this feedback starts.
export function showSettingsImportTransition(board, message, note = '') {
    const host = board?.parentElement;
    if (!host) return;
    host.querySelector('.palette-group-transition')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'palette-group-transition settings-import-transition';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-atomic', 'true');
    const shade = document.createElement('div');
    shade.className = 'palette-group-shade';
    shade.setAttribute('aria-hidden', 'true');
    const word = document.createElement('span');
    word.className = 'palette-group-number settings-import-word';
    word.dataset.debugText = 'settings_aligned';
    word.textContent = message;
    overlay.append(shade, word);
    if (note) {
        const caption = document.createElement('span');
        caption.className = 'settings-import-note';
        caption.dataset.debugText = 'settings_session_only';
        caption.textContent = note;
        overlay.append(caption);
    }
    host.append(overlay);
    const timer = setTimeout(() => overlay.remove(), 3800);
    overlay.addEventListener('animationend', event => {
        if (event.target !== overlay) return;
        clearTimeout(timer);
        overlay.remove();
    });
}
