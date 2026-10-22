import { getCurrentLang, onLanguageChange } from './i18n.js';

// A local appearance preference, independent of artwork, profiles and replay.
const STORAGE_KEY = 'colorGridSimulationTheme';
const LABELS = {
  en: {gold: 'Gold', blue: 'Blue', teal: 'Smoky turquoise'},
  he: {gold: 'זהב', blue: 'כחול', teal: 'טורקיז מעושן'},
  ru: {gold: 'Золото', blue: 'Синий', teal: 'Дымчатая бирюза'},
  nl: {gold: 'Goud', blue: 'Blauw', teal: 'Gedempt turkoois'}
};
export function getSimulationTheme() {
  return document.documentElement.dataset.simulationTheme || 'blue';
}

// Transient playback feedback must never become a saved profile preference.
export function setSimulationRunning(running) {
  document.documentElement.toggleAttribute('data-simulation-running', Boolean(running));
}

export function applySimulationTheme(value) {
  const theme = ['blue', 'gold', 'teal'].includes(value) ? value : 'blue';
  document.documentElement.dataset.simulationTheme = theme;
  for (const preview of document.querySelectorAll('#simulationThemeSettings [data-theme]')) {
    preview.setAttribute('aria-pressed', String(preview.dataset.theme === theme));
  }
  try { localStorage.setItem(STORAGE_KEY, theme); return true; }
  catch { return false; /* Appearance still works for this session. */ }
}

export function initializeSimulationTheme() {
  const section = document.getElementById('simulationThemeSettings');
  const previews = section.querySelectorAll('[data-theme]');
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Use the existing blue appearance. */ }
  applySimulationTheme(saved);
  for (const preview of previews) {
    preview.addEventListener('click', () => applySimulationTheme(preview.dataset.theme));
  }
  function translate() {
    const labels = LABELS[getCurrentLang()] || LABELS.en;
    for (const preview of previews) {
      const label = labels[preview.dataset.theme];
      preview.setAttribute('aria-label', label);
      preview.title = label;
    }
  }
  onLanguageChange(translate);
  translate();
}
