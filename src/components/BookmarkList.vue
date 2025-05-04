<template>
    <transition name="fade-list">
      <div v-if="bookmarks.length > 0">
        <div class="bookmarks">
          <bookmark-item
            v-for="bookmark in bookmarks"
            :key="bookmark.createdAt"
            :bookmark="bookmark"
          />
        </div>
      </div>
      <div v-else>
        <h3>Bookmark list is empty</h3>
        <my-button
          @click="$router.push('bookmark')"
          class="margin__top__20"
        >
          Add a Bookmark
        </my-button>
      </div>
    </transition>
  </template>
  
  <script lang="ts">
  import { defineComponent } from 'vue';
  import BookmarkItem from '@/components/BookmarkItem.vue';
  
  export default defineComponent({
    name: 'bookmark-list',
    components: {
      BookmarkItem,
    },
    props: {
      bookmarks: {
        type: Array,
        required: true,
      },
    },
  });
  </script>
  
  <style scoped lang="scss">
  .bookmarks {
    justify-content: left;
    width: 100%;
    background: $bookmarks-list;
  }
  
  .fade-list-enter-active,
  .fade-list-leave-active {
    transition: opacity 0.5s ease;
  }
  
  .fade-list-enter-from,
  .fade-list-leave-to {
    opacity: 0;
  }
  
  </style>