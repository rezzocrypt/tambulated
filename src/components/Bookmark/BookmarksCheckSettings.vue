<template>
  <div class="settings bookmarks-check">
    <button
      class="ops-btn"
      :class="{ open: open }"
      @click="togglePanel"
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
          <div class="check-row">
            <div class="target-picker">
              <button
                class="target-btn"
                :disabled="isScanning"
                :title="t('deadScanTarget')"
                :aria-label="t('deadScanTarget')"
                aria-haspopup="true"
                :aria-expanded="treeOpen"
                @click="treeOpen = !treeOpen"
              >
                <svg class="folder-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span class="target-name">{{ currentTargetLabel }}</span>
                <svg class="chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <transition name="pop">
                <ul v-if="treeOpen" class="target-tree" role="menu" :aria-label="t('deadScanTarget')">
                  <li>
                    <button
                      class="tree-row"
                      :class="{ selected: targetId === '' }"
                      role="menuitemradio"
                      :aria-checked="targetId === ''"
                      :disabled="isScanning"
                      :title="t('deadScanTargetDefault')"
                      @click="selectTarget('')"
                    >
                      <svg class="folder-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span class="tree-name">{{ t('deadScanTargetDefault') }}</span>
                      <span v-if="targetId === ''" class="tree-check">✓</span>
                    </button>
                  </li>
                  <li v-for="item in folders" :key="item.id">
                    <button
                      class="tree-row"
                      :class="{ selected: targetId === item.id }"
                      role="menuitemradio"
                      :aria-checked="targetId === item.id"
                      :disabled="isScanning"
                      :title="folderTitle(item)"
                      :style="{ paddingLeft: `${6 + item.depth * 14}px` }"
                      @click="selectTarget(item.id)"
                    >
                      <svg class="folder-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span class="tree-name">{{ folderTitle(item) }}</span>
                      <span v-if="targetId === item.id" class="tree-check">✓</span>
                    </button>
                  </li>
                </ul>
              </transition>
            </div>
            <button class="check-btn" :disabled="isScanning" @click="run">
              {{ isScanning ? t('deadScanRunning') : t('deadScan') }}
            </button>
          </div>
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
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useLocale } from '@/composables/useLocale.js';
import { useBookmarks } from '@/composables/useBookmarks.js';
import { useDeadBookmarks } from '@/composables/useDeadBookmarks.js';

const { t } = useLocale();
const bookmarks = useBookmarks();
const { isScanning, progress, lastResult, targetId, folders, scan } = useDeadBookmarks(bookmarks);
const open = ref(false);
const treeOpen = ref(false);

const currentTargetLabel = computed(() => {
  const selected = folders.value.find((item) => item.id === targetId.value);
  return selected ? folderTitle(selected) : t('deadScanTargetDefault');
});

function folderTitle(item) {
  return String(item.title ?? '').replace(/\s+/g, ' ').trim() || t('deadScanNoTitle');
}

function selectTarget(id) {
  targetId.value = id;
  treeOpen.value = false;
}

function togglePanel() {
  open.value = !open.value;
  if (!open.value) treeOpen.value = false;
}

async function run() {
  await scan();
}

function onDocumentClick(e) {
  if (!open.value) return;
  if (e.target.closest('.settings')) return;
  open.value = false;
  treeOpen.value = false;
}
function onKey(e) {
  if (e.key !== 'Escape') return;
  if (treeOpen.value) {
    treeOpen.value = false;
    return;
  }
  open.value = false;
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
    width: 300px;
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
  .check-row {
    display: flex;
    align-items: stretch;
    gap: 8px;
  }
  .target-picker {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
  }
  .target-btn {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 7px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .target-btn:hover:not(:disabled) {
    background: var(--popup-hover);
  }
  .target-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .folder-icon {
    flex: 0 0 auto;
    color: var(--text-secondary);
  }
  .target-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chevron {
    flex: 0 0 auto;
    color: var(--text-secondary);
    transition: transform 0.15s ease;
  }
  .target-btn[aria-expanded='true'] .chevron {
    transform: rotate(180deg);
  }
  .target-tree {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 50;
    width: 260px;
    max-height: 220px;
    margin: 0;
    padding: 4px;
    overflow-y: auto;
    list-style: none;
    background: var(--popup-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow);
  }
  .tree-row {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 6px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }
  .tree-row:hover:not(:disabled) {
    background: var(--popup-hover);
  }
  .tree-row.selected {
    color: var(--accent);
  }
  .tree-row:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .tree-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tree-check {
    flex: 0 0 auto;
    font-size: 12px;
  }
  .check-btn {
    appearance: none;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font-size: 14px;
    white-space: nowrap;
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
