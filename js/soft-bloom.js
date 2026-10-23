export const DEFAULT_SOFT_BLOOM = true;
export const DEFAULT_BLOOM_INTENSITY = 32;
const LEGACY_BLOOM_INTENSITY = 35;
export const normalizeBloomIntensity = value => Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value))) : DEFAULT_BLOOM_INTENSITY;

// Missing fields in existing V1 files/profiles retain their original off/35% meaning.
export function resolveSavedBloom(smoothing) {
    return { enabled: Boolean(smoothing.bloom),
        intensity: normalizeBloomIntensity(smoothing.bloomIntensity ?? LEGACY_BLOOM_INTENSITY) };
}

// Burn the display bloom into a PNG/video without touching its source pixels.
// A crop excludes the PNG's black frame; clip also keeps the blur off that frame.
export function compositeSoftBloom(context, source, { intensity = DEFAULT_BLOOM_INTENSITY,
    referenceWidth = source.width, sourceX = 0, sourceY = 0,
    width = source.width, height = source.height, copyCanvas } = {}) {
    intensity = normalizeBloomIntensity(intensity);
    if (!intensity || width <= 0 || height <= 0) return;
    const copy = copyCanvas || document.createElement('canvas');
    const scale = Math.min(1, 160 / width, 160 / height);
    const copyWidth = Math.max(1, Math.round(width * scale));
    const copyHeight = Math.max(1, Math.round(height * scale));
    if (copy.width !== copyWidth) copy.width = copyWidth;
    if (copy.height !== copyHeight) copy.height = copyHeight;
    const small = copy.getContext('2d');
    small.imageSmoothingEnabled = true;
    small.clearRect(0, 0, copyWidth, copyHeight);
    small.drawImage(source, sourceX, sourceY, width, height, 0, 0, copyWidth, copyHeight);
    context.save();
    context.beginPath(); context.rect(0, 0, width, height); context.clip();
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = intensity / 100 * .45;
    context.imageSmoothingEnabled = true;
    context.filter = `blur(${(3 + intensity * .09) * width / (referenceWidth > 0 ? referenceWidth : width)}px)`;
    context.drawImage(copy, 0, 0, width, height);
    context.restore();
}

// A small display-only copy: never filter or read back the source canvas pixels.
export function createSoftBloom(source, overlay) {
    let enabled = false, intensity = DEFAULT_BLOOM_INTENSITY, context = null;
    function refresh() {
        overlay.hidden = !enabled || intensity === 0;
        overlay.style.opacity = String(intensity / 100 * .45);
        overlay.style.filter = `blur(${3 + intensity * .09}px)`;
    }
    return {
        setIntensity(value) {
            intensity = normalizeBloomIntensity(value);
            refresh();
        },
        setEnabled(value) {
            enabled = Boolean(value);
            refresh();
            if (!enabled) {
                overlay.width = 1;
                overlay.height = 1;
            }
        },
        draw() {
            if (!enabled || intensity === 0 || !source.width || !source.height) return;
            context ??= overlay.getContext('2d');
            if (!context) return;
            // Bound the compositing cost independently of board size and pixel ratio.
            const scale = Math.min(1, 160 / source.width, 160 / source.height);
            const width = Math.max(1, Math.round(source.width * scale));
            const height = Math.max(1, Math.round(source.height * scale));
            if (overlay.width !== width) overlay.width = width;
            if (overlay.height !== height) overlay.height = height;
            context.imageSmoothingEnabled = true;
            context.clearRect(0, 0, width, height);
            context.drawImage(source, 0, 0, width, height);
        }
    };
}
