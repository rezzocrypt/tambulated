import { ref } from 'vue';

export const CACHE_KEY = 'crypto-rates-cache';
export const SELECTED_KEY = 'crypto-rates-selected';
export const COINS_KEY = 'crypto-rates-coins';
export const CACHE_TTL_MS = 60 * 60 * 1000;

const API_URL = 'https://api.coingecko.com/api/v3/simple/price';
const SEARCH_URL = 'https://api.coingecko.com/api/v3/search';
const COINS_VERSION = 2;

export const DEFAULT_COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
];

const DEFAULT_IDS = DEFAULT_COINS.map((c) => c.id);

function isValidCoin(c) {
  return c && typeof c.id === 'string' && c.id && typeof c.symbol === 'string' && c.symbol && typeof c.name === 'string' && c.name;
}

function readStoredCoins() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(COINS_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === COINS_VERSION && Array.isArray(parsed.list)) {
      return parsed.list.filter(isValidCoin);
    }
    if (Array.isArray(parsed)) {
      const custom = parsed.filter(isValidCoin).filter((c) => !DEFAULT_IDS.includes(c.id));
      return [...DEFAULT_COINS, ...custom];
    }
    return null;
  } catch {
    return null;
  }
}

function readStoredSelection() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SELECTED_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const coins = ref(readStoredCoins() ?? [...DEFAULT_COINS]);

function initSelection() {
  const stored = readStoredSelection();
  const ids = stored ?? [...DEFAULT_IDS];
  const known = new Set(coins.value.map((c) => c.id));
  return ids.filter((id) => known.has(id));
}

const selected = ref(initSelection());

function persistCoins() {
  try {
    localStorage.setItem(COINS_KEY, JSON.stringify({ v: COINS_VERSION, list: coins.value }));
  } catch {
    /* storage unavailable — keep coins in memory only */
  }
}

function persistSelection() {
  try {
    localStorage.setItem(SELECTED_KEY, JSON.stringify(selected.value));
  } catch {
    /* storage unavailable — keep selection in memory only */
  }
}

export function useCryptoRatesConfig() {
  function isSelected(id) {
    return selected.value.includes(id);
  }

  function toggleCoin(id) {
    if (!coins.value.some((c) => c.id === id)) return;
    selected.value = selected.value.includes(id)
      ? selected.value.filter((x) => x !== id)
      : [...selected.value, id];
    persistSelection();
  }

  function addCoin(coin) {
    if (!coin || !coin.id || !coin.symbol || !coin.name) return;
    if (!coins.value.some((c) => c.id === coin.id)) {
      coins.value = [...coins.value, { id: coin.id, symbol: coin.symbol, name: coin.name }];
      persistCoins();
    }
    if (!selected.value.includes(coin.id)) {
      selected.value = [...selected.value, coin.id];
      persistSelection();
    }
  }

  function removeCoin(id) {
    coins.value = coins.value.filter((c) => c.id !== id);
    selected.value = selected.value.filter((x) => x !== id);
    persistCoins();
    persistSelection();
  }

  function moveCoin(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= coins.value.length) return;
    if (toIndex < 0 || toIndex >= coins.value.length) return;
    const next = [...coins.value];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    coins.value = next;
    const order = next.map((c) => c.id);
    selected.value = order.filter((id) => selected.value.includes(id));
    persistCoins();
    persistSelection();
  }

  return { coins, selected, isSelected, toggleCoin, addCoin, removeCoin, moveCoin };
}

function parseCached() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isCacheFresh(timestamp) {
  return Date.now() - timestamp < CACHE_TTL_MS;
}

export function loadCryptoRates(ids = selected.value.slice()) {
  const cached = parseCached();
  if (!cached || !Array.isArray(cached.data) || !isCacheFresh(cached.timestamp)) return null;
  const have = new Set(cached.data.map((r) => r.id));
  if (!ids.every((id) => have.has(id))) return null;
  return { source: 'cache', data: cached.data };
}

export function loadStaleCryptoRates(ids = selected.value.slice()) {
  const cached = parseCached();
  if (!cached || !Array.isArray(cached.data)) return null;
  const data = ids.length ? cached.data.filter((r) => ids.includes(r.id)) : cached.data;
  return { source: 'stale', data, timestamp: cached.timestamp };
}

export function saveCryptoRates(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    /* storage unavailable — keep rates in memory only */
  }
}

function normalize(ids, coinMeta, raw) {
  return ids.map((id) => {
    const meta = coinMeta.get(id) || { id };
    const entry = raw?.[id] || {};
    return {
      ...meta,
      price: Number.isFinite(entry.usd) ? entry.usd : null,
      change24h: Number.isFinite(entry.usd_24h_change) ? entry.usd_24h_change : null,
    };
  });
}

export async function fetchCryptoRates(ids = selected.value.slice()) {
  const coinMeta = new Map(coins.value.map((c) => [c.id, c]));
  const targets = ids.filter((id) => coinMeta.has(id));
  if (!targets.length) return [];
  const params = new URLSearchParams({
    ids: targets.join(','),
    vs_currencies: 'usd',
    include_24hr_change: 'true',
  });
  const res = await fetch(`${API_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = normalize(targets, coinMeta, await res.json());
  saveCryptoRates(data);
  return data;
}

export async function searchCryptoCoins(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const res = await fetch(`${SEARCH_URL}?query=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const existing = new Set(coins.value.map((c) => c.id));
  return (json.coins || [])
    .map((c) => ({ id: c.id, symbol: (c.symbol || '').toUpperCase(), name: c.name }))
    .filter((c) => c.id && c.name && !existing.has(c.id))
    .slice(0, 6);
}