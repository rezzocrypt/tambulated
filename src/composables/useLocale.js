import { ref } from 'vue';
import ru from '@/locales/ru.js';
import en from '@/locales/en.js';
import zh from '@/locales/zh.js';

const LOCALE_KEY = 'locale';
const SUPPORTED = ['ru', 'en', 'zh'];
const MESSAGES = { ru, en, zh };

const LOCALE_MAP = { ru: 'ru', en: 'en', zh: 'zh-CN' };

function detectSystemLocale() {
  const langs = typeof navigator !== 'undefined'
    ? (navigator.languages?.length ? navigator.languages : [navigator.language])
    : [];
  for (const raw of langs) {
    if (!raw) continue;
    const base = String(raw).toLowerCase().split('-')[0];
    if (SUPPORTED.includes(base)) return base;
  }
  return 'ru';
}

function getStored() {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(LOCALE_KEY) : null;
  return SUPPORTED.includes(v) ? v : detectSystemLocale();
}

const current = ref(getStored());

function applyAttr(locale) {
  document.documentElement.lang = locale;
}

export function initializeLocale() {
  current.value = getStored();
  applyAttr(current.value);
}

export function useLocale() {
  function setLocale(locale) {
    if (!SUPPORTED.includes(locale)) return;
    current.value = locale;
    localStorage.setItem(LOCALE_KEY, locale);
    applyAttr(locale);
  }

  function t(key) {
    return MESSAGES[current.value]?.[key] ?? MESSAGES.ru[key] ?? key;
  }

  function toLocaleString(date, options) {
    const code = LOCALE_MAP[current.value] || 'ru';
    return date.toLocaleString(code, options);
  }

  return { current, setLocale, t, toLocaleString, supported: SUPPORTED };
}