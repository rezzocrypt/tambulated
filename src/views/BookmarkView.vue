<template>
  <div class="breadcrumbs" >
    <a class="crumb" v-on:click="clickByItem({children: bookmarks})">Главная</a>
    <a class="crumb" v-for="item in parents" :key="item.id" v-on:click="clickByItem(item)">
      {{item.title}}
    </a>
  </div>
  <div class="wrapper">
    <div v-show="bookmarks == null">
      Загрузка данных...
    </div>
    <div class="bookmark-item" v-for="bookmark in currentNode" :key="bookmark.id">
      <a :class="Array.isArray(bookmark.children) && bookmark.children.length > 0 ? 'folder' : 'file'" v-on:click="clickByItem(bookmark)">
        <div class="icon" :style="bookmark.icon != null ? `background: ${bookmark.icon}`:''"></div>
        <p class="label">{{ bookmark.title }}</p>
        <slot />
      </a>
    </div>
  </div>
</template>

<script>
import chromeAPI from '../assets/chrome-mock.js';
export default {
  data(){ return { bookmarks: null, currentNode: null, parents: [] } },
  methods: {
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

    document.documentElement.style.setProperty('--background', 'url("https://getwallpapers.com/wallpaper/full/b/d/d/765230-technology-background-images-2560x1400-for-android.jpg")');
  },
}
</script>

<style scoped>
  .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
    overflow: hidden;
  }
  .breadcrumbs{
    width: 100%;
    border-radius: 5px;
    padding: 2px 10px;
    text-decoration: none;
    font-size: 80%;
    background: var(--background-color);
    opacity: 0.2;
  }
  
  .breadcrumbs .crumb:not(:first-child)::before{
    content: "/";
    color: #999;
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