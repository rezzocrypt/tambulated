import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import WeatherBlock from '../src/components/Common/WeatherBlock.vue';
import { useLocale } from '@/composables/useLocale.js';
import {
  WEATHER_KEY,
  LOCATION_KEY,
  REGION_KEY,
  CACHE_TTL_MS,
  weatherGroup,
} from '@/composables/useWeather.js';

const API_DATA = {
  latitude: 55.751244,
  longitude: 37.618423,
  current: {
    time: '2026-09-21T12:15',
    temperature_2m: 14.2,
    relative_humidity_2m: 68,
    apparent_temperature: 13.5,
    weather_code: 3,
    wind_speed_10m: 9.1,
  },
};

const GEOCODE_DATA = {
  results: [
    { id: 1, name: 'Moscow', latitude: 55.75, longitude: 37.62, country: 'Russia', admin1: 'Moscow' },
    { id: 2, name: 'Moscow', latitude: 46.73, longitude: -117.0, country: 'United States', admin1: 'Idaho' },
  ],
};

function weatherData() {
  return { temperature: 14.2, feelsLike: 13.5, humidity: 68, windSpeed: 9.1, code: 3 };
}

function mockWeatherApi({ ok = true, geocode = GEOCODE_DATA } = {}) {
  const fn = vi.fn((url) => {
    if (String(url).includes('/search')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(geocode) });
    }
    return Promise.resolve({ ok, json: () => Promise.resolve(API_DATA) });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function saveLocation() {
  localStorage.setItem(LOCATION_KEY, JSON.stringify({ lat: 55.75, lon: 37.62 }));
}

function seedCache(data = weatherData(), { lat = 55.75, lon = 37.62, age = 1000 } = {}) {
  localStorage.setItem(WEATHER_KEY, JSON.stringify({
    timestamp: Date.now() - age,
    coords: { lat, lon },
    data,
  }));
}

beforeEach(() => {
  localStorage.clear();
  useLocale().setLocale('ru');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('WeatherBlock', () => {
  it('fetches weather for a saved location and renders it', async () => {
    saveLocation();
    const fetchMock = mockWeatherApi();
    const wrapper = mount(WeatherBlock);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('latitude=55.75');
    expect(fetchMock.mock.calls[0][0]).toContain('longitude=37.62');

    expect(wrapper.find('.weather-temp').text()).toBe('14,2°');
    expect(wrapper.find('.weather-icon').attributes('aria-label')).toBe('Пасмурно');
    const hasHumidity = wrapper.findAll('.weather-detail').some((el) => el.attributes('title') === 'влажность');
    const hasWind = wrapper.findAll('.weather-detail').some((el) => el.attributes('title') === 'ветер');
    expect(hasHumidity).toBe(true);
    expect(hasWind).toBe(true);
    expect(wrapper.find('.weather-details').text()).toContain('68%');
    expect(wrapper.find('.weather-details').text()).toContain('9.1 км/ч');
    wrapper.unmount();
  });

  it('stores fetched weather with a timestamp and coordinates', async () => {
    saveLocation();
    mockWeatherApi();
    const wrapper = mount(WeatherBlock);
    await flushPromises();

    const raw = JSON.parse(localStorage.getItem(WEATHER_KEY));
    expect(raw.timestamp).toBe(Date.now());
    expect(raw.coords).toEqual({ lat: 55.75, lon: 37.62 });
    expect(raw.data.temperature).toBe(14.2);
    wrapper.unmount();
  });

  it('uses the cache without fetching when it is fresh', async () => {
    saveLocation();
    seedCache();
    const fetchMock = mockWeatherApi();
    const wrapper = mount(WeatherBlock);
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.find('.weather-temp').text()).toBe('14,2°');
    expect(wrapper.find('.weather-icon').attributes('aria-label')).toBe('Пасмурно');
    wrapper.unmount();
  });

  it('does not refetch on a page refresh while the cache is fresh', async () => {
    saveLocation();
    const fetchMock = mockWeatherApi();
    const first = mount(WeatherBlock);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    first.unmount();

    const stored = JSON.parse(localStorage.getItem(WEATHER_KEY));
    expect(stored.timestamp).toBe(Date.now());

    const second = mount(WeatherBlock);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.find('.weather-temp').text()).toBe('14,2°');
    second.unmount();
  });

  it('refetches when the cache is older than 10 minutes', async () => {
    saveLocation();
    seedCache({}, { age: CACHE_TTL_MS + 1000 });
    const fetchMock = mockWeatherApi();
    const wrapper = mount(WeatherBlock);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.find('.weather-temp').text()).toBe('14,2°');
    wrapper.unmount();
  });

  it('uses fresh cache exactly at the 10-minute boundary', async () => {
    saveLocation();
    seedCache({}, { age: CACHE_TTL_MS - 1 });
    const fetchMock = mockWeatherApi();
    const wrapper = mount(WeatherBlock);
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('ignores a fresh cache saved for different coordinates', async () => {
    saveLocation();
    seedCache({}, { lat: 1, lon: 2 });
    const fetchMock = mockWeatherApi();
    const wrapper = mount(WeatherBlock);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('falls back to stale cache when the fetch fails', async () => {
    saveLocation();
    seedCache(undefined, { age: CACHE_TTL_MS + 1000 });
    const fetchMock = mockWeatherApi({ ok: false });
    const wrapper = mount(WeatherBlock);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.find('.weather-temp').text()).toBe('14,2°');
    wrapper.unmount();
  });

  it('shows an error when the fetch fails and no cache exists', async () => {
    saveLocation();
    mockWeatherApi({ ok: false });
    const wrapper = mount(WeatherBlock);
    await flushPromises();

    expect(wrapper.find('.weather-error').text()).toBe('Не удалось получить погоду');
    wrapper.unmount();
  });

  it('shows a location error when geolocation is unavailable and no location is saved', async () => {
    const fetchMock = mockWeatherApi();
    const wrapper = mount(WeatherBlock);
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.find('.weather-error').text()).toBe('Не удалось определить местоположение');
    wrapper.unmount();
  });

  it('uses a manually chosen region for fetching', async () => {
    localStorage.setItem(REGION_KEY, JSON.stringify({ lat: 12.34, lon: 56.78, name: 'Town' }));
    const fetchMock = mockWeatherApi();
    const wrapper = mount(WeatherBlock);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('latitude=12.34');
    expect(url).toContain('longitude=56.78');
    expect(wrapper.find('.weather-region').exists()).toBe(true);
    expect(wrapper.find('.weather-region').text()).toBe('Town');
    wrapper.unmount();
  });

  it('selects a region via the settings panel', async () => {
    const fetchMock = mockWeatherApi();
    const wrapper = mount(WeatherBlock);
    await flushPromises();
    expect(fetchMock).not.toHaveBeenCalled();

    await wrapper.find('.weather-gear').trigger('click');
    expect(wrapper.find('.weather-panel').exists()).toBe(true);

    await wrapper.find('.weather-search-input').setValue('mos');
    vi.advanceTimersByTime(400);
    await flushPromises();

    const results = wrapper.findAll('.weather-result');
    expect(results.map((r) => r.find('.weather-result-name').text())).toEqual(['Moscow', 'Moscow']);
    expect(results[1].find('.weather-result-county').text()).toBe('United States, Idaho');

    await results[1].trigger('click');
    await flushPromises();

    const region = JSON.parse(localStorage.getItem(REGION_KEY));
    expect(region).toEqual({ lat: 46.73, lon: -117.0, name: 'Moscow' });

    const weatherCalls = fetchMock.mock.calls.filter(([url]) => !String(url).includes('/search'));
    expect(weatherCalls).toHaveLength(1);
    expect(weatherCalls[0][0]).toContain('latitude=46.73');
    expect(wrapper.find('.weather-temp').text()).toBe('14,2°');
    expect(wrapper.find('.weather-region').text()).toBe('Moscow');
    wrapper.unmount();
  });

  it('clears a manually chosen region', async () => {
    localStorage.setItem(REGION_KEY, JSON.stringify({ lat: 46.73, lon: -117.0, name: 'Moscow' }));
    const fetchMock = mockWeatherApi();
    const wrapper = mount(WeatherBlock);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await wrapper.find('.weather-gear').trigger('click');
    await wrapper.find('.weather-region-clear').trigger('click');
    await flushPromises();

    expect(localStorage.getItem(REGION_KEY)).toBeNull();
    expect(wrapper.find('.weather-error').text()).toBe('Не удалось определить местоположение');
    wrapper.unmount();
  });
});

describe('weatherGroup', () => {
  it('maps WMO weather codes to groups', () => {
    expect(weatherGroup(0)).toBe(0);
    expect(weatherGroup(1)).toBe(1);
    expect(weatherGroup(2)).toBe(1);
    expect(weatherGroup(3)).toBe(2);
    expect(weatherGroup(45)).toBe(3);
    expect(weatherGroup(48)).toBe(3);
    expect(weatherGroup(55)).toBe(4);
    expect(weatherGroup(57)).toBe(4);
    expect(weatherGroup(61)).toBe(5);
    expect(weatherGroup(67)).toBe(5);
    expect(weatherGroup(73)).toBe(6);
    expect(weatherGroup(77)).toBe(6);
    expect(weatherGroup(80)).toBe(7);
    expect(weatherGroup(82)).toBe(7);
    expect(weatherGroup(85)).toBe(8);
    expect(weatherGroup(86)).toBe(8);
    expect(weatherGroup(95)).toBe(9);
    expect(weatherGroup(99)).toBe(9);
    expect(weatherGroup(58)).toBe(-1);
    expect(weatherGroup(70)).toBe(-1);
  });
});