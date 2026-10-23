import { DEFAULT_BLOOM_INTENSITY, normalizeBloomIntensity } from './engine/js/soft-bloom.js';

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
  intensity = normalizeBloomIntensity(intensity);
  if (!intensity) return;
  const scale = Math.min(1,160/output.width,160/output.height);
  const width = Math.max(1,Math.round(output.width*scale));
  const height = Math.max(1,Math.round(output.height*scale));
  if (small.width !== width) small.width = width;
  if (small.height !== height) small.height = height;
  const copy = small.getContext('2d');
  copy.imageSmoothingEnabled = true;
  copy.clearRect(0,0,width,height);
  copy.drawImage(output,0,0,width,height);
  const context = output.getContext('2d');
  context.save();
  context.globalCompositeOperation = 'screen';
  context.globalAlpha = intensity/100*.45;
  context.imageSmoothingEnabled = true;
  context.filter = `blur(${(3+intensity*.09)*output.width/Math.max(1,displayWidth)}px)`;
  context.drawImage(small,0,0,output.width,output.height);
  context.restore();
}
