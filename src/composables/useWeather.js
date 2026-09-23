export const WEATHER_KEY = 'weather-cache';
export const LOCATION_KEY = 'weather-location';
export const REGION_KEY = 'weather-region';
export const CACHE_TTL_MS = 10 * 60 * 1000;

const API_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

function readJSON(key) {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getSavedLocation() {
  const stored = readJSON(LOCATION_KEY);
  if (stored && Number.isFinite(stored.lat) && Number.isFinite(stored.lon)) {
    return { lat: stored.lat, lon: stored.lon };
  }
  return null;
}

export function saveLocation(coords) {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify({ lat: coords.lat, lon: coords.lon }));
  } catch {
    /* storage unavailable — keep location in memory only */
  }
}

export function getSavedRegion() {
  const stored = readJSON(REGION_KEY);
  if (stored && Number.isFinite(stored.lat) && Number.isFinite(stored.lon)) {
    return { lat: stored.lat, lon: stored.lon, name: stored.name || '' };
  }
  return null;
}

export function setRegion(region) {
  try {
    localStorage.setItem(REGION_KEY, JSON.stringify({
      lat: region.lat,
      lon: region.lon,
      name: region.name || '',
    }));
  } catch {
    /* storage unavailable — keep region in memory only */
  }
}

export function clearRegion() {
  try {
    localStorage.removeItem(REGION_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

export function getGeolocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, maximumAge: 15 * 60 * 1000 },
    );
  });
}

export async function getLocation() {
  const region = getSavedRegion();
  if (region) return { lat: region.lat, lon: region.lon };
  const saved = getSavedLocation();
  if (saved) return saved;
  const pos = await getGeolocation();
  if (pos) saveLocation(pos);
  return pos;
}

function sameCoords(coords, lat, lon) {
  return coords
    && Number.isFinite(coords.lat)
    && Number.isFinite(coords.lon)
    && Math.abs(coords.lat - lat) < 1e-4
    && Math.abs(coords.lon - lon) < 1e-4;
}

export function loadCachedWeather(lat, lon) {
  const stored = readJSON(WEATHER_KEY);
  if (!stored || !stored.data || !Number.isFinite(stored.timestamp)) return null;
  if (Date.now() - stored.timestamp >= CACHE_TTL_MS) return null;
  if (!sameCoords(stored.coords, lat, lon)) return null;
  return stored.data;
}

export function loadStaleWeather(lat, lon) {
  const stored = readJSON(WEATHER_KEY);
  if (!stored || !stored.data || !sameCoords(stored.coords, lat, lon)) return null;
  return stored.data;
}

export function saveWeather(data, lat, lon) {
  try {
    localStorage.setItem(WEATHER_KEY, JSON.stringify({
      timestamp: Date.now(),
      coords: { lat, lon },
      data,
    }));
  } catch {
    /* storage unavailable — keep weather in memory only */
  }
}

export function weatherGroup(code) {
  if (code === 0) return 0;
  if (code === 1 || code === 2) return 1;
  if (code === 3) return 2;
  if (code === 45 || code === 48) return 3;
  if (code >= 51 && code <= 57) return 4;
  if (code >= 61 && code <= 67) return 5;
  if (code === 71 || code === 73 || code === 75 || code === 77) return 6;
  if (code >= 80 && code <= 82) return 7;
  if (code === 85 || code === 86) return 8;
  if (code >= 95) return 9;
  return -1;
}

export async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day',
  });
  const res = await fetch(`${API_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json || !json.current) throw new Error('No current weather');
  const c = json.current;
  return {
    temperature: Number.isFinite(c.temperature_2m) ? c.temperature_2m : null,
    feelsLike: Number.isFinite(c.apparent_temperature) ? c.apparent_temperature : null,
    humidity: Number.isFinite(c.relative_humidity_2m) ? c.relative_humidity_2m : null,
    windSpeed: Number.isFinite(c.wind_speed_10m) ? c.wind_speed_10m : null,
    isDay: typeof c.is_day === 'number' ? c.is_day === 1 : null,
    code: Number.isFinite(c.weather_code) ? c.weather_code : null,
  };
}

export async function searchWeatherLocations(query) {
  const q = String(query || '').trim();
  if (!q) return [];
  const res = await fetch(`${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=6&language=ru&format=json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.results || [])
    .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && r.name)
    .slice(0, 6)
    .map((r) => ({
      lat: r.latitude,
      lon: r.longitude,
      name: r.name,
      country: r.country || r.country_code || '',
      admin1: r.admin1 || '',
    }));
}