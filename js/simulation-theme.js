import { getCurrentLang, getText, onLanguageChange } from './i18n.js';
import { SIMULATION_THEME_COLORS } from './workspace-settings.js';

const LABELS = {
  en: {gold: 'Gold', blue: 'Blue', teal: 'Smoky turquoise', 'dark-blue': 'Dark blue', 'light-blue': 'Light blue'},
  he: {gold: 'זהב', blue: 'כחול', teal: 'טורקיז מעושן', 'dark-blue': 'כחול כהה', 'light-blue': 'כחול בהיר'},
  ru: {gold: 'Золото', blue: 'Синий', teal: 'Дымчатая бирюза', 'dark-blue': 'Тёмно-синий', 'light-blue': 'Светло-синий'},
  nl: {gold: 'Goud', blue: 'Blauw', teal: 'Gedempt turkoois', 'dark-blue': 'Donkerblauw', 'light-blue': 'Lichtblauw'}
};

let visibleDrawer = 0;
const themeField = (drawer, running) => {
  const base = running ? 'simulationPlaybackTheme' : 'simulationTheme';
  return drawer === 1 ? base + 'Second' : base;
};
const storageKey = field => 'colorGrid' + field[0].toUpperCase() + field.slice(1);
const buttons = field => document.querySelectorAll('#' + field + 'Settings [data-theme]');

export function getSimulationTheme(drawer = 0) {
  return document.documentElement.dataset[themeField(drawer, false)] || 'gold';
}

export function getSimulationPlaybackTheme(drawer = 0) {
  return document.documentElement.dataset[themeField(drawer, true)] || 'gold';
}

function updateEffectiveTheme() {
  const root = document.documentElement;
  root.dataset.simulationEffectiveTheme = root.hasAttribute('data-simulation-running')
    ? getSimulationPlaybackTheme(visibleDrawer) : getSimulationTheme(visibleDrawer);
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
  return applyTheme(value, themeField(drawer, false));
}

export function applySimulationPlaybackTheme(value, drawer = 0) {
  return applyTheme(value, themeField(drawer, true));
}

export function initializeSimulationTheme() {
  const previews = [];
  for (const drawer of [0, 1]) {
    for (const running of [false, true]) {
      const field = themeField(drawer, running);
      let saved;
      try { saved = localStorage.getItem(storageKey(field)); } catch { /* Use the session default. */ }
      // Older installations had one shared choice per playback state.
      applyTheme(saved ?? document.documentElement.dataset[themeField(0, running)], field);
      for (const preview of buttons(field)) {
        preview.addEventListener('click', () => applyTheme(preview.dataset.theme, field));
        previews.push(preview);
      }
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
