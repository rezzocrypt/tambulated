<template>
  <div class="wrapper">
    <div v-show="bookmarksRoot == null">
      Загрузка данных...
    </div>
    <div class="bookmark-item" v-for="bookmark in bookmarksRoot" :key="bookmark.id" @contextmenu="onContextMenu($event, bookmark)">
      <a :class="'folder'" v-on:click="clickByItem(bookmark)">
        <div class="icon-wrapper">
          <div class="icon"></div>
        </div>
        <p class="label">{{ bookmark.title }}</p>
        <slot />
      </a>
    </div>
  </div>
</template>

<script setup>
  import chromeAPI from '../assets/chrome-mock.js';
</script>
<script>
export default {
  data(){
    return {
      bookmarkTree: [],
      bookmarksRoot: [],
      currentPath: []
    } 
  },
  methods: {
    async reloadBookmarks(){
      this.bookmarkTree = await chromeAPI.bookmarks.getTree();
      //console.log("reloadBookmarks 1 =>", this.bookmarkTree)
      this.bookmarksRoot = this.bookmarkTree[0]?.children[0]?.children ?? [];
      //console.log("reloadBookmarks 2 =>", this.bookmarksRoot)
    }
  },
 async mounted() {
    this.reloadBookmarks();
    chromeAPI.bookmarks.onCreated.addListener(this.reloadBookmarks);
    chromeAPI.bookmarks.onRemoved.addListener(this.reloadBookmarks);
    chromeAPI.bookmarks.onChanged.addListener(this.reloadBookmarks);
    chromeAPI.bookmarks.onMoved.addListener(this.reloadBookmarks);
    chromeAPI.bookmarks.onChildrenReordered.addListener(this.reloadBookmarks);
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