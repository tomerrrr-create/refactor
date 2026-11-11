// Playback-only provenance. Never infer a palette change from the viewer's
// active palette: it may be an opening override rather than a recorded choice.
export function createMacroPaletteContext() {
    let recorded = null;
    return {
        reset() { recorded = null; },
        record(index) { recorded = Number.isInteger(index) && index >= 0 ? index : null; },
        historyPalette(target, { selected, current }) {
            return selected != null && recorded !== null && target === recorded ? current : target;
        }
    };
}
