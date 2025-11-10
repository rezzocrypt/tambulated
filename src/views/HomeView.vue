<script setup>
  import BookmarkItem from '../components/BookmarkItem.vue'
</script>

<template>
  <div class="wrapper">
    <BookmarkItem v-for="bookmark in bookmarks" :key="bookmark.id"
      :name="bookmark.title"
      :url="bookmark.url"
      :icon="bookmark.icon"
      :childs="bookmark.children"
      :id="bookmark.id"/>
  </div>
</template>

<script>
import chromeAPI from '../assets/chrome-mock.js';
export default {
  data(){ return { bookmarks: [] } },
  methods: {
    async loadBookmarks(){
      console.log(chrome)
      const tree = await chromeAPI.bookmarks.getTree();
      console.log(tree)
      this.bookmarks = tree[0]?.children[0]?.children ?? [];
    }
  },
 mounted() {
    // Обработка событий закладок
    chromeAPI.bookmarks.onCreated.addListener(this.loadBookmarks);
    chromeAPI.bookmarks.onRemoved.addListener(this.loadBookmarks);
    chromeAPI.bookmarks.onChanged.addListener(this.loadBookmarks);
    chromeAPI.bookmarks.onMoved.addListener(this.loadBookmarks);
    chromeAPI.bookmarks.onChildrenReordered.addListener(this.loadBookmarks);
    this.loadBookmarks()
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
</style>