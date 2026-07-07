<template>
  <BreadCrumbs :items="parents" :root-element="allBookmarks" :click-fn="clickByItem"/>
  <div class="wrapper">
    <div v-show="currentNode == null">
      Загрузка данных...
    </div>
    <div class="bookmark-item" v-for="bookmark in currentNode" :key="bookmark.id" @contextmenu="onContextMenu($event, bookmark)">
      <a
        :class="bookmark.url == undefined ? 'folder' : getIcon(bookmark)" 
        v-on:click="clickByItem(bookmark)">
        <div class="icon-wrapper">
          <div class="icon"></div>
        </div>
        <p class="label">{{ bookmark.title }}</p>
        <slot />
      </a>
    </div>
  </div>
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

import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import { ref } from 'vue';

const bookmarkTree = ref(null)
const bookmarksRoot = ref(null)
const selectedItem = ref(null)


async function loadBookmarks(){
  bookmarkTree.value = await chromeAPI.bookmarks.getTree();
  bookmarksRoot.value = bookmarkTree.value[0]?.children[0]?.children ?? [];
  //console.log("loadBookmarks", bookmarkTree, bookmarksRoot)
}

async function removeBookmark(id){
  chromeAPI.bookmarks.remove(id, loadBookmarks);
}

export default {
  components:{ BreadCrumbs },
  data(){
    var currentContext = this;;
    return {
      parents: [],
      allBookmarks: null,
      currentNode: null,
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
      const regex = /^(?:https?:\/\/)?(?:www\.)?([^\/?#]+)/i;
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
      //console.log(bookmark.url);
      return this.getDomainFromUrl(bookmark.url).replaceAll('.', '_');
      if(bookmark.url.indexOf('github.com') > 0)
        return 'git_file';
      return 'file';
    },
    setInited(){
      //chrome.bookmarks.get
      this.currentNode = /*this.currentNode ??*/ bookmarksRoot.value;
      this.allBookmarks = bookmarksRoot.value;
    },
    clickByItem(bookmark){
      if(Array.isArray(bookmark.children)){
        this.currentNode = bookmark.children;
        this.currentNode.parentElement = bookmark;
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
        chrome.tabs.create({ url: bookmark.url });
    }
  },
 async mounted() {
    var currentContext = this;
    var reloader = async (e, element) => {
      await loadBookmarks();
      currentContext.setInited();
    };
    // Обработка событий закладок
    reloader();
    chromeAPI.bookmarks.onCreated.addListener(reloader);
    chromeAPI.bookmarks.onRemoved.addListener(reloader);
    chromeAPI.bookmarks.onChanged.addListener(reloader);
    chromeAPI.bookmarks.onMoved.addListener(reloader);
    chromeAPI.bookmarks.onChildrenReordered.addListener(reloader);
    },
  }
</script>

<style scoped>
  .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
    overflow: auto;
    padding-top: 20px;
  }
  .bookmark-item {
    width: var(--vt-bookmark-icon-size);
    cursor: pointer;
  }
  .bookmark-item a .label{
    filter: drop-shadow(0 0 2px #222);
  }
  .bookmark-item a:hover .label{
    text-decoration: underline;
  }
  .bookmark-item .icon-wrapper{
    
  }
  .bookmark-item .icon {
      width: 100%;
      height: var(--vt-bookmark-icon-size);
      background-size: cover !important;
      background-repeat: no-repeat !important;
  }
  .bookmark-item .label {
      text-align: center;
      text-overflow: ellipsis;
      overflow: hidden;
      word-wrap: break-word;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      font-size: 70%;
  }
  .bookmark-item .folder .icon { background: var(--vt-bookmark-folder-icon); }
  .bookmark-item .icon { background: var(--vt-bookmark-file-icon); }
</style>