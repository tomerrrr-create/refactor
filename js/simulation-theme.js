import { getCurrentLang, onLanguageChange } from './i18n.js';

// A local appearance preference, independent of artwork, profiles and replay.
const STORAGE_KEY = 'colorGridSimulationTheme';
const LABELS = {
  en: {gold: 'Gold', blue: 'Blue'},
  he: {gold: 'זהב', blue: 'כחול'},
  ru: {gold: 'Золото', blue: 'Синий'},
  nl: {gold: 'Goud', blue: 'Blauw'}
};
export function initializeSimulationTheme() {
  const section = document.getElementById('simulationThemeSettings');
  const toggle = document.getElementById('simulationThemeToggle');
  function apply(value) {
    const theme = value === 'gold' ? 'gold' : 'blue';
    document.documentElement.dataset.simulationTheme = theme;
    toggle.checked = theme === 'gold';
    translate();
    return theme;
  }
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Use the existing blue appearance. */ }
  apply(saved);
  toggle.addEventListener('change', () => {
    const theme = apply(toggle.checked ? 'gold' : 'blue');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* Appearance still works for this session. */ }
  });
  function translate() {
    const labels = LABELS[getCurrentLang()] || LABELS.en;
    toggle.setAttribute('aria-label', `Themes: ${labels.gold} / ${labels.blue}`);
    section.title = toggle.checked ? labels.gold : labels.blue;
  }
  onLanguageChange(translate);
  translate();
}
