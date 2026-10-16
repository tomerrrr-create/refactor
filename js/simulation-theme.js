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
  const toggle = document.getElementById('simulationThemeToggle');
  function apply(value) {
    const theme = ['blue', 'gold', 'teal'].includes(value) ? value : 'blue';
    document.documentElement.dataset.simulationTheme = theme;
    toggle.value = theme;
    translate();
    return theme;
  }
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Use the existing blue appearance. */ }
  apply(saved);
  toggle.addEventListener('change', () => {
    const theme = apply(toggle.value);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* Appearance still works for this session. */ }
  });
  function translate() {
    const labels = LABELS[getCurrentLang()] || LABELS.en;
    for (const option of toggle.options) option.textContent = labels[option.value];
    toggle.setAttribute('aria-label', `Themes: ${labels[toggle.value]}`);
    section.title = labels[toggle.value];
  }
  onLanguageChange(translate);
  translate();
}
