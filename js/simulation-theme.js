import { getCurrentLang, onLanguageChange } from './i18n.js';

// Appearance preferences are independent of artwork and replay; profiles capture them.
const STORAGE_KEY = 'colorGridSimulationTheme';
const DRAWER_COLORS_STORAGE_KEY = 'colorGridSimulationDrawerColors';
const DEFAULT_DRAWER_COLORS = Object.freeze(['pine-green', 'blue', 'burgundy']);
export const SIMULATION_PLAYBACK_THEME = 'gold';
export const SIMULATION_DRAWER_COLORS = Object.freeze(['blue', 'gold', 'burgundy', 'pine-green', 'ink-violet', 'warm-charcoal']);
let drawerColors = [...DEFAULT_DRAWER_COLORS];
const GLOW_PULSE_STORAGE_KEY = 'colorGridGlowPulseSeconds';
const GLOW_PULSE_SECONDS = [0.6, 1, 1.6, 2.4, 3.2, 4, 4.8];
const DEFAULT_GLOW_PULSE_SECONDS = 3.2;
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

function updateEffectiveTheme() {
  const root = document.documentElement;
  const running = root.hasAttribute('data-simulation-running');
  const theme = running ? SIMULATION_PLAYBACK_THEME : getSimulationTheme();
  root.dataset.simulationEffectiveTheme = theme;
}

// Running state is transient.
export function setSimulationRunning(running) {
  document.documentElement.toggleAttribute('data-simulation-running', Boolean(running));
  updateEffectiveTheme();
}

export function applySimulationTheme(value) {
  const theme = RETIRED_DARK_THEMES.includes(value) ? 'blue' : isSimulationTheme(value) ? value : 'gold';
  document.documentElement.dataset.simulationTheme = theme;
  updateEffectiveTheme();
  try { localStorage.setItem(STORAGE_KEY, theme); return true; }
  catch { return false; /* Appearance still works for this session. */ }
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

function initializeDrawerBorder() {
  const toggle = document.getElementById('keepSimulationDrawersToggle');
  const apply = () => document.documentElement.toggleAttribute('data-keep-simulation-drawer-border', toggle.checked);
  toggle.checked = true;
  apply();
  toggle.addEventListener('change', apply);
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
    const units = { style: 'unit', unit: 'second', maximumFractionDigits: 1 };
    value.value = new Intl.NumberFormat(getCurrentLang(), { ...units, minimumFractionDigits: 1, unitDisplay: 'narrow' }).format(duration);
    slider.setAttribute('aria-valuetext', new Intl.NumberFormat(getCurrentLang(), { ...units, minimumFractionDigits: 1, unitDisplay: 'long' }).format(duration));
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
  initializeDrawerBorder();
  let savedDrawerColors;
  try { savedDrawerColors = JSON.parse(localStorage.getItem(DRAWER_COLORS_STORAGE_KEY)); } catch {}
  drawerColors = DEFAULT_DRAWER_COLORS.map((color, page) =>
    Array.isArray(savedDrawerColors) && SIMULATION_DRAWER_COLORS.includes(savedDrawerColors[page]) ? savedDrawerColors[page] : color
  );
  initializeGlowPulse();
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Use the default gold appearance. */ }
  applySimulationTheme(saved);
}
