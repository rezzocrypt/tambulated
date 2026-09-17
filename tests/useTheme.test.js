import { describe, it, expect, beforeEach, vi } from 'vitest';

async function loadTheme() {
  vi.resetModules();
  return import('../src/composables/useTheme.js');
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('useTheme', () => {
  it('defaults to system when nothing is stored', async () => {
    const { useTheme } = await loadTheme();
    expect(useTheme().theme.value).toBe('system');
  });

  it('setTheme persists and applies the data-theme attribute', async () => {
    const { useTheme } = await loadTheme();
    const { theme, setTheme } = useTheme();
    setTheme('dark');
    expect(theme.value).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    setTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('ignores unsupported themes', async () => {
    const { useTheme } = await loadTheme();
    const { theme, setTheme } = useTheme();
    setTheme('neon');
    expect(theme.value).toBe('system');
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('shares a single ref across calls', async () => {
    const { useTheme } = await loadTheme();
    const a = useTheme();
    const b = useTheme();
    a.setTheme('retro');
    expect(b.theme.value).toBe('retro');
  });

  it('initializeTheme reads the stored theme', async () => {
    localStorage.setItem('theme', 'retro');
    const { initializeTheme, useTheme } = await loadTheme();
    initializeTheme();
    expect(useTheme().theme.value).toBe('retro');
    expect(document.documentElement.getAttribute('data-theme')).toBe('retro');
  });
});