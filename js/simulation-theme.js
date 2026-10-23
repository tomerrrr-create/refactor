import { getCurrentLang, onLanguageChange } from './i18n.js';

// Appearance preferences are independent of artwork and replay; profiles capture them.
const STORAGE_KEY = 'colorGridSimulationTheme';
const PLAYBACK_STORAGE_KEY = 'colorGridSimulationPlaybackTheme';
const LABELS = {
  en: {gold: 'Gold', blue: 'Blue', teal: 'Smoky turquoise', silver: 'Smoky silver', ice: 'Ice'},
  he: {gold: 'זהב', blue: 'כחול', teal: 'טורקיז מעושן', silver: 'כסף מעושן', ice: 'קרח'},
  ru: {gold: 'Золото', blue: 'Синий', teal: 'Дымчатая бирюза', silver: 'Дымчатое серебро', ice: 'Лёд'},
  nl: {gold: 'Goud', blue: 'Blauw', teal: 'Gedempt turkoois', silver: 'Gedempt zilver', ice: 'IJs'}
};
export function getSimulationTheme() {
  return document.documentElement.dataset.simulationTheme || 'blue';
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
  document.documentElement.toggleAttribute('data-simulation-running', Boolean(running));
  updateEffectiveTheme();
}

export function applySimulationTheme(value) {
  const theme = ['blue', 'gold', 'teal', 'silver', 'ice'].includes(value) ? value : 'blue';
  document.documentElement.dataset.simulationTheme = theme;
  for (const preview of document.querySelectorAll('#simulationThemeSettings [data-theme]')) {
    preview.setAttribute('aria-pressed', String(preview.dataset.theme === theme));
  }
  updateEffectiveTheme();
  try { localStorage.setItem(STORAGE_KEY, theme); return true; }
  catch { return false; /* Appearance still works for this session. */ }
}

export function applySimulationPlaybackTheme(value) {
  const theme = ['blue', 'gold', 'teal', 'silver', 'ice'].includes(value) ? value : 'gold';
  document.documentElement.dataset.simulationPlaybackTheme = theme;
  for (const preview of document.querySelectorAll('#simulationPlaybackThemeSettings [data-theme]')) {
    preview.setAttribute('aria-pressed', String(preview.dataset.theme === theme));
  }
  updateEffectiveTheme();
  try { localStorage.setItem(PLAYBACK_STORAGE_KEY, theme); return true; }
  catch { return false; }
}

export function initializeSimulationTheme() {
  const section = document.getElementById('simulationThemeSettings');
  const playbackSection = document.getElementById('simulationPlaybackThemeSettings');
  const previews = section.querySelectorAll('[data-theme]');
  const playbackPreviews = playbackSection.querySelectorAll('[data-theme]');
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Use the existing blue appearance. */ }
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
