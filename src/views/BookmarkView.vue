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
    </div>
  </div>
  <div v-show="bookmarks.currentNode.value == null">
    Загрузка данных...
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
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }
  :deep(.breadcrumbs) {
    width: auto;
    flex: 1;
  }
  .toolbar-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
    flex-shrink: 0;
  }
  .view-toggle {
    display: flex;
    gap: 6px;
  }
  .view-toggle button {
    appearance: none;
    background: rgba(128, 128, 128, 0.25);
    color: inherit;
    border: 1px solid rgba(128, 128, 128, 0.5);
    border-radius: 6px;
    padding: 4px 12px;
    font-size: 85%;
    cursor: pointer;
  }
  .view-toggle button:hover {
    background: rgba(128, 128, 128, 0.4);
  }
  .view-toggle button.active {
    background: rgba(128, 128, 128, 0.6);
    border-color: rgba(255, 255, 255, 0.6);
  }
  .dnd-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 85%;
    cursor: pointer;
    user-select: none;
  }
  .dnd-toggle input[type="checkbox"] {
    accent-color: #8cf;
  }
</style>
