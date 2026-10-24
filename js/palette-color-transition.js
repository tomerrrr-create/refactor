// Display-only crossfade: no per-tile animation, history state, or replay command.
const active = new WeakMap();
const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function copyCanvas(source) {
    const frame = document.createElement('canvas');
    frame.width = source.width;
    frame.height = source.height;
    frame.getContext('2d').drawImage(source, 0, 0);
    return frame;
}

export function clearPaletteColorTransition(board) {
    const entry = active.get(board);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.layer.remove();
    active.delete(board);
}

export function capturePaletteColors(board) {
    const source = board?.querySelector('#boardCanvas');
    if (!source?.width || !source.height || reducedMotion()) return null;
    const previous = active.get(board);
    const opacity = previous ? Number.parseFloat(getComputedStyle(previous.layer).opacity) : 0;
    const frame = copyCanvas(source);
    if (opacity > 0) {
        const context = frame.getContext('2d');
        context.globalAlpha = opacity;
        context.drawImage(previous.frame, 0, 0, frame.width, frame.height);
        context.globalAlpha = 1;
    }
    // Retain the existing display bloom with CSS, without reading pixels or
    // calculating a blur on the CPU. Rapid taps blend the visible copies.
    const sourceBloom = board.querySelector('#boardBloom');
    let bloom = null;
    if (sourceBloom && !sourceBloom.hidden) {
        bloom = copyCanvas(sourceBloom);
        const style = getComputedStyle(sourceBloom);
        bloom.className = 'soft-bloom';
        bloom.style.opacity = style.opacity;
        bloom.style.filter = style.filter;
        if (opacity > 0 && previous.bloom) {
            const context = bloom.getContext('2d');
            context.globalAlpha = opacity;
            context.drawImage(previous.bloom, 0, 0, bloom.width, bloom.height);
            context.globalAlpha = 1;
        }
    }
    return { frame, bloom };
}

export function showPaletteColorTransition(board, snapshot) {
    clearPaletteColorTransition(board);
    if (!snapshot || reducedMotion()) return;
    const layer = document.createElement('div');
    layer.className = 'palette-color-transition';
    layer.setAttribute('aria-hidden', 'true');
    snapshot.frame.className = 'palette-color-frame';
    layer.append(snapshot.frame);
    if (snapshot.bloom) layer.append(snapshot.bloom);
    const entry = { ...snapshot, layer };
    active.set(board, entry);
    const cleanup = () => {
        if (active.get(board) === entry) clearPaletteColorTransition(board);
    };
    layer.addEventListener('animationend', event => { if (event.target === layer) cleanup(); });
    entry.timer = setTimeout(cleanup, 250);
    board.append(layer);
}
