// ── Storage keys ─────────────────────────────────────────────────────────
export const WEATHER_KEY = 'weather-cache';
export const LOCATION_KEY = 'weather-location';
export const REGION_KEY = 'weather-region';

export const CRYPTO_CACHE_KEY = 'crypto-rates-cache';
export const CRYPTO_SELECTED_KEY = 'crypto-rates-selected';
export const CRYPTO_COINS_KEY = 'crypto-rates-coins';

export const BLOCKS_KEY = 'blocks-layout';
export const THEME_KEY = 'theme';
export const LOCALE_KEY = 'locale';
export const KANBAN_DONE_KEY = 'kanban-done';

export const YCAL_ACCOUNT_KEY = 'ycal-account';
export const YCAL_CALENDAR_KEY = 'ycal-calendar';
export const YCAL_CALENDARS_KEY = 'ycal-calendars';
export const YCAL_TASKS_CALENDAR_KEY = 'ycal-tasks-calendar';

// ── Cache TTL / refresh timings (ms) ─────────────────────────────────────
export const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
export const WEATHER_LOCATION_MAX_AGE_MS = 15 * 60 * 1000;
export const WEATHER_GEO_TIMEOUT_MS = 10 * 1000;

export const CRYPTO_CACHE_TTL_MS = 60 * 60 * 1000;

export const DEAD_SCAN_TIMEOUT_MS = 10 * 1000;

// ── API endpoints ────────────────────────────────────────────────────────
export const OPEN_METEO_API_URL = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const COINGECKO_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price';
export const COINGECKO_SEARCH_URL = 'https://api.coingecko.com/api/v3/search';
export const YANDEX_CALDAV_ROOT = 'https://caldav.yandex.ru';

// ── Storage schema versions ──────────────────────────────────────────────
export const BLOCKS_VERSION = 1;
export const COINS_VERSION = 2;

// ── Defaults / options ───────────────────────────────────────────────────
export const DEFAULT_BLOCKS = ['datetime', 'weather', 'crypto'];

export const DEFAULT_COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
];

export const THEMES = ['system', 'light', 'dark', 'retro'];

export const SUPPORTED_LOCALES = ['ru', 'en', 'zh'];
export const LOCALE_MAP = { ru: 'ru', en: 'en', zh: 'zh-CN' };

export const KANBAN_FREQS = ['once', 'daily', 'weekdays', 'custom'];

export const DEAD_SCAN_CONCURRENCY = 6;
export const NOT_VALIDED_FOLDER = 'Not Valided';