import { ref } from 'vue';

const THEME_KEY = 'theme';
const THEMES = ['system', 'light', 'dark', 'retro'];

function readStoredTheme() {
  const value = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
  return THEMES.includes(value) ? value : 'system';
}

export function applyTheme(value) {
  if (value === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', value);
  }
}

export function initializeTheme() {
  applyTheme(readStoredTheme());
}

export function useTheme() {
  const theme = ref(readStoredTheme());
  applyTheme(theme.value);

  function setTheme(value) {
    if (!THEMES.includes(value)) return;
    theme.value = value;
    localStorage.setItem(THEME_KEY, value);
    applyTheme(value);
  }

  return { theme, setTheme, themes: THEMES };
}