<template>
  <div class="settings">
    <button
      class="gear-btn"
      :class="{ open: open }"
      @click="open = !open"
      :title="t('settings')"
      :aria-label="t('settings')"
      aria-haspopup="true"
      :aria-expanded="open"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>

    <transition name="pop">
      <div v-if="open" class="settings-pop" @click.stop>
        <div class="settings-head">{{ t('settings') }}</div>
        <div class="settings-group">
          <div class="settings-label">{{ t('theme') }}</div>
          <div class="theme-list">
            <button
              v-for="opt in themeOptions"
              :key="opt.value"
              class="theme-option"
              :class="{ active: theme === opt.value }"
              @click="setTheme(opt.value)"
            >
              <span class="theme-icon" v-html="opt.icon"></span>
              <span>{{ opt.label }}</span>
              <span class="check" v-if="theme === opt.value">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </button>
          </div>
        </div>
        <div class="settings-group">
          <div class="settings-label">{{ t('language') }}</div>
          <div class="locale-list">
            <button
              v-for="opt in localeOptions"
              :key="opt.value"
              class="locale-option"
              :class="{ active: current === opt.value }"
              :title="opt.title"
              @click="setLocale(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useTheme } from '@/composables/useTheme.js';
import { useLocale } from '@/composables/useLocale.js';

const { theme, setTheme } = useTheme();
const { current, setLocale, t } = useLocale();
const open = ref(false);

function svg(body) {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

const themeOptions = computed(() => [
  {
    value: 'system',
    label: t('themeSystem'),
    icon: svg('<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>'),
  },
  {
    value: 'light',
    label: t('themeLight'),
    icon: svg('<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'),
  },
  {
    value: 'dark',
    label: t('themeDark'),
    icon: svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'),
  },
  {
    value: 'retro',
    label: t('themeRetro'),
    icon: svg('<path d="M6 9h4M8 7v4M15 8h.01M18 11h.01M17.5 6h-11A4.5 4.5 0 0 0 2 10.5v3a3.5 3.5 0 0 0 6.2 2.2l1.3-1.7h4.97l1.3 1.7a3.5 3.5 0 0 0 6.2-2.2v-3A4.5 4.5 0 0 0 17.5 6z"></path>'),
  },
]);

const localeOptions = computed(() => [
  { value: 'ru', label: 'RU', title: t('localeRu') },
  { value: 'en', label: 'EN', title: t('localeEn') },
  { value: 'zh', label: '中文', title: t('localeZh') },
]);

function onDocumentClick(e) {
  if (open.value && !e.target.closest('.settings')) open.value = false;
}
function onKey(e) {
  if (e.key === 'Escape') open.value = false;
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKey);
});
</script>

<style scoped>
  .settings {
    position: relative;
  }
  .gear-btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--glass-bg);
    color: var(--text-secondary);
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease, transform 0.3s ease;
  }
  .gear-btn:hover {
    color: var(--text-primary);
    background: var(--glass-hover);
  }
  .gear-btn.open {
    color: #fff;
    background: var(--accent);
    border-color: transparent;
    transform: rotate(45deg);
  }

  .settings-pop {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    z-index: 40;
    width: 240px;
    padding: 14px;
    background: var(--popup-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  .settings-head {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 12px;
  }
  .settings-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .settings-group + .settings-group {
    margin-top: 12px;
  }
  .settings-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
  }
  .theme-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .theme-option {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .theme-option:hover {
    background: var(--popup-hover);
    color: var(--text-primary);
  }
  .theme-option.active {
    background: var(--popup-hover);
    color: var(--text-primary);
    border-color: var(--accent);
  }
  .theme-option .theme-icon {
    display: inline-flex;
  }
  .theme-option .check {
    margin-left: auto;
    display: inline-flex;
    color: var(--accent);
  }

  .locale-list {
    display: flex;
    gap: 6px;
  }
  .locale-option {
    appearance: none;
    flex: 1;
    padding: 7px 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 15px;
    text-align: center;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .locale-option:hover {
    background: var(--popup-hover);
    color: var(--text-primary);
  }
  .locale-option.active {
    background: var(--accent);
    border-color: transparent;
    color: #ffffff;
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