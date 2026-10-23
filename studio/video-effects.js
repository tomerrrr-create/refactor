import { DEFAULT_BLOOM_INTENSITY, normalizeBloomIntensity, compositeSoftBloom } from './engine/js/soft-bloom.js';

export const DEFAULT_VIDEO_EFFECTS = { smooth:true, glow:true, intensity:DEFAULT_BLOOM_INTENSITY };

// Only explicit display preferences count. Brightness-evolution "smoothing"
// is a simulation rule, not a visual smoothing preference.
export function recordedEffects(action) {
  if (!['INIT_STATE','HISTORY_SETTINGS'].includes(action.eventName)) return {};
  let value;
  try { value = JSON.parse(action.details); } catch { return {}; }
  const saved = value?.smoothing;
  if (!saved || typeof saved !== 'object') return {};
  const result = {};
  if (typeof saved.display === 'boolean') result.smooth = saved.display;
  if (typeof saved.bloom === 'boolean') result.glow = saved.bloom;
  if (Number.isFinite(saved.bloomIntensity)) result.intensity = normalizeBloomIntensity(saved.bloomIntensity);
  return result;
}

export function inspectEffects(queue) {
  const result = {};
  for (const action of queue) {
    for (const [key,value] of Object.entries(recordedEffects(action))) {
      if (!(key in result)) result[key] = value;
    }
  }
  return result;
}

// Match the app's 160px bloom copy, screen blend, opacity and blur formula.
// CSS-only overlays are not captured by VideoFrame, so composite into output.
export function compositeGlow(output, small, intensity, displayWidth) {
  compositeSoftBloom(output.getContext('2d'),output,{intensity,referenceWidth:displayWidth,copyCanvas:small});
}
