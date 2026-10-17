export const BABY_GRID_SIZE = 249;
export const BABY_EXIT_HOLD_MS = 600;

// A one-cell brush with interpolation so fast finger movements leave no gaps.
export function paintBabyStroke(ctx, from, to, colors, random = Math.random) {
    let x = from.x, y = from.y;
    const dx = Math.abs(to.x - x), dy = -Math.abs(to.y - y);
    const sx = x < to.x ? 1 : -1, sy = y < to.y ? 1 : -1;
    let error = dx + dy;
    while (true) {
        ctx.fillStyle = colors[Math.floor(random() * colors.length)];
        ctx.fillRect(x, y, 1, 1);
        if (x === to.x && y === to.y) break;
        const twice = 2 * error;
        if (twice >= dy) { error += dy; x += sx; }
        if (twice <= dx) { error += dx; y += sy; }
    }
}

// Match the painted RGB values to the workspace's current ordering of the palette.
export function babyDrawingToTiles(pixels, colors) {
    if (pixels.length % 4) throw new Error('Invalid baby drawing pixels');
    const ranks = new Map();
    colors.forEach((hex, index) => {
        const rgb = Number.parseInt(hex.slice(1), 16);
        if (!ranks.has(rgb)) ranks.set(rgb, index);
    });
    const tiles = [];
    for (let i = 0; i < pixels.length; i += 4) {
        const rgb = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
        if (!ranks.has(rgb)) throw new Error('Baby drawing color is missing from the palette');
        const k = ranks.get(rgb);
        tiles.push({ k, v: k, isGold: false });
    }
    return tiles;
}

// Drawing stays isolated while open; exit hands its exact pixels to the workspace.
export function initializeBabyMode({ getColors, getLabel, onExit }) {
    const dialog = document.createElement('dialog');
    dialog.id = 'babyModeDialog';
    const canvas = document.createElement('canvas');
    canvas.id = 'babyModeCanvas';
    canvas.width = canvas.height = BABY_GRID_SIZE;
    canvas.setAttribute('role', 'img');
    canvas.tabIndex = 0;
    dialog.append(canvas);
    document.body.append(dialog);
    const ctx = canvas.getContext('2d', { alpha: false });
    const pointers = new Map();
    let colors = [], exitTimer = null, exitPointer = null, previousFocus = null;

    function cancelExit() {
        clearTimeout(exitTimer);
        exitTimer = null;
        exitPointer = null;
    }
    function clearPointers() {
        cancelExit();
        for (const id of pointers.keys()) {
            if (dialog.hasPointerCapture(id)) dialog.releasePointerCapture(id);
        }
        pointers.clear();
    }
    function cellAt(event) {
        const bounds = canvas.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX >= bounds.right ||
            event.clientY < bounds.top || event.clientY >= bounds.bottom) return null;
        return {
            x: Math.min(BABY_GRID_SIZE - 1, Math.floor((event.clientX - bounds.left) / bounds.width * BABY_GRID_SIZE)),
            y: Math.min(BABY_GRID_SIZE - 1, Math.floor((event.clientY - bounds.top) / bounds.height * BABY_GRID_SIZE))
        };
    }
    function paint(pointer, cell) {
        if (!cell) { pointer.last = null; return; }
        paintBabyStroke(ctx, pointer.last || cell, cell, colors);
        pointer.last = cell;
    }
    function closeAfterHold(id) {
        if (!dialog.open || exitPointer !== id || pointers.size !== 1) return;
        onExit({ size: BABY_GRID_SIZE, pixels: ctx.getImageData(0, 0, BABY_GRID_SIZE, BABY_GRID_SIZE).data });
        // Consume the release and compatibility click so exiting cannot press a control.
        const blockClick = event => { event.preventDefault(); event.stopImmediatePropagation(); };
        document.addEventListener('click', blockClick, true);
        let cleanupTimer;
        const cleanup = () => {
            clearTimeout(cleanupTimer);
            document.removeEventListener('click', blockClick, true);
            document.removeEventListener('pointerup', release, true);
            document.removeEventListener('pointercancel', release, true);
            window.removeEventListener('blur', cleanup);
        };
        const release = event => {
            if (event.pointerId !== id) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            document.removeEventListener('pointerup', release, true);
            document.removeEventListener('pointercancel', release, true);
            clearTimeout(cleanupTimer);
            cleanupTimer = setTimeout(cleanup, 0);
        };
        document.addEventListener('pointerup', release, true);
        document.addEventListener('pointercancel', release, true);
        window.addEventListener('blur', cleanup, { once: true });
        cleanupTimer = setTimeout(cleanup, 10000);
        dialog.close();
    }

    dialog.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        cancelExit();
        const cell = cellAt(event);
        const pointer = { last: null, painting: Boolean(cell), x: event.clientX, y: event.clientY };
        pointers.set(event.pointerId, pointer);
        dialog.setPointerCapture(event.pointerId);
        if (cell) paint(pointer, cell);
        else if (pointers.size === 1) {
            exitPointer = event.pointerId;
            exitTimer = setTimeout(() => closeAfterHold(event.pointerId), BABY_EXIT_HOLD_MS);
        }
    });
    dialog.addEventListener('pointermove', event => {
        const pointer = pointers.get(event.pointerId);
        if (!pointer) return;
        event.preventDefault();
        event.stopPropagation();
        const cell = cellAt(event);
        if (cell || Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 12) cancelExit();
        if (cell) pointer.painting = true;
        if (pointer.painting) paint(pointer, cell);
    });
    function endPointer(event) {
        const pointer = pointers.get(event.pointerId);
        if (!pointer) return;
        event.preventDefault();
        event.stopPropagation();
        const cell = cellAt(event);
        if (event.type === 'pointerup' && pointer.painting && cell &&
            (!pointer.last || cell.x !== pointer.last.x || cell.y !== pointer.last.y)) paint(pointer, cell);
        pointers.delete(event.pointerId);
        if (exitPointer === event.pointerId) cancelExit();
        if (dialog.hasPointerCapture(event.pointerId)) dialog.releasePointerCapture(event.pointerId);
    }
    dialog.addEventListener('pointerup', endPointer);
    dialog.addEventListener('pointercancel', endPointer);
    dialog.addEventListener('lostpointercapture', endPointer);
    dialog.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
    dialog.addEventListener('contextmenu', event => { event.preventDefault(); event.stopPropagation(); });
    dialog.addEventListener('cancel', event => event.preventDefault());
    dialog.addEventListener('keydown', event => { event.preventDefault(); event.stopPropagation(); });
    dialog.addEventListener('close', () => { clearPointers(); previousFocus?.focus({ preventScroll: true }); });
    window.addEventListener('blur', clearPointers);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearPointers(); });

    return {
        open() {
            if (dialog.open || !ctx) return;
            colors = [...getColors()];
            if (!colors.length) return;
            clearPointers();
            previousFocus = document.activeElement;
            dialog.setAttribute('aria-label', getLabel());
            canvas.setAttribute('aria-label', getLabel());
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, BABY_GRID_SIZE, BABY_GRID_SIZE);
            dialog.showModal();
            canvas.focus({ preventScroll: true });
        }
    };
}
