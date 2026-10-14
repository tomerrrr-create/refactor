// Visual feedback only: palette/history changes stay synchronous and replayable.
export function capturePaletteGroupBoard(board) {
    const source = board?.querySelector('canvas');
    if (!source) return null;
    const frame = document.createElement('canvas');
    frame.width = source.width;
    frame.height = source.height;
    frame.getContext('2d').drawImage(source, 0, 0);
    frame.className = 'palette-group-previous-board';
    return frame;
}

export function showPaletteGroupTransition(board, fromCount, toCount, previousFrame = null) {
    const host = board?.parentElement;
    if (!host) return;
    host.querySelector('.palette-group-transition')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'palette-group-transition';
    overlay.setAttribute('aria-hidden', 'true');
    if (previousFrame) overlay.appendChild(previousFrame);
    const shade = document.createElement('div');
    shade.className = 'palette-group-shade';
    overlay.appendChild(shade);
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
