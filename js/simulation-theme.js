import { getCurrentLang, onLanguageChange } from './i18n.js';

// A local appearance preference, independent of artwork, profiles and replay.
const STORAGE_KEY = 'colorGridSimulationTheme';
const LABELS = {
  en: {gold: 'Gold', blue: 'Blue', teal: 'Smoky turquoise'},
  he: {gold: 'זהב', blue: 'כחול', teal: 'טורקיז מעושן'},
  ru: {gold: 'Золото', blue: 'Синий', teal: 'Дымчатая бирюза'},
  nl: {gold: 'Goud', blue: 'Blauw', teal: 'Gedempt turkoois'}
};
export function initializeSimulationTheme() {
  const section = document.getElementById('simulationThemeSettings');
  const previews = section.querySelectorAll('[data-theme]');
  function apply(value) {
    const theme = ['blue', 'gold', 'teal'].includes(value) ? value : 'blue';
    document.documentElement.dataset.simulationTheme = theme;
    for (const preview of previews) {
      preview.setAttribute('aria-pressed', String(preview.dataset.theme === theme));
    }
    translate();
    return theme;
  }
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Use the existing blue appearance. */ }
  apply(saved);
  for (const preview of previews) {
    preview.addEventListener('click', () => {
      const theme = apply(preview.dataset.theme);
      try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* Appearance still works for this session. */ }
    });
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
