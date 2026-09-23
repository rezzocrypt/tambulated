<template>
  <div class="settings blocks-settings">
    <button
      class="gear-btn"
      :class="{ open: open }"
      @click="open = !open"
      :title="t('settings')"
      :aria-label="t('settings')"
      aria-haspopup="true"
      :aria-expanded="open"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>

    <transition name="pop">
      <div v-if="open" class="settings-pop" @click.stop>
        <div class="settings-head">{{ t('blocks') }}</div>
        <div class="settings-group">
          <div class="block-list">
            <div
              v-for="id in blocks"
              :key="id"
              class="block-row"
              :class="{ off: isHidden(id) }"
            >
              <span class="block-name">{{ blockLabel(id) }}</span>
              <div class="block-controls">
                <button
                  class="block-arrow"
                  :disabled="isFirst(id)"
                  :title="t('blockMoveUp')"
                  :aria-label="`${t('blockMoveUp')}: ${blockLabel(id)}`"
                  @click="moveUp(id)"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  class="block-arrow"
                  :disabled="isLast(id)"
                  :title="t('blockMoveDown')"
                  :aria-label="`${t('blockMoveDown')}: ${blockLabel(id)}`"
                  @click="moveDown(id)"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <button
                  class="block-toggle"
                  :class="{ on: !isHidden(id) }"
                  :title="t(isHidden(id) ? 'blockShow' : 'blockHide')"
                  :aria-label="`${t(isHidden(id) ? 'blockShow' : 'blockHide')}: ${blockLabel(id)}`"
                  role="switch"
                  :aria-checked="!isHidden(id)"
                  @click="toggle(id)"
                >
                  <span class="block-toggle-knob"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useLocale } from '@/composables/useLocale.js';
import { useBlockConfig } from '@/composables/useBlocks.js';

const { t } = useLocale();
const { blocks, isHidden, toggle, moveUp, moveDown } = useBlockConfig();
const open = ref(false);

function blockLabel(id) {
  const labels = {
    datetime: t('blockDatetime'),
    weather: t('blockWeather'),
    crypto: t('blockCrypto'),
  };
  return labels[id] || id;
}
function isFirst(id) {
  return blocks.value[0] === id;
}
function isLast(id) {
  return blocks.value[blocks.value.length - 1] === id;
}

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
    display: inline-flex;
  }
  .gear-btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease, transform 0.3s ease, border-color 0.2s ease;
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
  .block-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .block-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 8px;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    transition: background-color 0.15s ease;
  }
  .block-row:hover {
    background: var(--popup-hover);
  }
  .block-row.off .block-name {
    opacity: 0.45;
  }
  .block-name {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .block-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .block-arrow {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .block-arrow:hover:not(:disabled) {
    background: var(--popup-hover);
    color: var(--text-primary);
  }
  .block-arrow:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .block-toggle {
    position: relative;
    appearance: none;
    width: 34px;
    height: 20px;
    flex-shrink: 0;
    margin-left: 2px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--glass-bg);
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }
  .block-toggle.on {
    background: var(--accent);
    border-color: transparent;
  }
  .block-toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--text-secondary);
    transition: transform 0.2s ease, background-color 0.2s ease;
  }
  .block-toggle.on .block-toggle-knob {
    transform: translateX(14px);
    background: #ffffff;
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