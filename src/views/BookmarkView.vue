<template>
  <div class="toolbar">
    <BreadCrumbs
      :items="parents"
      :root-element="allBookmarks"
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
  <div v-show="currentNode == null">
    Загрузка данных...
  </div>
  <BookmarkGrid
    v-if="viewMode === 'grid' && currentNode != null"
    :items="currentNode"
    :click-fn="clickByItem"
    :context-fn="onContextMenu"
    :icon-fn="getIcon"
    :drag-enabled="dragEnabled"
    :drag-start-fn="dragStart"
    :drop-fn="dropOn"
    :drop-root-fn="dropToRoot"
  />
  <BookmarkTable
    v-else-if="viewMode === 'table' && currentNode != null"
    :items="currentNode"
    :click-fn="clickByItem"
    :context-fn="onContextMenu"
    :icon-fn="getIcon"
    :drag-enabled="dragEnabled"
    :drag-start-fn="dragStart"
    :drop-fn="dropOn"
    :drop-root-fn="dropToRoot"
  />
  <context-menu v-model:show="optionsComponent.show" :options="optionsComponent" >
    <component :is="menuItem.component || 'ContextMenuItem'"
      v-bind="{label: menuItem.label}"
      v-on="{click: menuItem.action }"
      v-for="(menuItem, index) in optionsComponent.items"  
      :key="index"
      v-show="menuItem.visible || true"
    />
  </context-menu>
</template>

<script>
import chromeAPI from '../assets/chrome-mock.js';
import BreadCrumbs from '../components/BreadCrumbs.vue'
import BookmarkGrid from '../components/Bookmark/BookmarkGrid.vue'
import BookmarkTable from '../components/Bookmark/BookmarkTable.vue'

import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import { ref } from 'vue';

const bookmarkTree = ref(null)
const bookmarksRoot = ref(null)
const selectedItem = ref(null)
const rootNode = ref(null)

const VIEW_MODE_KEY = 'viewMode'


async function loadBookmarks(){
  bookmarkTree.value = await chromeAPI.bookmarks.getTree();
  bookmarksRoot.value = bookmarkTree.value[0]?.children[0]?.children ?? [];
  rootNode.value = bookmarkTree.value[0]?.children[0] ?? null;
}

async function removeBookmark(id){
  chromeAPI.bookmarks.remove(id, loadBookmarks);
}

function findNodeById(nodes, id){
  if (id == null || !Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    if (Array.isArray(node.children)) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export default {
  components:{ BreadCrumbs, BookmarkGrid, BookmarkTable },
  data(){
    var currentContext = this;
    return {
      parents: [],
      allBookmarks: null,
      currentNode: null,
      dragEnabled: false,
      dragItem: null,
      currentParentId: null,
      viewMode: localStorage.getItem(VIEW_MODE_KEY) === 'table' ? 'table' : 'grid',
      optionsComponent: {
        theme: 'dark',
        zIndex: 3,
        show: false,
        items: [
          { label: 'Удалить', visible: true, action: function() {
            removeBookmark(selectedItem.value.id);
            currentContext.setInited();
          }},
        ]
      }
    } 
  },
  methods: {
    getDomainFromUrl(url) {
      const regex = /^(?:https?:\/\/)?(?:www\.)?([^/?#]+)/i;
      const match = url.match(regex);
      return match ? match[1] : null;
    },
    onContextMenu(e, bookmark) {
      e.preventDefault();
      this.optionsComponent.x = e.x;
      this.optionsComponent.y = e.y;
      this.optionsComponent.show = true;
      selectedItem.value = bookmark;
    },
    getIcon(bookmark){
      const domain = this.getDomainFromUrl(bookmark.url);
      return domain ? domain.replaceAll('.', '_') : 'file';
    },
    setViewMode(mode){
      this.viewMode = mode;
      localStorage.setItem(VIEW_MODE_KEY, mode);
    },
    setInited(){
      //chrome.bookmarks.get
      const rootId = rootNode.value?.id ?? null;
      const pid = this.currentParentId ?? rootId;
      const fresh = findNodeById(bookmarkTree.value, pid);
      if (fresh && Array.isArray(fresh.children)) {
        this.currentNode = fresh.children;
        this.allBookmarks = fresh.children;
        this.currentParentId = pid;
      } else {
        this.currentNode = bookmarksRoot.value;
        this.allBookmarks = bookmarksRoot.value;
        this.currentParentId = rootId;
      }
    },
    clickByItem(bookmark){
      if(Array.isArray(bookmark.children)){
        this.currentNode = bookmark.children;
        this.currentNode.parentElement = bookmark;
        this.currentParentId = bookmark.id ?? rootNode.value?.id ?? null;
        if (bookmark.id == null)
          this.parents = [];
        else{
          var elementIndex = this.parents.indexOf(bookmark);
          if(elementIndex >= 0)
            this.parents.splice(elementIndex + 1);
          else 
            this.parents.push(bookmark);
        }
      }
      else
        chromeAPI.tabs.create({ url: bookmark.url });
    },
    dragStart(bookmark){
      this.dragItem = bookmark;
    },
    dropOn(target){
      const item = this.dragItem;
      this.dragItem = null;
      if (!item || item.id === target.id) return;
      if (Array.isArray(target.children)) {
        this.moveBookmark(item.id, { parentId: target.id, index: (target.children || []).length });
        return;
      }
      this.moveBookmark(item.id, { parentId: this.currentParentId, index: this.currentNode ? this.currentNode.indexOf(target) : 0 });
    },
    dropToRoot(){
      const item = this.dragItem;
      this.dragItem = null;
      if (!item) return;
      this.moveBookmark(item.id, { parentId: rootNode.value?.id ?? null, index: rootNode.value?.children?.length ?? 0 });
    },
    moveBookmark(id, destination){
      if (id == null || destination.parentId == null) return;
      chromeAPI.bookmarks.move(id, destination, () => this.setInited());
    },
    reload(){
      var currentContext = this;
      return (async () => {
        await loadBookmarks();
        currentContext.setInited();
      })();
    },
  },
 async mounted() {
    this.reload();
    const reloader = () => this.reload();
    // Обработка событий закладок
    chromeAPI.bookmarks.onCreated.addListener(reloader);
    chromeAPI.bookmarks.onRemoved.addListener(reloader);
    chromeAPI.bookmarks.onChanged.addListener(reloader);
    chromeAPI.bookmarks.onMoved.addListener(reloader);
    chromeAPI.bookmarks.onChildrenReordered.addListener(reloader);
    },
  }
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