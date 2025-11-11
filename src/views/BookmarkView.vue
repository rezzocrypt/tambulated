<template>
  <div class="breadcrumbs" >
    <div class="crumb-section">
      <a class="crumb" v-on:click="clickByItem({children: bookmarks})">Главная</a>
    </div>
    <div class="crumb-section" v-for="item in parents" :key="item.id">
      <a class="crumb" v-on:click="clickByItem(item)">
        {{item.title}}
      </a>
    </div>
  </div>
  <div class="wrapper">
    <div v-show="bookmarks == null">
      Загрузка данных...
    </div>
    <div class="bookmark-item" v-for="bookmark in currentNode" :key="bookmark.id" @contextmenu="onContextMenu($event)">
      <a
        :class="Array.isArray(bookmark.children) && bookmark.children.length > 0 ? 'folder' : 'file'" 
        v-on:click="clickByItem(bookmark)">
        <div class="icon"></div>
        <p class="label">{{ bookmark.title }}</p>
        <slot />
      </a>
    </div>
  </div>

  <context-menu v-model:show="optionsComponent.show" :options="optionsComponent">
    <context-menu-item label="Открыть" @click="alertContextMenuItemClicked('Item1')" />
    <context-menu-separator />
    <context-menu-item label="Переименовать" @click="alertContextMenuItemClicked('Item2')" />
    <context-menu-item label="Изменить" @click="alertContextMenuItemClicked('Item2')" />
    <context-menu-item label="Переместить" @click="alertContextMenuItemClicked('Item2')" />
    <context-menu-item label="Удалить" @click="alertContextMenuItemClicked('Item2')" />
  </context-menu>
</template>

<script>
import chromeAPI from '../assets/chrome-mock.js';
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'

export default {
  data(){
    return {
      bookmarks: null,
      currentNode: null,
      parents: [],

      optionsComponent: {
        theme: 'dark',
        zIndex: 3,
        show: false
      }
    } 
  },
  methods: {
        onContextMenu(e) {
          e.preventDefault();
          this.optionsComponent.x = e.x;
          this.optionsComponent.y = e.y;
          this.optionsComponent.show = true;
        },
        alertContextMenuItemClicked(name) {
          alert('You clicked ' + name + ' !');
        },

    async loadBookmarks(){
      const tree = await chromeAPI.bookmarks.getTree();
      this.bookmarks = tree[0]?.children[0]?.children ?? [];
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
    // Обработка событий закладок
    chromeAPI.bookmarks.onCreated.addListener(this.loadBookmarks);
    chromeAPI.bookmarks.onRemoved.addListener(this.loadBookmarks);
    chromeAPI.bookmarks.onChanged.addListener(this.loadBookmarks);
    chromeAPI.bookmarks.onMoved.addListener(this.loadBookmarks);
    chromeAPI.bookmarks.onChildrenReordered.addListener(this.loadBookmarks);
    await this.loadBookmarks();
    this.currentNode = this.bookmarks;

    document.documentElement.style.setProperty('--background', 'url("https://avatars.mds.yandex.net/i?id=032dfc4ad7cd452aca1b95d89434803b_l-4820594-images-thumbs&n=13")');

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
  .breadcrumbs {
    width: 100%;
    border-radius: 5px;
    padding: 2px 10px;
    text-decoration: none;
    font-size: 80%;
    flex-flow: nowrap;
    display: flex;
  }

  .breadcrumbs a {
    color: var(--breadcrumb-text-color) !important;
  }
  .breadcrumbs a:hover {
    text-decoration: underline;
  }
  
  .breadcrumbs .crumb-section:not(:first-child)::before{
    content: "/";
    color: var(--breadcrumb-text-color) ;
    margin: 0 10px;
  }

  .bookmark-item {
    width: var(--vt-bookmark-icon-size);
    cursor: pointer;
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
  .folder > .icon { background: var(--vt-bookmark-folder-icon); }
  .file > .icon { background: var(--vt-bookmark-file-icon); }
  a .label{
    filter: drop-shadow(0 0 2px #222);
  }
  a:hover .label{
    text-decoration: underline;
  }
</style>