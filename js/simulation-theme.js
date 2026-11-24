import { getCurrentLang, onLanguageChange } from './i18n.js';

// Appearance preferences are independent of artwork and replay; profiles capture them.
const STORAGE_KEY = 'colorGridSimulationTheme';
const PLAYBACK_STORAGE_KEY = 'colorGridSimulationPlaybackTheme';
const GOLD_HIERARCHY_STORAGE_KEY = 'colorGridGoldPlaybackHierarchy';
const GLOW_PULSE_STORAGE_KEY = 'colorGridGlowPulseSeconds';
const GLOW_PULSE_SECONDS = [0.6, 1, 1.6, 2.4, 3.2, 4, 4.8];
const DEFAULT_GLOW_PULSE_SECONDS = 3.2;
let cancelGoldPlaybackFade;
const RETIRED_DARK_THEMES = ['graphite', 'graphite-edge', 'graphite-dust', 'deep-blue'];
const LABELS = {
  en: {gold: 'Gold', blue: 'Blue', teal: 'Smoky turquoise', 'moon-silver': 'Moon Silver', ivory: 'Ivory', 'dark-gray': 'Dark Gray'},
  he: {gold: 'זהב', blue: 'כחול', teal: 'טורקיז מעושן', 'moon-silver': 'כסף ירחי', ivory: 'שנהב', 'dark-gray': 'אפור כהה'},
  ru: {gold: 'Золото', blue: 'Синий', teal: 'Дымчатая бирюза', 'moon-silver': 'Лунное серебро', ivory: 'Слоновая кость', 'dark-gray': 'Тёмно-серый'},
  nl: {gold: 'Goud', blue: 'Blauw', teal: 'Gedempt turkoois', 'moon-silver': 'Maanzilver', ivory: 'Ivoor', 'dark-gray': 'Donkergrijs'}
};

export function isSimulationTheme(value) {
  return typeof value === 'string' && Object.hasOwn(LABELS.en, value);
}

export function getSimulationTheme() {
  return document.documentElement.dataset.simulationTheme || 'gold';
}

export function getSimulationPlaybackTheme() {
  return document.documentElement.dataset.simulationPlaybackTheme || 'gold';
}

function updateEffectiveTheme() {
  const root = document.documentElement;
  root.dataset.simulationEffectiveTheme = root.hasAttribute('data-simulation-running')
    ? getSimulationPlaybackTheme() : getSimulationTheme();
}

// Running state is transient; only the two chosen colors are saved.
export function setSimulationRunning(running) {
  const root = document.documentElement;
  root.toggleAttribute('data-simulation-running', Boolean(running));
  updateEffectiveTheme();
  if (!running && cancelGoldPlaybackFade) {
    const cancel = cancelGoldPlaybackFade;
    // A live handoff pauses and resumes in the same turn.
    queueMicrotask(() => {
      if (!root.hasAttribute('data-simulation-running')) cancel();
    });
  }
}

export function fadeGoldPlaybackControls(toolbar) {
  const root = document.documentElement;
  if (!root.hasAttribute('data-gold-playback-hierarchy') ||
      root.dataset.simulationEffectiveTheme !== 'gold' ||
      !toolbar.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  cancelGoldPlaybackFade?.();
  // The existing color rules designate the third tier, including its drawer switch.
  const controls = [...toolbar.children].filter(button => {
    const style = getComputedStyle(button);
    return style.visibility === 'visible' && style.display !== 'none' &&
      style.getPropertyValue('--playback-control-ink').trim();
  });
  if (!controls.length) return;

  const darken = [{ filter: 'brightness(1)' }, { filter: 'brightness(0)' }];
  const reveal = [...darken].reverse();
  root.setAttribute('data-gold-playback-fade-out', '');
  const fadingOut = controls.map(button => button.animate(darken, { duration: 400, easing: 'ease-in', fill: 'forwards' }));
  let animations = fadingOut;
  function cancel() {
    if (cancelGoldPlaybackFade !== cancel) return;
    cancelGoldPlaybackFade = null;
    root.removeAttribute('data-gold-playback-fade-out');
    animations.forEach(animation => animation.cancel());
  }
  cancelGoldPlaybackFade = cancel;

  Promise.all(fadingOut.map(animation => animation.finished)).then(() => {
    if (cancelGoldPlaybackFade !== cancel) return;
    root.removeAttribute('data-gold-playback-fade-out');
    animations = controls.map(button => button.animate(reveal, {
      delay: 100, duration: 600, easing: 'ease-out', fill: 'backwards'
    }));
    fadingOut.forEach(animation => animation.cancel());
    return Promise.all(animations.map(animation => animation.finished));
  }).then(cancel, cancel);
}

export function applySimulationTheme(value) {
  const theme = RETIRED_DARK_THEMES.includes(value) ? 'blue' : isSimulationTheme(value) ? value : 'gold';
  document.documentElement.dataset.simulationTheme = theme;
  for (const preview of document.querySelectorAll('#simulationThemeSettings [data-theme]')) {
    preview.setAttribute('aria-pressed', String(preview.dataset.theme === theme));
  }
  updateEffectiveTheme();
  try { localStorage.setItem(STORAGE_KEY, theme); return true; }
  catch { return false; /* Appearance still works for this session. */ }
}

export function applySimulationPlaybackTheme(value) {
  const theme = isSimulationTheme(value) ? value : 'gold';
  document.documentElement.dataset.simulationPlaybackTheme = theme;
  for (const preview of document.querySelectorAll('#simulationPlaybackThemeSettings [data-theme]')) {
    preview.setAttribute('aria-pressed', String(preview.dataset.theme === theme));
  }
  updateEffectiveTheme();
  try { localStorage.setItem(PLAYBACK_STORAGE_KEY, theme); return true; }
  catch { return false; }
}

function initializeGoldPlaybackHierarchy() {
  const toggle = document.getElementById('goldPlaybackHierarchyToggle');
  let enabled = false;
  try { enabled = localStorage.getItem(GOLD_HIERARCHY_STORAGE_KEY) === 'true'; } catch {}
  toggle.checked = enabled;
  document.documentElement.toggleAttribute('data-gold-playback-hierarchy', enabled);
  toggle.addEventListener('change', () => {
    document.documentElement.toggleAttribute('data-gold-playback-hierarchy', toggle.checked);
    if (!toggle.checked) cancelGoldPlaybackFade?.();
    try { localStorage.setItem(GOLD_HIERARCHY_STORAGE_KEY, String(toggle.checked)); } catch {}
  });
}

function initializeGlowPulse() {
  const slider = document.getElementById('glowPulse');
  const value = document.getElementById('glowPulseValue');
  let savedIndex = -1;
  try { savedIndex = GLOW_PULSE_SECONDS.indexOf(Number(localStorage.getItem(GLOW_PULSE_STORAGE_KEY))); } catch {}
  slider.max = GLOW_PULSE_SECONDS.length - 1;
  slider.value = savedIndex < 0 ? GLOW_PULSE_SECONDS.indexOf(DEFAULT_GLOW_PULSE_SECONDS) : savedIndex;

  function render() {
    const duration = GLOW_PULSE_SECONDS[slider.value];
    const units = { style: 'unit', unit: 'second', minimumFractionDigits: 1, maximumFractionDigits: 1 };
    value.value = new Intl.NumberFormat(getCurrentLang(), { ...units, unitDisplay: 'narrow' }).format(duration);
    slider.setAttribute('aria-valuetext', new Intl.NumberFormat(getCurrentLang(), { ...units, unitDisplay: 'long' }).format(duration));
    document.documentElement.style.setProperty('--simulation-halo-duration', `${duration}s`);
  }

  slider.addEventListener('input', () => {
    render();
    try { localStorage.setItem(GLOW_PULSE_STORAGE_KEY, String(GLOW_PULSE_SECONDS[slider.value])); } catch {}
  });
  onLanguageChange(render);
  render();
}

export function initializeSimulationTheme() {
  initializeGoldPlaybackHierarchy();
  initializeGlowPulse();
  const section = document.getElementById('simulationThemeSettings');
  const playbackSection = document.getElementById('simulationPlaybackThemeSettings');
  const previews = section.querySelectorAll('[data-theme]');
  const playbackPreviews = playbackSection.querySelectorAll('[data-theme]');
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Use the default gold appearance. */ }
  applySimulationTheme(saved);
  let savedPlayback;
  try { savedPlayback = localStorage.getItem(PLAYBACK_STORAGE_KEY); } catch {}
  applySimulationPlaybackTheme(savedPlayback);
  for (const preview of playbackPreviews) {
    preview.addEventListener('click', () => applySimulationPlaybackTheme(preview.dataset.theme));
  }
  for (const preview of previews) {
    preview.addEventListener('click', () => applySimulationTheme(preview.dataset.theme));
  }
  function translate() {
    const labels = LABELS[getCurrentLang()] || LABELS.en;
    for (const preview of [...previews, ...playbackPreviews]) {
      const label = labels[preview.dataset.theme];
      preview.setAttribute('aria-label', label);
      preview.title = label;
    }
  }
  onLanguageChange(translate);
  translate();
}
