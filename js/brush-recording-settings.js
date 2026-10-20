// Recording preference only: never overrides a loaded macro or profile.
export const BRUSH_MOTION_STORAGE_KEY = 'colorGridBrushMotionRecording';
export function loadBrushMotionRecording(storage) {
    try { return (storage ?? localStorage).getItem(BRUSH_MOTION_STORAGE_KEY) !== 'false'; }
    catch { return true; }
}
export function persistBrushMotionRecording(value, storage) {
    try { (storage ?? localStorage).setItem(BRUSH_MOTION_STORAGE_KEY, String(Boolean(value))); return true; }
    catch { return false; }
}
