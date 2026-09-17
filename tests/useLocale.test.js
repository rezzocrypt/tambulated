import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function setSystemLanguages(langs) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    get: () => langs,
  });
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    get: () => (langs && langs.length ? langs[0] : ''),
  });
}

async function loadLocale() {
  vi.resetModules();
  return import('../src/composables/useLocale.js');
}

beforeEach(() => {
  localStorage.clear();
  setSystemLanguages(['en-US', 'en']);
});

afterEach(() => {
  document.documentElement.lang = '';
});

describe('useLocale', () => {
  it('uses the stored locale when present', async () => {
    localStorage.setItem('locale', 'en');
    const { useLocale } = await loadLocale();
    expect(useLocale().current.value).toBe('en');
    expect(useLocale().t('home')).toBe('Home');
  });

  it('detects supported system locale from navigator.languages', async () => {
    setSystemLanguages(['zh-CN', 'zh']);
    const { useLocale } = await loadLocale();
    expect(useLocale().current.value).toBe('zh');
  });

  it('falls back to ru for unsupported system languages', async () => {
    setSystemLanguages(['fr-FR', 'de-DE']);
    const { useLocale } = await loadLocale();
    expect(useLocale().current.value).toBe('ru');
    expect(useLocale().t('home')).toBe('Главная');
  });

  it('setLocale updates ref, storage and document lang', async () => {
    localStorage.setItem('locale', 'ru');
    const { useLocale } = await loadLocale();
    const locale = useLocale();
    locale.setLocale('zh');
    expect(locale.current.value).toBe('zh');
    expect(localStorage.getItem('locale')).toBe('zh');
    expect(document.documentElement.lang).toBe('zh');
    expect(locale.t('home')).toBe('主页');
  });

  it('ignores unsupported locales', async () => {
    localStorage.setItem('locale', 'ru');
    const { useLocale } = await loadLocale();
    const locale = useLocale();
    locale.setLocale('fr');
    expect(locale.current.value).toBe('ru');
  });

  it('t falls back to ru then to the key itself', async () => {
    const { useLocale } = await loadLocale();
    const locale = useLocale();
    locale.setLocale('zh');
    expect(locale.t('home')).toBe('主页');
    expect(locale.t('missing-key')).toBe('missing-key');
  });

  it('toLocaleString maps locale codes and forwards options', async () => {
    localStorage.setItem('locale', 'zh');
    const { useLocale } = await loadLocale();
    const locale = useLocale();
    const spy = vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('mock-date');
    const out = locale.toLocaleString(new Date(0), { year: 'numeric' });
    expect(out).toBe('mock-date');
    expect(spy).toHaveBeenCalledWith('zh-CN', { year: 'numeric' });
    spy.mockRestore();
  });
});