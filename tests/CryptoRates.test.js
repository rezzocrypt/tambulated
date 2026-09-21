import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import CryptoRates from '../src/components/Common/CryptoRates.vue';
import { useLocale } from '@/composables/useLocale.js';
import {
  DEFAULT_COINS,
  CACHE_KEY,
  COINS_KEY,
  useCryptoRatesConfig,
} from '@/composables/useCryptoRates.js';

const API_DATA = {
  bitcoin: { usd: 65000.5, usd_24h_change: 2.5 },
  ethereum: { usd: 3500.25, usd_24h_change: -1.2 },
  dogecoin: { usd: 0.13, usd_24h_change: 3.3 },
};

const SEARCH_DATA = {
  coins: [
    { id: 'bitcoin', name: 'Bitcoin', api_symbol: 'btc', symbol: 'btc' },
    { id: 'dogecoin', name: 'Dogecoin', api_symbol: 'doge', symbol: 'doge' },
  ],
};

function normalizedData() {
  return DEFAULT_COINS.map((c) => ({ ...c, price: API_DATA[c.id].usd, change24h: API_DATA[c.id].usd_24h_change }));
}

function mockApi({ prices = API_DATA, ok = true, search = SEARCH_DATA } = {}) {
  const fn = vi.fn((url) => {
    if (String(url).includes('/search')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(search) });
    }
    return Promise.resolve({ ok, json: () => Promise.resolve(prices) });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function resetConfig() {
  const { coins, selected, addCoin, toggleCoin, removeCoin } = useCryptoRatesConfig();
  const defIds = DEFAULT_COINS.map((c) => c.id);
  [...coins.value].forEach((c) => {
    if (!defIds.includes(c.id)) removeCoin(c.id);
  });
  DEFAULT_COINS.forEach((c) => {
    if (!coins.value.some((x) => x.id === c.id)) addCoin(c);
    if (!selected.value.includes(c.id)) toggleCoin(c.id);
  });
}

function selectOnly(ids) {
  const { selected, toggleCoin } = useCryptoRatesConfig();
  const target = new Set(ids);
  DEFAULT_COINS.forEach((c) => {
    if (selected.value.includes(c.id) !== target.has(c.id)) toggleCoin(c.id);
  });
}

beforeEach(() => {
  localStorage.clear();
  useLocale().setLocale('ru');
  resetConfig();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('CryptoRates', () => {
  it('fetches and renders rates for the default coins', async () => {
    const fetchMock = mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const items = wrapper.findAll('.crypto-item');
    expect(items).toHaveLength(2);
    expect(items[0].find('.crypto-symbol').text()).toBe('BTC');
    expect(items[0].find('.crypto-change').classes()).toContain('up');
    expect(items[1].find('.crypto-change').classes()).toContain('down');
    wrapper.unmount();
  });

  it('stores fetched rates in localStorage with a timestamp', async () => {
    mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY));
    expect(raw.timestamp).toBe(Date.now());
    expect(Array.isArray(raw.data)).toBe(true);
    expect(raw.data).toHaveLength(2);
    wrapper.unmount();
  });

  it('uses the cache without fetching when it is fresh', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now() - 1000,
      data: normalizedData(),
    }));
    const fetchMock = mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.findAll('.crypto-item')).toHaveLength(2);
    wrapper.unmount();
  });

  it('refetches when the cache is older than an hour', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now() - 61 * 60 * 1000,
      data: normalizedData(),
    }));
    const fetchMock = mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('falls back to stale cache when the request fails', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now() - 61 * 60 * 1000,
      data: normalizedData(),
    }));
    const fetchMock = mockApi({ ok: false });
    const wrapper = mount(CryptoRates);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll('.crypto-item')).toHaveLength(2);
    wrapper.unmount();
  });

  it('shows an error when the request fails and no cache exists', async () => {
    mockApi({ ok: false });
    const wrapper = mount(CryptoRates);
    await flushPromises();
    expect(wrapper.find('.crypto-error').text()).toBe('Не удалось получить курсы');
    wrapper.unmount();
  });

  it('renders only coins from the stored selection', async () => {
    selectOnly(['ethereum']);
    const fetchMock = mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const items = wrapper.findAll('.crypto-item');
    expect(items).toHaveLength(1);
    expect(items[0].find('.crypto-symbol').text()).toBe('ETH');
    wrapper.unmount();
  });

  it('requests only selected coins from the API', async () => {
    selectOnly(['bitcoin']);
    const fetchMock = mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('ids=bitcoin');
    wrapper.unmount();
  });

  it('shows an empty state and skips fetching when nothing is selected', async () => {
    selectOnly([]);
    const fetchMock = mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.find('.crypto-item').exists()).toBe(false);
    expect(wrapper.find('.crypto-status').text()).toBe('Выберите монеты в настройках');
    wrapper.unmount();
  });

  it('refetches when a newly selected coin is missing from the cache', async () => {
    selectOnly(['bitcoin']);
    const first = mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();
    expect(first).toHaveBeenCalledTimes(1);

    const { toggleCoin } = useCryptoRatesConfig();
    toggleCoin('ethereum');
    await flushPromises();
    expect(first).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('opens and closes the settings panel', async () => {
    mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();
    expect(wrapper.find('.crypto-panel').exists()).toBe(false);
    await wrapper.find('.crypto-gear').trigger('click');
    expect(wrapper.find('.crypto-panel').exists()).toBe(true);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.find('.crypto-panel').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows a newly added coin immediately without a reload', async () => {
    selectOnly(['bitcoin']);
    const fetchMock = mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();
    expect(wrapper.findAll('.crypto-item')).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    useCryptoRatesConfig().addCoin({ id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' });
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const items = wrapper.findAll('.crypto-item');
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.find('.crypto-symbol').text())).toEqual(['BTC', 'DOGE']);
    wrapper.unmount();
  });

  it('searches for and adds a new coin via the panel', async () => {
    selectOnly(['bitcoin']);
    const fetchMock = mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();

    await wrapper.find('.crypto-gear').trigger('click');
    await wrapper.find('.crypto-search-input').setValue('doge');
    vi.advanceTimersByTime(400);
    await flushPromises();

    const results = wrapper.findAll('.crypto-result');
    expect(results.map((r) => r.find('.crypto-sym').text())).toEqual(['DOGE']);
    expect(results.map((r) => r.find('.crypto-name').text())).toEqual(['Dogecoin']);

    await results[0].trigger('click');
    const { isSelected } = useCryptoRatesConfig();
    expect(isSelected('dogecoin')).toBe(true);
    expect(wrapper.findAll('.crypto-opt')).toHaveLength(3);
    const priceCalls = fetchMock.mock.calls.filter(([url]) => !String(url).includes('/search'));
    expect(priceCalls).toHaveLength(2);

    const storedCoins = JSON.parse(localStorage.getItem(COINS_KEY));
    expect(storedCoins.v).toBe(2);
    expect(storedCoins.list.some((c) => c.id === 'dogecoin')).toBe(true);
    wrapper.unmount();
  });

  it('removes a default coin via its delete button', async () => {
    mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();

    await wrapper.find('.crypto-gear').trigger('click');
    const btcRow = wrapper.findAll('.crypto-opt-row').find((r) => r.find('.crypto-sym').text() === 'BTC');
    await btcRow.find('.crypto-opt-remove').trigger('click');

    const { selected, coins } = useCryptoRatesConfig();
    expect(coins.value.some((c) => c.id === 'bitcoin')).toBe(false);
    expect(selected.value.includes('bitcoin')).toBe(false);
    expect(wrapper.findAll('.crypto-item')).toHaveLength(1);
    wrapper.unmount();
  });

  it('removes a custom coin via its delete button', async () => {
    mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();
    useCryptoRatesConfig().addCoin({ id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' });
    await flushPromises();

    await wrapper.find('.crypto-gear').trigger('click');
    const dogeRow = wrapper.findAll('.crypto-opt-row').find((r) => r.find('.crypto-sym').text() === 'DOGE');
    await dogeRow.find('.crypto-opt-remove').trigger('click');

    const { selected, coins } = useCryptoRatesConfig();
    expect(coins.value.some((c) => c.id === 'dogecoin')).toBe(false);
    expect(selected.value.includes('dogecoin')).toBe(false);
    wrapper.unmount();
  });

  it('reorders coins by drag and drop', async () => {
    const fetchMock = mockApi();
    const wrapper = mount(CryptoRates);
    await flushPromises();

    await wrapper.find('.crypto-gear').trigger('click');
    const rows = wrapper.findAll('.crypto-opt-row');
    expect(rows).toHaveLength(2);
    wrapper.vm.onDragStart(0, {});
    wrapper.vm.onDragOver(1);
    wrapper.vm.onDrop(1);

    const { coins, selected } = useCryptoRatesConfig();
    expect(coins.value.map((c) => c.id)).toEqual(['ethereum', 'bitcoin']);
    expect(selected.value).toEqual(['ethereum', 'bitcoin']);

    const storedCoins = JSON.parse(localStorage.getItem(COINS_KEY));
    expect(storedCoins.list.map((c) => c.id)).toEqual(['ethereum', 'bitcoin']);

    await flushPromises();
    const items = wrapper.findAll('.crypto-item');
    expect(items.map((i) => i.find('.crypto-symbol').text())).toEqual(['ETH', 'BTC']);

    const priceCalls = fetchMock.mock.calls.filter(([url]) => !String(url).includes('/search'));
    expect(priceCalls).toHaveLength(1);
    wrapper.unmount();
  });
});