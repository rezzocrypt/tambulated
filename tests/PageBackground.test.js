import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import PageBackground from '../src/components/Common/PageBackground.vue';

function stubImage() {
  class MockImage {
    constructor() {
      this._onload = null;
      this._src = '';
    }
    set onload(fn) {
      this._onload = fn;
    }
    get onload() {
      return this._onload;
    }
    set src(value) {
      this._src = value;
      queueMicrotask(() => {
        if (this._onload) this._onload();
      });
    }
    get src() {
      return this._src;
    }
  }
  vi.stubGlobal('Image', MockImage);
}

function stubFetch(result) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(result)));
}

function today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function bg() {
  return document.body.querySelector('.page-bg');
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  localStorage.clear();
});

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('PageBackground', () => {
  it('renders the fallback layer immediately', async () => {
    stubImage();
    stubFetch({ json: () => Promise.resolve({}) });
    const wrapper = mount(PageBackground);
    await flushPromises();
    const defaultLayer = bg().querySelector('.bg-layer.default');
    expect(defaultLayer.style.backgroundImage).toContain('defaultbg.jpg');
    expect(bg().querySelector('.bg-layer.live').classList.contains('loaded')).toBe(false);
    wrapper.unmount();
  });

  it('fades in the fetched image after it is preloaded', async () => {
    stubImage();
    stubFetch({ json: () => Promise.resolve({ url: 'https://bing.example/img.jpg' }) });
    const wrapper = mount(PageBackground);
    await flushPromises();
    const live = bg().querySelector('.bg-layer.live');
    expect(live.classList.contains('loaded')).toBe(true);
    expect(live.style.backgroundImage).toContain('https://bing.example/img.jpg');
    expect(localStorage.getItem('background')).toBe('https://bing.example/img.jpg');
    expect(localStorage.getItem('backgroundDate')).toBe(today());
    wrapper.unmount();
  });

  it('uses the cached background without fetching', async () => {
    const cached = 'https://img.example/cached.jpg';
    localStorage.setItem('background', cached);
    localStorage.setItem('backgroundDate', today());
    stubImage();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const wrapper = mount(PageBackground);
    await flushPromises();
    const live = bg().querySelector('.bg-layer.live');
    expect(live.classList.contains('loaded')).toBe(true);
    expect(live.style.backgroundImage).toContain(cached);
    expect(fetchSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('keeps the default background when the fetch fails', async () => {
    stubImage();
    stubFetch({ json: () => Promise.reject(new Error('network')) });
    const wrapper = mount(PageBackground);
    await flushPromises();
    const live = bg().querySelector('.bg-layer.live');
    expect(live.classList.contains('loaded')).toBe(false);
    expect(live.style.backgroundImage).toBe('');
    wrapper.unmount();
  });
});