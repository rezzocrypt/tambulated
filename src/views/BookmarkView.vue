<template>
<div class="bookmark-view">
  <PageToolbar>
    <template #meta>
      <BreadCrumbs
        :items="bookmarks.parents.value"
        :root-element="bookmarks.allBookmarks.value"
        :click-fn="clickByItem"
        :drop-root-fn="dropToRoot"
      />
    </template>
    <template #actions>
      <div class="view-toggle">
        <button
          class="page-toolbar-btn icon"
          :class="{ active: viewMode === 'grid' }"
          @click="setViewMode('grid')"
          :title="t('grid')"
          :aria-label="t('grid')"
        >
          <span class="view-icon icon-grid"></span>
        </button>
        <button
          class="page-toolbar-btn icon"
          :class="{ active: viewMode === 'table' }"
          @click="setViewMode('table')"
          :title="t('table')"
          :aria-label="t('table')"
        >
          <span class="view-icon icon-table"></span>
        </button>
      </div>
      <BlocksSettings />
    </template>
  </PageToolbar>
  <div v-show="bookmarks.currentNode.value == null" class="loading">
    <div class="spinner"></div>
    <span>{{ t('loading') }}</span>
  </div>
  <BookmarkGrid
    v-if="viewMode === 'grid' && bookmarks.currentNode.value != null"
    :items="bookmarks.currentNode.value"
    :click-fn="clickByItem"
    :context-fn="onContextMenu"
    :background-context-fn="onBackgroundMenu"
    :icon-fn="getIcon"
    :drag-start-fn="dragStart"
    :drop-fn="dropOn"
    :drop-root-fn="dropToRoot"
  />
  <BookmarkTable
    v-else-if="viewMode === 'table' && bookmarks.currentNode.value != null"
    :items="bookmarks.currentNode.value"
    :click-fn="clickByItem"
    :context-fn="onContextMenu"
    :background-context-fn="onBackgroundMenu"
    :icon-fn="getIcon"
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
  <div v-if="dialog.show" class="modal-overlay" @click.self="dialog.show = false" @contextmenu.prevent>
    <div class="modal">
      <div class="modal-title">{{ dialog.title }}</div>
      <input
        v-model="dialog.value"
        ref="dialogInput"
        class="modal-input"
        type="text"
        :placeholder="dialog.placeholder"
        @keyup.enter="submitDialog"
        @keyup.esc="closeDialog"
      />
      <div class="modal-actions">
        <button class="modal-btn" @click="closeDialog">{{ t('cancel') }}</button>
        <button class="modal-btn primary" @click="submitDialog">{{ t('ok') }}</button>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { ready } from '@/assets/chrome-mock.js';
import chromeAPI from '@/assets/chrome-mock.js';
import { useBookmarks } from '@/composables/useBookmarks.js';
import { useLocale } from '@/composables/useLocale.js';

import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';
import BreadCrumbs from '@/components/BreadCrumbs.vue';
import PageToolbar from '@/components/Common/PageToolbar.vue';
import BookmarkGrid from '@/components/Bookmark/BookmarkGrid.vue';
import BookmarkTable from '@/components/Bookmark/BookmarkTable.vue';
import BlocksSettings from '@/components/Common/BlocksSettings.vue';

const bookmarks = useBookmarks();
const { t } = useLocale();

const VIEW_MODE_KEY = 'viewMode';
const viewMode = ref(localStorage.getItem(VIEW_MODE_KEY) === 'table' ? 'table' : 'grid');
const dragItem = ref(null);

const ctxMenu = ref({
  theme: 'dark',
  zIndex: 3,
  show: false,
  x: 0,
  y: 0,
  items: [],
});

const dialog = ref({
  show: false,
  mode: null,
  title: '',
  placeholder: '',
  value: '',
  target: null,
});
const dialogInput = ref(null);

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
      label: t('open'),
      visible: true,
      action: () => clickByItem(bookmark),
    },
    {
      label: t('rename'),
      visible: true,
      action: () => openRenameDialog(bookmark),
    },
    {
      label: t('delete'),
      visible: true,
      action: () => removeItem(bookmark),
    },
  ];
  bookmarks.selectedItem.value = bookmark;
}

function onBackgroundMenu(e) {
  e.preventDefault();
  ctxMenu.value.x = e.x;
  ctxMenu.value.y = e.y;
  ctxMenu.value.show = true;
  ctxMenu.value.items = [
    {
      label: t('newFolder'),
      visible: true,
      action: openCreateFolderDialog,
    },
  ];
  bookmarks.selectedItem.value = null;
}

function openRenameDialog(bookmark) {
  dialog.value = {
    show: true,
    mode: 'rename',
    title: t('rename'),
    placeholder: t('enterName'),
    value: bookmark.title,
    target: bookmark,
  };
  focusDialog();
}

function openCreateFolderDialog() {
  dialog.value = {
    show: true,
    mode: 'create',
    title: t('newFolder'),
    placeholder: t('folderName'),
    value: '',
    target: null,
  };
  focusDialog();
}

function closeDialog() {
  dialog.value.show = false;
}

function focusDialog() {
  nextTick(() => {
    dialogInput.value?.focus();
    dialogInput.value?.select();
  });
}

async function submitDialog() {
  const value = dialog.value.value.trim();
  if (!value) {
    closeDialog();
    return;
  }
  if (dialog.value.mode === 'rename' && dialog.value.target) {
    await chromeAPI.bookmarks.update(dialog.value.target.id, { title: value });
  } else if (dialog.value.mode === 'create') {
    await chromeAPI.bookmarks.create({
      parentId: bookmarks.currentParentId.value,
      title: value,
    });
  }
  closeDialog();
  await bookmarks.reload();
}

async function removeItem(bookmark) {
  if (Array.isArray(bookmark.children)) {
    await chromeAPI.bookmarks.removeTree(bookmark.id);
  } else {
    await chromeAPI.bookmarks.remove(bookmark.id);
  }
  await bookmarks.reload();
  bookmarks.selectedItem.value = null;
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
  .bookmark-view {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  /* segmented control */
  .view-toggle {
    display: flex;
    gap: 4px;
  }
  .view-toggle .view-icon {
    display: inline-flex;
    width: 16px;
    height: 16px;
    background-color: currentColor;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-size: contain;
    mask-size: contain;
  }
  .view-toggle .icon-grid {
    -webkit-mask-image: var(--vt-view-grid-icon);
    mask-image: var(--vt-view-grid-icon);
  }
  .view-toggle .icon-table {
    -webkit-mask-image: var(--vt-view-table-icon);
    mask-image: var(--vt-view-table-icon);
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

  /* rename / create-folder dialog */
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  .modal {
    width: min(360px, calc(100vw - 48px));
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px;
    background: var(--popup-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  .modal-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .modal-input {
    width: 100%;
    padding: 10px 14px;
    font-family: inherit;
    font-size: 14px;
    color: var(--text-primary);
    background: var(--glass-bg-strong);
    border: 1px solid var(--border);
    border-radius: 12px;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    box-sizing: border-box;
  }
  .modal-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(109, 92, 255, 0.25);
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  .modal-btn {
    padding: 8px 18px;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
    background: var(--popup-hover);
    border: 1px solid var(--border);
    border-radius: 999px;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  .modal-btn:hover {
    background: var(--glass-hover);
  }
  .modal-btn.primary {
    background: linear-gradient(135deg, var(--accent), #8b5cf6);
    color: #ffffff;
    border-color: transparent;
    box-shadow: 0 2px 10px rgba(109, 92, 255, 0.45);
  }
</style>
