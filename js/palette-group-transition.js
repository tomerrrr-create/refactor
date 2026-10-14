// Visual feedback only: palette/history changes stay synchronous and replayable.
export function showPaletteGroupTransition(board, fromCount, toCount) {
    const host = board?.parentElement;
    if (!host) return;
    host.querySelector('.palette-group-transition')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'palette-group-transition';
    overlay.setAttribute('aria-hidden', 'true');
    for (const [className, count] of [['is-departing', fromCount], ['is-arriving', toCount]]) {
        const number = document.createElement('span');
        number.className = `palette-group-number ${className}`;
        number.textContent = String(count);
        overlay.appendChild(number);
    }
    host.appendChild(overlay);
    const cleanupTimer = setTimeout(() => overlay.remove(), 3800);
    overlay.addEventListener('animationend', event => {
        if (event.target !== overlay) return;
        clearTimeout(cleanupTimer);
        overlay.remove();
    });
}
