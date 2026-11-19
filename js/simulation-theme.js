import { getCurrentLang, getText, onLanguageChange } from './i18n.js';
import { SIMULATION_THEME_COLORS } from './workspace-settings.js';

const LABELS = {
  en: {gold: 'Gold', blue: 'Blue', teal: 'Smoky turquoise', 'dark-blue': 'Dark blue', 'light-blue': 'Light blue'},
  he: {gold: 'זהב', blue: 'כחול', teal: 'טורקיז מעושן', 'dark-blue': 'כחול כהה', 'light-blue': 'כחול בהיר'},
  ru: {gold: 'Золото', blue: 'Синий', teal: 'Дымчатая бирюза', 'dark-blue': 'Тёмно-синий', 'light-blue': 'Светло-синий'},
  nl: {gold: 'Goud', blue: 'Blauw', teal: 'Gedempt turkoois', 'dark-blue': 'Donkerblauw', 'light-blue': 'Lichtblauw'}
};

let visibleDrawer = 0;
const restField = drawer => drawer === 1 ? 'simulationThemeSecond' : 'simulationTheme';
const playbackField = 'simulationPlaybackTheme';
const storageKey = field => 'colorGrid' + field[0].toUpperCase() + field.slice(1);
const buttons = field => document.querySelectorAll('#' + field + 'Settings [data-theme]');

export function getSimulationTheme(drawer = 0) {
  return document.documentElement.dataset[restField(drawer)] || 'gold';
}

export function getSimulationPlaybackTheme() {
  return document.documentElement.dataset[playbackField] || 'gold';
}

function updateEffectiveTheme() {
  const root = document.documentElement;
  const restingTheme = getSimulationTheme(visibleDrawer);
  root.dataset.simulationBackdropTheme = restingTheme;
  root.dataset.simulationEffectiveTheme = root.hasAttribute('data-simulation-running')
    ? getSimulationPlaybackTheme() : restingTheme;
}

export function setSimulationThemePage(drawer) {
  visibleDrawer = drawer;
  updateEffectiveTheme();
}

export function setSimulationRunning(running) {
  document.documentElement.toggleAttribute('data-simulation-running', Boolean(running));
  updateEffectiveTheme();
}

function applyTheme(value, field) {
  const theme = SIMULATION_THEME_COLORS.includes(value) ? value : 'gold';
  document.documentElement.dataset[field] = theme;
  for (const preview of buttons(field)) {
    preview.setAttribute('aria-pressed', String(preview.dataset.theme === theme));
  }
  updateEffectiveTheme();
  try { localStorage.setItem(storageKey(field), theme); return true; }
  catch { return false; }
}

export function applySimulationTheme(value, drawer = 0) {
  return applyTheme(value, restField(drawer));
}

export function applySimulationPlaybackTheme(value) {
  return applyTheme(value, playbackField);
}

export function initializeSimulationTheme() {
  const previews = [];
  for (const field of [restField(0), restField(1), playbackField]) {
    let saved;
    try { saved = localStorage.getItem(storageKey(field)); } catch { /* Use the session default. */ }
    // The second drawer inherits the old shared resting choice on first use.
    applyTheme(saved ?? (field === restField(1) ? getSimulationTheme() : undefined), field);
    for (const preview of buttons(field)) {
      preview.addEventListener('click', () => applyTheme(preview.dataset.theme, field));
      previews.push(preview);
    }
  }
  function translate() {
    const labels = LABELS[getCurrentLang()] || LABELS.en;
    for (const preview of previews) {
      const label = labels[preview.dataset.theme];
      preview.setAttribute('aria-label', label);
      preview.title = label;
    }
    for (const heading of document.querySelectorAll('[data-drawer-theme-title]')) {
      heading.textContent = getText('drawer_page').replace('{n}', heading.dataset.drawerThemeTitle);
    }
  }
  onLanguageChange(translate);
  translate();
}
