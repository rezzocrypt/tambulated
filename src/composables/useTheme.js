import { ref } from 'vue';

const THEME_KEY = 'theme';
const THEMES = ['system', 'light', 'dark', 'retro'];

function readStoredTheme() {
  const value = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
  return THEMES.includes(value) ? value : 'system';
}

const theme = ref(readStoredTheme());

export function applyTheme(value) {
  if (value === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', value);
  }
}

export function initializeTheme() {
  theme.value = readStoredTheme();
  applyTheme(theme.value);
}

export function useTheme() {
  function setTheme(value) {
    if (!THEMES.includes(value)) return;
    theme.value = value;
    localStorage.setItem(THEME_KEY, value);
    applyTheme(value);
  }

  return { theme, setTheme, themes: THEMES };
}