<template>
  <div class="crypto-card">
    <div class="crypto-head">
      <div class="crypto-title">{{ t('cryptoTitle') }}</div>
      <button
        class="crypto-gear"
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

    <ul v-if="rates.length" class="crypto-list">
      <li v-for="rate in rates" :key="rate.id" class="crypto-item">
        <span class="crypto-symbol">{{ rate.symbol }}</span>
        <span class="crypto-price">{{ formatPrice(rate.price) }}</span>
        <span
          v-if="rate.change24h != null"
          class="crypto-change"
          :class="rate.change24h < 0 ? 'down' : 'up'"
        >{{ formatChange(rate.change24h) }}</span>
      </li>
    </ul>
    <div v-else-if="loading" class="crypto-status">{{ t('cryptoLoading') }}</div>
    <div v-else-if="error" class="crypto-status crypto-error">{{ error }}</div>
    <div v-else class="crypto-status">{{ t('cryptoEmpty') }}</div>

    <transition name="pop">
      <div v-if="panelOpen" class="crypto-panel" @click.stop>
        <input
          ref="searchInput"
          v-model="query"
          class="crypto-search-input"
          :placeholder="t('cryptoSearchPlaceholder')"
          @input="onQuery"
        />
        <div v-if="searching" class="crypto-panel-status">{{ t('cryptoSearching') }}</div>
        <ul v-else-if="results.length" class="crypto-results">
          <li v-for="r in results" :key="r.id">
            <button class="crypto-result" :title="t('cryptoAdd')" @click="addCoin(r)">
              <span class="crypto-sym">{{ r.symbol }}</span>
              <span class="crypto-name">{{ r.name }}</span>
              <svg
                class="crypto-result-plus"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </li>
        </ul>
        <div v-else-if="query && !searching" class="crypto-panel-status">{{ t('cryptoNoResults') }}</div>

        <div class="crypto-opt-list">
          <div
            v-for="(coin, i) in coins"
            :key="coin.id"
            class="crypto-opt-row"
            :class="{ 'drop-target': dragIndex != null && dragIndex !== i && dropIndex === i }"
            @dragover.prevent="onDragOver(i)"
            @drop.prevent="onDrop(i)"
          >
            <span
              class="crypto-grip"
              draggable="true"
              :title="t('cryptoDrag')"
              @dragstart="onDragStart(i, $event)"
              @dragend="clearDrag"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="9" cy="6" r="1.4" />
                <circle cx="15" cy="6" r="1.4" />
                <circle cx="9" cy="12" r="1.4" />
                <circle cx="15" cy="12" r="1.4" />
                <circle cx="9" cy="18" r="1.4" />
                <circle cx="15" cy="18" r="1.4" />
              </svg>
            </span>
            <button
              class="crypto-opt"
              :class="{ active: isSelected(coin.id) }"
              :title="coin.name"
              @click="toggleCoin(coin.id)"
            >
              <span class="crypto-sym">{{ coin.symbol }}</span>
              <span class="crypto-name">{{ coin.name }}</span>
              <span v-if="isSelected(coin.id)" class="check">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </button>
            <button
              class="crypto-opt-remove"
              :title="t('delete')"
              :aria-label="`${t('delete')} ${coin.name}`"
              @click="removeCoin(coin.id)"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { watch } from 'vue';
import { useLocale } from '@/composables/useLocale.js';
import {
  loadCryptoRates,
  loadStaleCryptoRates,
  fetchCryptoRates,
  searchCryptoCoins,
  useCryptoRatesConfig,
} from '@/composables/useCryptoRates.js';

const LOCALE_MAP = { ru: 'ru', en: 'en', zh: 'zh-CN' };

export default {
  name: 'CryptoRates',
  data() {
    return {
      allRates: [],
      loading: false,
      error: '',
      stopWatch: null,
      panelOpen: false,
      query: '',
      results: [],
      searching: false,
      searchTag: 0,
      searchTimer: null,
      dragIndex: null,
      dropIndex: null,
    };
  },
  computed: {
    t() {
      return useLocale().t;
    },
    coins() {
      return useCryptoRatesConfig().coins.value;
    },
    rateMap() {
      return Object.fromEntries(this.allRates.map((r) => [r.id, r]));
    },
    rates() {
      const config = useCryptoRatesConfig();
      const selectedSet = new Set(config.selected.value);
      return config.coins.value
        .filter((c) => selectedSet.has(c.id))
        .map((c) => this.rateMap[c.id])
        .filter(Boolean);
    },
    priceFormat() {
      const code = LOCALE_MAP[useLocale().current.value] || 'ru';
      return new Intl.NumberFormat(code, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
  },
  mounted() {
    const { selected } = useCryptoRatesConfig();
    this.stopWatch = watch(selected, () => this.ensureCoverage(), { flush: 'post' });
    const ids = selected.value.slice();
    if (!ids.length) return;
    const cached = loadCryptoRates(ids);
    if (cached) {
      this.allRates = cached.data;
    } else {
      this.refresh();
    }
    document.addEventListener('click', this.onDocumentClick);
    document.addEventListener('keydown', this.onKey);
  },
  beforeUnmount() {
    if (this.stopWatch) {
      this.stopWatch();
      this.stopWatch = null;
    }
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
    togglePanel() {
      this.panelOpen = !this.panelOpen;
      if (this.panelOpen) {
        this.$nextTick(() => this.$refs.searchInput?.focus());
      }
    },
    isSelected(id) {
      return useCryptoRatesConfig().isSelected(id);
    },
    toggleCoin(id) {
      useCryptoRatesConfig().toggleCoin(id);
    },
    addCoin(coin) {
      useCryptoRatesConfig().addCoin(coin);
      this.query = '';
      this.results = [];
    },
    removeCoin(id) {
      useCryptoRatesConfig().removeCoin(id);
    },
    onDragStart(index, e) {
      this.dragIndex = index;
      e.dataTransfer?.setData('text/plain', String(index));
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver(index) {
      if (this.dragIndex != null) this.dropIndex = index;
    },
    onDrop(index) {
      if (this.dragIndex != null) {
        useCryptoRatesConfig().moveCoin(this.dragIndex, index);
      }
      this.clearDrag();
    },
    clearDrag() {
      this.dragIndex = null;
      this.dropIndex = null;
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
        const res = await searchCryptoCoins(q);
        if (tag !== this.searchTag) return;
        this.results = res;
      } catch {
        if (tag !== this.searchTag) return;
        this.results = [];
      } finally {
        if (tag === this.searchTag) this.searching = false;
      }
    },
    ensureCoverage() {
      const ids = useCryptoRatesConfig().selected.value;
      if (!ids.length) return;
      const have = new Set(this.allRates.map((r) => r.id));
      if (ids.some((id) => !have.has(id))) this.refresh();
    },
    async refresh() {
      const ids = useCryptoRatesConfig().selected.value;
      if (!ids.length) {
        this.allRates = [];
        this.loading = false;
        this.error = '';
        return;
      }
      this.loading = true;
      this.error = '';
      try {
        this.allRates = await fetchCryptoRates(ids);
      } catch {
        const stale = loadStaleCryptoRates(ids);
        if (stale) {
          this.allRates = stale.data;
        } else {
          this.error = this.t('cryptoError');
        }
      } finally {
        this.loading = false;
      }
    },
    formatPrice(value) {
      if (value == null) return '—';
      return this.priceFormat.format(value);
    },
    formatChange(value) {
      const sign = value > 0 ? '+' : '';
      return `${sign}${value.toFixed(2)}%`;
    },
  },
};
</script>

<style scoped>
  .crypto-card {
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
  .crypto-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }
  .crypto-title {
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
  .crypto-gear {
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
  .crypto-gear:hover {
    color: var(--text-primary);
    background: var(--glass-hover);
  }
  .crypto-gear.open {
    color: #fff;
    background: var(--accent);
    border-color: transparent;
    transform: rotate(45deg);
  }

  .crypto-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .crypto-item {
    display: grid;
    grid-template-columns: 40px 1fr auto;
    align-items: baseline;
    gap: 8px;
    font-variant-numeric: tabular-nums;
  }
  .crypto-symbol {
    font-size: 13px;
    font-weight: 600;
  }
  .crypto-price {
    font-size: 13px;
    text-align: right;
    white-space: nowrap;
  }
  .crypto-change {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }
  .crypto-change.up {
    color: var(--ok);
  }
  .crypto-change.down {
    color: var(--danger);
  }
  .crypto-status {
    font-size: 13px;
    color: var(--text-secondary);
  }
  .crypto-error {
    color: var(--danger);
  }

  .crypto-panel {
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
  .crypto-search-input {
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
  .crypto-search-input:focus {
    border-color: var(--accent);
  }
  .crypto-panel-status {
    padding-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
    text-align: center;
  }
  .crypto-results {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 8px;
    max-height: 180px;
    overflow-y: auto;
  }
  .crypto-result {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 8px;
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
  .crypto-result:hover {
    background: var(--popup-hover);
    color: var(--text-primary);
  }
  .crypto-result .crypto-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .crypto-result-plus {
    margin-left: auto;
    color: var(--accent);
    flex-shrink: 0;
  }

  .crypto-opt-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
  .crypto-opt-row {
    display: flex;
    align-items: center;
    gap: 2px;
    border-left: 2px solid transparent;
  }
  .crypto-opt-row.drop-target {
    border-left-color: var(--accent);
    background: var(--popup-hover);
  }
  .crypto-grip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 2px;
    color: var(--text-secondary);
    opacity: 0.7;
    cursor: grab;
    border-radius: var(--radius-sm);
    transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
  }
  .crypto-grip:hover {
    opacity: 1;
    background: var(--popup-hover);
  }
  .crypto-grip:active {
    cursor: grabbing;
  }
  .crypto-opt {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
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
  .crypto-opt:hover {
    background: var(--popup-hover);
    color: var(--text-primary);
  }
  .crypto-opt.active {
    background: var(--popup-hover);
    color: var(--text-primary);
    border-color: var(--accent);
  }
  .crypto-opt .crypto-sym {
    width: 38px;
    flex-shrink: 0;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .crypto-opt .crypto-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .crypto-opt .check {
    margin-left: auto;
    display: inline-flex;
    color: var(--accent);
    flex-shrink: 0;
  }
  .crypto-opt-remove {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    opacity: 0.7;
    transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
  }
  .crypto-opt-remove:hover {
    background: rgba(244, 63, 94, 0.16);
    color: var(--danger);
    opacity: 1;
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