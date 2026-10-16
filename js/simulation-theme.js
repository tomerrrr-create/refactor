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
  const toggle = document.getElementById('btnConfigureThemes');
  const options = document.getElementById('simulationThemeOptions');
  const siblings = ['btnConfigureInit', 'btnConfigureStartup'].map(id => document.getElementById(id));
  function expand(open) {
    toggle.setAttribute('aria-expanded', String(open));
    options.hidden = !open;
  }
  toggle.addEventListener('click', () => {
    const open = options.hidden;
    if (open) siblings.forEach(button => {
      document.getElementById(button.getAttribute('aria-controls')).hidden = true;
      button.setAttribute('aria-expanded', 'false');
    });
    expand(open);
  });
  siblings.forEach(button => button.addEventListener('click', () => expand(false)));
  document.getElementById('technicianDialog').addEventListener('close', () => expand(false));
  const inputs = [...section.querySelectorAll('input[name="simulationTheme"]')];
  function apply(value) {
    const theme = value === 'gold' ? 'gold' : 'blue';
    document.documentElement.dataset.simulationTheme = theme;
    inputs.forEach(input => { input.checked = input.value === theme; });
    return theme;
  }
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Use the existing blue appearance. */ }
  apply(saved);
  section.addEventListener('change', event => {
    if (!inputs.includes(event.target) || !event.target.checked) return;
    const theme = apply(event.target.value);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* Appearance still works for this session. */ }
  });
  function translate() {
    const labels = LABELS[getCurrentLang()] || LABELS.en;
    section.querySelectorAll('[data-theme-label]').forEach(label => {
      label.textContent = labels[label.dataset.themeLabel];
    });
  }
  onLanguageChange(translate);
  translate();
}
