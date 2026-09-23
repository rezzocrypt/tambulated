<template>
  <div class="weather-card">
    <div class="weather-head">
      <div class="weather-title">{{ t('weatherTitle') }}</div>
      <button
        class="weather-gear"
        :class="{ open: panelOpen }"
        :title="t('settings')"
        :aria-label="t('settings')"
        aria-haspopup="true"
        :aria-expanded="panelOpen"
        @click.stop="togglePanel"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>

    <div v-if="weather" class="weather-main">
      <div class="weather-top">
        <div class="weather-icon-box">
          <WeatherIcon
            :group="weatherGroupCode(weather.code)"
            :night="weather.isDay === false"
            :label="weatherLabel"
          />
        </div>
        <div class="weather-info">
          <div class="weather-temp">{{ formatTemp(weather.temperature) }}</div>
          <div v-if="regionName" class="weather-region">{{ regionName }}</div>
        </div>
      </div>
      <div class="weather-details">
        <span v-if="weather.feelsLike != null" class="weather-detail" :title="t('weatherFeels')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
          </svg>
          {{ formatTemp(weather.feelsLike) }}
        </span>
        <span v-if="weather.humidity != null" class="weather-detail" :title="t('weatherHumidity')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          {{ weather.humidity }}%
        </span>
        <span v-if="weather.windSpeed != null" class="weather-detail" :title="t('weatherWind')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
            <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
          </svg>
          {{ weather.windSpeed }} км/ч
        </span>
      </div>
    </div>
    <div v-else-if="loading" class="weather-status">{{ t('weatherLoading') }}</div>
    <div v-else class="weather-status weather-error">{{ error || t('weatherLocationError') }}</div>

    <transition name="pop">
      <div v-if="panelOpen" class="weather-panel" @click.stop>
        <div class="weather-region-row">
          <span v-if="regionName" class="weather-region-name">{{ regionName }}</span>
          <span v-else class="weather-region-name">{{ t('weatherRegionAuto') }}</span>
          <button
            v-if="region"
            class="weather-region-clear"
            :title="t('weatherLocationAuto')"
            :aria-label="t('weatherLocationAuto')"
            @click="autoLocation"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <input
          ref="searchInput"
          v-model="query"
          class="weather-search-input"
          :placeholder="t('weatherRegionPlaceholder')"
          @input="onQuery"
        />
        <div v-if="searching" class="weather-panel-status">{{ t('weatherSearching') }}</div>
        <ul v-else-if="results.length" class="weather-results">
          <li v-for="(r, i) in results" :key="`${r.name}-${r.lat}-${i}`">
            <button class="weather-result" :title="regionLabel(r)" @click="selectRegion(r)">
              <span class="weather-result-name">{{ r.name }}</span>
              <span class="weather-result-county">{{ regionLabel(r) }}</span>
              <svg
                class="weather-result-check"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </li>
        </ul>
        <div v-else-if="query && !searching" class="weather-panel-status">{{ t('weatherNoResults') }}</div>
      </div>
    </transition>
  </div>
</template>

<script>
import { useLocale } from '@/composables/useLocale.js';
import { LOCALE_MAP } from '@/config.js';
import WeatherIcon from '@/components/Common/WeatherIcon.vue';
import {
  loadCachedWeather,
  loadStaleWeather,
  fetchWeather,
  getLocation,
  getSavedRegion,
  setRegion,
  clearRegion,
  saveWeather,
  searchWeatherLocations,
  weatherGroup,
} from '@/composables/useWeather.js';

export default {
  name: 'WeatherBlock',
  components: {
    WeatherIcon,
  },
  data() {
    return {
      weather: null,
      loading: false,
      error: '',
      running: false,
      region: null,
      panelOpen: false,
      query: '',
      results: [],
      searching: false,
      searchTag: 0,
      searchTimer: null,
    };
  },
  computed: {
    t() {
      return useLocale().t;
    },
    regionName() {
      return this.region?.name || '';
    },
    temperatureFormat() {
      const code = LOCALE_MAP[useLocale().current.value] || 'ru';
      return new Intl.NumberFormat(code, { maximumFractionDigits: 1 });
    },
    weatherLabel() {
      return this.weather ? this.t(this.weatherKey(this.weather.code)) : '';
    },
  },
  async mounted() {
    this.region = await getSavedRegion();
    document.addEventListener('click', this.onDocumentClick);
    document.addEventListener('keydown', this.onKey);
    this.load();
  },
  beforeUnmount() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    document.removeEventListener('click', this.onDocumentClick);
    document.removeEventListener('keydown', this.onKey);
  },
  methods: {
    onDocumentClick(e) {
      if (this.panelOpen && !this.$el?.contains(e.target)) this.panelOpen = false;
    },
    onKey(e) {
      if (e.key === 'Escape') this.panelOpen = false;
    },
    onQuery() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.doSearch(), 350);
    },
    async doSearch() {
      const q = this.query.trim();
      const tag = ++this.searchTag;
      if (!q) {
        this.results = [];
        this.searching = false;
        return;
      }
      this.searching = true;
      try {
        const res = await searchWeatherLocations(q);
        if (tag !== this.searchTag) return;
        this.results = res;
      } catch {
        if (tag !== this.searchTag) return;
        this.results = [];
      } finally {
        if (tag === this.searchTag) this.searching = false;
      }
    },
    togglePanel() {
      this.panelOpen = !this.panelOpen;
      if (this.panelOpen) {
        this.$nextTick(() => this.$refs.searchInput?.focus());
      }
    },
    regionLabel(r) {
      return [r.country, r.admin1].filter(Boolean).join(', ');
    },
    async selectRegion(r) {
      await setRegion(r);
      this.region = await getSavedRegion();
      this.query = '';
      this.results = [];
      this.weather = null;
      await this.load();
    },
    async autoLocation() {
      await clearRegion();
      this.region = null;
      this.query = '';
      this.results = [];
      this.weather = null;
      await this.load();
    },
    weatherKey(code) {
      const group = weatherGroup(code);
      return group >= 0 ? `weather${group}` : 'weatherUnknown';
    },
    weatherGroupCode(code) {
      return weatherGroup(code);
    },
    async load() {
      if (this.running) return;
      this.running = true;
      this.loading = true;
      this.error = '';
      try {
        const loc = await getLocation();
        if (!loc) return;
        const stale = await loadStaleWeather(loc.lat, loc.lon);
        if (stale) {
          this.weather = stale;
        }
        const cached = await loadCachedWeather(loc.lat, loc.lon);
        if (cached) return;
        try {
          const data = await fetchWeather(loc.lat, loc.lon);
          await saveWeather(data, loc.lat, loc.lon);
          this.weather = data;
        } catch {
          if (!this.weather) {
            this.error = this.t('weatherError');
          }
        }
      } catch {
        this.weather = null;
      } finally {
        this.loading = false;
        this.running = false;
      }
    },
    formatTemp(value) {
      if (value == null) return '—';
      return `${this.temperatureFormat.format(value)}°`;
    },
  },
};
</script>

<style scoped>
  .weather-card {
    position: relative;
    margin-top: 16px;
    padding: 18px;
    background: var(--glass-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  .weather-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }
  .weather-title {
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
  .weather-gear {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease, transform 0.3s ease;
  }
  .weather-gear:hover {
    color: var(--text-primary);
    background: var(--glass-hover);
  }
  .weather-gear.open {
    color: #fff;
    background: var(--accent);
    border-color: transparent;
    transform: rotate(45deg);
  }
  .weather-main {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .weather-top {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }
  .weather-icon-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    flex-shrink: 0;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: radial-gradient(circle at 32% 28%, rgba(109, 92, 255, 0.42), rgba(34, 211, 238, 0.14) 60%, transparent 78%);
  }
  .weather-icon-box svg {
    width: 42px;
    height: 42px;
  }
  .weather-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .weather-temp {
    font-size: 42px;
    font-weight: 200;
    letter-spacing: -0.03em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .weather-region {
    font-size: 12px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .weather-details {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-secondary);
  }
  .weather-detail {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .weather-detail svg {
    flex-shrink: 0;
    opacity: 0.85;
  }
  .weather-status {
    font-size: 13px;
    color: var(--text-secondary);
  }
  .weather-error {
    color: var(--danger);
  }

  .weather-panel {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 50;
    width: 264px;
    padding: 12px;
    background: var(--popup-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  .weather-region-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  .weather-region-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .weather-region-clear {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    opacity: 0.7;
    transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
  }
  .weather-region-clear:hover {
    background: rgba(244, 63, 94, 0.16);
    color: var(--danger);
    opacity: 1;
  }
  .weather-search-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s ease;
  }
  .weather-search-input:focus {
    border-color: var(--accent);
  }
  .weather-panel-status {
    padding-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
    text-align: center;
  }
  .weather-results {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 8px;
    max-height: 180px;
    overflow-y: auto;
  }
  .weather-result {
    appearance: none;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    width: 100%;
    padding: 7px 8px;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .weather-result:hover {
    background: var(--popup-hover);
    color: var(--text-primary);
  }
  .weather-result .weather-result-name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .weather-result .weather-result-county {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }
  .weather-result-check {
    grid-row: 1 / 3;
    grid-column: 2;
    margin-left: 8px;
    color: var(--accent);
    flex-shrink: 0;
  }

  .pop-enter-active,
  .pop-leave-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .pop-enter-from,
  .pop-leave-to {
    opacity: 0;
    transform: translateY(-6px);
  }
</style>