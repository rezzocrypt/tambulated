<template>
  <div class="settings bookmarks-check">
    <button
      class="ops-btn"
      :class="{ open: open }"
      @click="open = !open"
      :title="t('periodicOps')"
      :aria-label="t('periodicOps')"
      aria-haspopup="true"
      :aria-expanded="open"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    </button>

    <transition name="pop">
      <div v-if="open" class="settings-pop" @click.stop>
        <div class="settings-head">{{ t('periodicOps') }}</div>
        <div class="settings-group">
          <button class="check-btn" :disabled="isScanning" @click="run">
            {{ isScanning ? t('deadScanRunning') : t('deadScan') }}
          </button>
          <div v-if="isScanning" class="check-status">
            <span>{{ t('deadScanProgress') }} {{ progress.done }}/{{ progress.total }}</span>
          </div>
          <div v-else-if="lastResult && lastResult.moved > 0" class="check-status">
            <span>{{ t('deadScanMoved') }}: {{ lastResult.moved }}</span>
          </div>
          <div v-else-if="lastResult" class="check-status">
            <span>{{ t('deadScanNone') }}</span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useLocale } from '@/composables/useLocale.js';
import { useBookmarks } from '@/composables/useBookmarks.js';
import { useDeadBookmarks } from '@/composables/useDeadBookmarks.js';

const { t } = useLocale();
const bookmarks = useBookmarks();
const { isScanning, progress, lastResult, scan } = useDeadBookmarks(bookmarks);
const open = ref(false);

async function run() {
  await scan();
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
  .ops-btn {
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
  .ops-btn:hover {
    color: var(--text-primary);
    background: var(--glass-hover);
  }
  .ops-btn.open {
    color: #fff;
    background: var(--accent);
    border-color: transparent;
    transform: scale(1.08);
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
  .check-btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .check-btn:hover:not(:disabled) {
    background: var(--popup-hover);
  }
  .check-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .check-status {
    font-size: 13px;
    color: var(--text-secondary);
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
