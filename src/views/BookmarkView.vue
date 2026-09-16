<template>
  <div class="toolbar">
    <BreadCrumbs
      :items="bookmarks.parents.value"
      :root-element="bookmarks.allBookmarks.value"
      :click-fn="clickByItem"
      :drag-enabled="dragEnabled"
      :drop-root-fn="dropToRoot"
    />
    <div class="toolbar-controls">
      <div class="view-toggle">
        <button :class="{ active: viewMode === 'grid' }" @click="setViewMode('grid')" title="Плитки">Плитки</button>
        <button :class="{ active: viewMode === 'table' }" @click="setViewMode('table')" title="Таблица">Таблица</button>
      </div>
      <label class="dnd-toggle">
        <input type="checkbox" v-model="dragEnabled" />
        Перетаскивание
      </label>
      <SettingsMenu />
    </div>
  </div>
  <div v-show="bookmarks.currentNode.value == null" class="loading">
    <div class="spinner"></div>
    <span>Загрузка закладок…</span>
  </div>
  <BookmarkGrid
    v-if="viewMode === 'grid' && bookmarks.currentNode.value != null"
    :items="bookmarks.currentNode.value"
    :click-fn="clickByItem"
    :context-fn="onContextMenu"
    :icon-fn="getIcon"
    :drag-enabled="dragEnabled"
    :drag-start-fn="dragStart"
    :drop-fn="dropOn"
    :drop-root-fn="dropToRoot"
  />
  <BookmarkTable
    v-else-if="viewMode === 'table' && bookmarks.currentNode.value != null"
    :items="bookmarks.currentNode.value"
    :click-fn="clickByItem"
    :context-fn="onContextMenu"
    :icon-fn="getIcon"
    :drag-enabled="dragEnabled"
    :drag-start-fn="dragStart"
    :drop-fn="dropOn"
    :drop-root-fn="dropToRoot"
  />
  <context-menu v-model:show="ctxMenu.show" :options="ctxMenu">
    <component
      :is="menuItem.component || 'ContextMenuItem'"
      v-bind="{ label: menuItem.label }"
      v-on="{ click: menuItem.action }"
      v-for="(menuItem, index) in ctxMenu.items"
      :key="index"
      v-show="menuItem.visible || true"
    />
  </context-menu>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { ready } from '@/assets/chrome-mock.js';
import chromeAPI from '@/assets/chrome-mock.js';
import { useBookmarks } from '@/composables/useBookmarks.js';

import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';
import BreadCrumbs from '@/components/BreadCrumbs.vue';
import BookmarkGrid from '@/components/Bookmark/BookmarkGrid.vue';
import BookmarkTable from '@/components/Bookmark/BookmarkTable.vue';
import SettingsMenu from '@/components/Common/SettingsMenu.vue';

const bookmarks = useBookmarks();

const VIEW_MODE_KEY = 'viewMode';
const viewMode = ref(localStorage.getItem(VIEW_MODE_KEY) === 'table' ? 'table' : 'grid');
const dragEnabled = ref(false);
const dragItem = ref(null);

const ctxMenu = ref({
  theme: 'dark',
  zIndex: 3,
  show: false,
  x: 0,
  y: 0,
  items: [],
});

function getDomainFromUrl(url) {
  const regex = /^(?:https?:\/\/)?(?:www\.)?([^/?#]+)/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function getIcon(bookmark) {
  const domain = getDomainFromUrl(bookmark.url);
  return domain ? domain.replaceAll('.', '_') : 'file';
}

function setViewMode(mode) {
  viewMode.value = mode;
  localStorage.setItem(VIEW_MODE_KEY, mode);
}

function onContextMenu(e, bookmark) {
  e.preventDefault();
  ctxMenu.value.x = e.x;
  ctxMenu.value.y = e.y;
  ctxMenu.value.show = true;
  ctxMenu.value.items = [
    {
      label: 'Удалить',
      visible: true,
      action: () => {
        bookmarks.removeBookmark(bookmark.id);
      },
    },
  ];
  bookmarks.selectedItem.value = bookmark;
}

function clickByItem(bookmark) {
  if (Array.isArray(bookmark.children)) {
    bookmarks.navigateInto(bookmark);
  } else {
    chromeAPI.tabs.create({ url: bookmark.url });
  }
}

function dragStart(bookmark) {
  dragItem.value = bookmark;
}

function dropOn(target) {
  const item = dragItem.value;
  dragItem.value = null;
  if (!item || item.id === target.id) return;
  if (Array.isArray(target.children)) {
    bookmarks.moveBookmark(item.id, { parentId: target.id, index: (target.children || []).length });
    return;
  }
  bookmarks.moveBookmark(item.id, {
    parentId: bookmarks.currentParentId.value,
    index: bookmarks.currentNode.value ? bookmarks.currentNode.value.indexOf(target) : 0,
  });
}

function dropToRoot() {
  const item = dragItem.value;
  dragItem.value = null;
  if (!item) return;
  const root = bookmarks.rootNode.value;
  bookmarks.moveBookmark(item.id, { parentId: root?.id ?? null, index: root?.children?.length ?? 0 });
}

const reloader = () => bookmarks.reload();

onMounted(async () => {
  await ready;
  await bookmarks.reload();
  chromeAPI.bookmarks.onCreated.addListener(reloader);
  chromeAPI.bookmarks.onRemoved.addListener(reloader);
  chromeAPI.bookmarks.onChanged.addListener(reloader);
  chromeAPI.bookmarks.onMoved.addListener(reloader);
  chromeAPI.bookmarks.onChildrenReordered.addListener(reloader);
});

onBeforeUnmount(() => {
  chromeAPI.bookmarks.onCreated.removeListener(reloader);
  chromeAPI.bookmarks.onRemoved.removeListener(reloader);
  chromeAPI.bookmarks.onChanged.removeListener(reloader);
  chromeAPI.bookmarks.onMoved.removeListener(reloader);
  chromeAPI.bookmarks.onChildrenReordered.removeListener(reloader);
});
</script>

<style scoped>
  .toolbar {
    position: sticky;
    top: 16px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px 8px 16px;
    background: var(--glass-bg);
    border: 1px solid var(--border);
    border-radius: 999px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: var(--shadow);
  }
  :deep(.breadcrumbs) {
    flex: 1;
    min-width: 0;
  }
  .toolbar-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
    flex-shrink: 0;
  }

  /* segmented control */
  .view-toggle {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: rgba(0, 0, 0, 0.28);
    border-radius: 999px;
  }
  .view-toggle button {
    appearance: none;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 18px;
    border-radius: 999px;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }
  .view-toggle button:hover:not(.active) {
    color: var(--text-primary);
  }
  .view-toggle button.active {
    background: linear-gradient(135deg, var(--accent), #8b5cf6);
    color: #ffffff;
    box-shadow: 0 2px 10px rgba(109, 92, 255, 0.45);
  }

  /* drag & drop switch */
  .dnd-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  .dnd-toggle input[type="checkbox"] {
    appearance: none;
    position: relative;
    width: 36px;
    height: 20px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid var(--border);
    cursor: pointer;
    outline: none;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    flex-shrink: 0;
  }
  .dnd-toggle input[type="checkbox"]::before {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    transition: transform 0.2s ease;
  }
  .dnd-toggle input[type="checkbox"]:checked {
    background: var(--accent);
    border-color: transparent;
  }
  .dnd-toggle input[type="checkbox"]:checked::before {
    transform: translateX(16px);
  }

  /* loading state */
  .loading {
    display: flex;
    align-items: center;
    gap: 12px;
    justify-content: center;
    margin-top: 48px;
    color: var(--text-secondary);
    font-size: 14px;
  }
  .spinner {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
