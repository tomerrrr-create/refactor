const preparedCanvases = new WeakMap();

// Screen only: keep CSS drawing coordinates aligned with the backing bitmap.
export function prepareDisplayCanvas(canvas, context, width, height, pixelRatio) {
    if (width <= 0 || height <= 0) return false;
    const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
    const bitmapWidth = Math.max(1, Math.round(width * ratio));
    const bitmapHeight = Math.max(1, Math.round(height * ratio));
    const previous = preparedCanvases.get(canvas);
    if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight ||
        previous?.context !== context || previous.width !== width || previous.height !== height) {
        // Assigning either bitmap dimension clears the context. Never do it per frame.
        if (canvas.width !== bitmapWidth) canvas.width = bitmapWidth;
        if (canvas.height !== bitmapHeight) canvas.height = bitmapHeight;
        context.setTransform(bitmapWidth / width, 0, 0, bitmapHeight / height, 0, 0);
        preparedCanvases.set(canvas, { context, width, height });
    }
    return true;
}
