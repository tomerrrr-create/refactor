import { getCurrentLang, onLanguageChange } from './i18n.js';

// Appearance preferences are independent of artwork and replay; profiles capture them.
const STORAGE_KEY = 'colorGridSimulationTheme';
const PLAYBACK_STORAGE_KEY = 'colorGridSimulationPlaybackTheme';
const GOLD_HIERARCHY_STORAGE_KEY = 'colorGridGoldPlaybackHierarchy';
const GOLD_SORT_EXEMPTION_STORAGE_KEY = 'colorGridGoldExcludeSort';
const DRAWER_COLORS_STORAGE_KEY = 'colorGridSimulationDrawerColors';
const DEFAULT_DRAWER_COLORS = Object.freeze(['blue', 'gold', 'burgundy']);
export const SIMULATION_DRAWER_COLORS = Object.freeze([...DEFAULT_DRAWER_COLORS, 'pine-green', 'ink-violet', 'warm-charcoal']);
let drawerColors = [...DEFAULT_DRAWER_COLORS];
const GLOW_PULSE_STORAGE_KEY = 'colorGridGlowPulseSeconds';
const GLOW_PULSE_SECONDS = [0.6, 1, 1.6, 2.4, 3.2, 4, 4.8];
const DEFAULT_GLOW_PULSE_SECONDS = 3.2;
const GOLD_TRANSITION_STORAGE_KEY = 'colorGridGoldTransitionSeconds';
const GOLD_TRANSITION_SECONDS = [0.8, 1.2, 1.6, 2.2, 3.2];
const DEFAULT_GOLD_TRANSITION_SECONDS = 1.6;
let goldTransitionMs = DEFAULT_GOLD_TRANSITION_SECONDS * 1000;
let goldPlaybackTransition;
const RETIRED_DARK_THEMES = ['graphite', 'graphite-edge', 'graphite-dust', 'deep-blue'];
const LABELS = {
  en: {gold: 'Gold', blue: 'Blue', teal: 'Smoky turquoise', 'moon-silver': 'Moon Silver', ivory: 'Ivory', 'dark-gray': 'Dark Gray'},
  he: {gold: 'זהב', blue: 'כחול', teal: 'טורקיז מעושן', 'moon-silver': 'כסף ירחי', ivory: 'שנהב', 'dark-gray': 'אפור כהה'},
  ru: {gold: 'Золото', blue: 'Синий', teal: 'Дымчатая бирюза', 'moon-silver': 'Лунное серебро', ivory: 'Слоновая кость', 'dark-gray': 'Тёмно-серый'},
  nl: {gold: 'Goud', blue: 'Blauw', teal: 'Gedempt turkoois', 'moon-silver': 'Maanzilver', ivory: 'Ivoor', 'dark-gray': 'Donkergrijs'}
};

const DRAWER_COLOR_LABELS = {
  en: {burgundy: 'Burgundy', 'pine-green': 'Pine Green', 'ink-violet': 'Ink Violet', 'warm-charcoal': 'Warm Charcoal'},
  he: {burgundy: 'בורדו', 'pine-green': 'ירוק אורן', 'ink-violet': 'סגול דיו', 'warm-charcoal': 'פחם חם'},
  ru: {burgundy: 'Бордовый', 'pine-green': 'Хвойный зелёный', 'ink-violet': 'Чернильный фиолетовый', 'warm-charcoal': 'Тёплый угольный'},
  nl: {burgundy: 'Bordeaux', 'pine-green': 'Dengroen', 'ink-violet': 'Inktviolet', 'warm-charcoal': 'Warm antraciet'}
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
  const running = root.hasAttribute('data-simulation-running');
  const theme = running ? getSimulationPlaybackTheme() : getSimulationTheme();
  root.dataset.simulationEffectiveTheme = theme;
  goldPlaybackTransition?.sync(running);
}

// Running state is transient; only the two chosen colors are saved.
export function setSimulationRunning(running) {
  document.documentElement.toggleAttribute('data-simulation-running', Boolean(running));
  updateEffectiveTheme();
}

function createGoldPlaybackTransition(toolbar) {
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const utilities = toolbar.querySelectorAll('#btnSave, #btnToggleSimMode');
  let enabled = false, running = false, position = 0, frame = null, previousTime = 0;

  function syncUtilities() {
    const hidden = position >= .5;
    toolbar.toggleAttribute('data-gold-playback-utilities-hidden', hidden);
    for (const button of utilities) {
      button.toggleAttribute('inert', running || hidden);
    }
  }

  function render() {
    const progress = position * position * (3 - 2 * position);
    toolbar.style.setProperty('--gold-playback-progress', progress.toFixed(4));
    syncUtilities();
  }

  function advance(now) {
    const delta = Math.max(0, now - previousTime) / goldTransitionMs;
    position = running ? Math.min(1, position + delta) : Math.max(0, position - delta);
    previousTime = now;
    render();
    const settled = position === Number(running);
    if (settled) toolbar.removeAttribute('data-gold-playback-moving');
    frame = settled ? null : requestAnimationFrame(advance);
  }

  reducedMotion.addEventListener('change', updateEffectiveTheme);
  return {
    sync(nextRunning) {
      const nextEnabled = root.hasAttribute('data-gold-playback-hierarchy') &&
        getSimulationPlaybackTheme() === 'gold' && !reducedMotion.matches;
      if (enabled !== nextEnabled) {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        enabled = nextEnabled;
        running = nextRunning;
        position = Number(running);
        toolbar.toggleAttribute('data-gold-playback-motion', enabled);
        if (enabled) render();
        else {
          toolbar.style.removeProperty('--gold-playback-progress');
          toolbar.removeAttribute('data-gold-playback-utilities-hidden');
          toolbar.removeAttribute('data-gold-playback-moving');
          for (const button of utilities) button.removeAttribute('inert');
        }
      } else if (enabled && running !== nextRunning) {
        running = nextRunning;
        syncUtilities();
        if (frame === null && position !== Number(running)) {
          toolbar.setAttribute('data-gold-playback-moving', '');
          previousTime = performance.now();
          frame = requestAnimationFrame(advance);
        }
      }
    }
  };
}

export function applySimulationTheme(value) {
  const theme = RETIRED_DARK_THEMES.includes(value) ? 'blue' : isSimulationTheme(value) ? value : 'gold';
  document.documentElement.dataset.simulationTheme = theme;
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
    updateEffectiveTheme();
    try { localStorage.setItem(GOLD_HIERARCHY_STORAGE_KEY, String(toggle.checked)); } catch {}
  });
}

function initializeGoldSortExemption() {
  const toggle = document.getElementById('goldExcludeSortToggle');
  const sort = document.getElementById('btnCycleSort');
  let excluded = true;
  try { excluded = localStorage.getItem(GOLD_SORT_EXEMPTION_STORAGE_KEY) !== 'false'; } catch {}
  toggle.checked = excluded;
  sort.toggleAttribute('data-gold-hierarchy-exempt', excluded);
  toggle.addEventListener('change', () => {
    sort.toggleAttribute('data-gold-hierarchy-exempt', toggle.checked);
    try { localStorage.setItem(GOLD_SORT_EXEMPTION_STORAGE_KEY, String(toggle.checked)); } catch {}
  });
}

export function getDrawerColor(page) {
  return drawerColors[page];
}

export function getThemeColorLabel(color) {
  const language = getCurrentLang();
  return (LABELS[language] || LABELS.en)[color] ?? (DRAWER_COLOR_LABELS[language] || DRAWER_COLOR_LABELS.en)[color];
}

export function setDrawerColor(page, color) {
  if (!Number.isInteger(page) || !DEFAULT_DRAWER_COLORS[page] || !SIMULATION_DRAWER_COLORS.includes(color)) return;
  drawerColors[page] = color;
  persistDrawerColors();
}

export function resetDrawerColors() {
  drawerColors = [...DEFAULT_DRAWER_COLORS];
  persistDrawerColors();
}

function persistDrawerColors() {
  try { localStorage.setItem(DRAWER_COLORS_STORAGE_KEY, JSON.stringify(drawerColors)); } catch {}
}

function initializeSessionSwitch(id, attribute) {
  const toggle = document.getElementById(id);
  const apply = () => document.documentElement.toggleAttribute(attribute, toggle.checked);
  toggle.checked = true;
  apply();
  toggle.addEventListener('change', apply);
}

function initializeDurationSlider(sliderId, storageKey, durations, defaultDuration, apply) {
  const slider = document.getElementById(sliderId);
  const value = document.getElementById(sliderId + 'Value');
  let savedIndex = -1;
  try { savedIndex = durations.indexOf(Number(localStorage.getItem(storageKey))); } catch {}
  slider.max = durations.length - 1;
  slider.value = savedIndex < 0 ? durations.indexOf(defaultDuration) : savedIndex;

  function render() {
    const duration = durations[slider.value];
    const units = { style: 'unit', unit: 'second', maximumFractionDigits: 1 };
    value.value = new Intl.NumberFormat(getCurrentLang(), { ...units, minimumFractionDigits: 1, unitDisplay: 'narrow' }).format(duration);
    slider.setAttribute('aria-valuetext', new Intl.NumberFormat(getCurrentLang(), { ...units, minimumFractionDigits: 1, unitDisplay: 'long' }).format(duration));
    apply(duration);
  }

  slider.addEventListener('input', () => {
    render();
    try { localStorage.setItem(storageKey, String(durations[slider.value])); } catch {}
  });
  onLanguageChange(render);
  render();
}

export function initializeSimulationTheme(toolbar) {
  if (toolbar) goldPlaybackTransition = createGoldPlaybackTransition(toolbar);
  initializeGoldPlaybackHierarchy();
  initializeGoldSortExemption();
  initializeSessionSwitch('keepSimulationDrawersToggle', 'data-keep-simulation-drawers');
  initializeSessionSwitch('individualDrawerColorsToggle', 'data-individual-drawer-colors');
  let savedDrawerColors;
  try { savedDrawerColors = JSON.parse(localStorage.getItem(DRAWER_COLORS_STORAGE_KEY)); } catch {}
  drawerColors = DEFAULT_DRAWER_COLORS.map((color, page) =>
    Array.isArray(savedDrawerColors) && SIMULATION_DRAWER_COLORS.includes(savedDrawerColors[page]) ? savedDrawerColors[page] : color
  );
  initializeDurationSlider('glowPulse', GLOW_PULSE_STORAGE_KEY, GLOW_PULSE_SECONDS, DEFAULT_GLOW_PULSE_SECONDS,
    duration => document.documentElement.style.setProperty('--simulation-halo-duration', `${duration}s`));
  initializeDurationSlider('goldTransitionDuration', GOLD_TRANSITION_STORAGE_KEY, GOLD_TRANSITION_SECONDS, DEFAULT_GOLD_TRANSITION_SECONDS,
    duration => { goldTransitionMs = duration * 1000; });
  const playbackSection = document.getElementById('simulationPlaybackThemeSettings');
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
  function translate() {
    for (const preview of playbackPreviews) {
      const label = getThemeColorLabel(preview.dataset.theme);
      preview.setAttribute('aria-label', label);
      preview.title = label;
    }
  }
  onLanguageChange(translate);
  translate();
}
