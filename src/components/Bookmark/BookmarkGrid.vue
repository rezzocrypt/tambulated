<template>
  <div class="wrapper"
       @dragover.prevent="onWrapperDragOver"
       @drop.prevent="onWrapperDrop">
    <div class="bookmark-item"
         v-for="bookmark in items" :key="bookmark.id"
         :draggable="dragEnabled ? 'true' : undefined"
         :class="{ hovered: hoveredId === bookmark.id, 'drag-enabled': dragEnabled }"
         @contextmenu="onContextMenu($event, bookmark)"
         @click="onClick(bookmark)"
         @dragstart="onDragStart(bookmark, $event)"
         @dragover.prevent="onDragOver(bookmark)"
         @dragleave="onDragLeave(bookmark)"
         @drop.prevent.stop="onDrop(bookmark)"
         @dragend="onDragEnd">
      <a
        :class="bookmark.url == undefined ? 'folder' : iconFn(bookmark)">
        <div class="icon-wrapper">
          <div class="icon"></div>
        </div>
        <p class="label">{{ bookmark.title }}</p>
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BookmarkGrid',
  props: {
    items: { type: Array, default: () => [] },
    clickFn: { type: Function, default: null },
    contextFn: { type: Function, default: null },
    iconFn: { type: Function, default: null },
    dragEnabled: { type: Boolean, default: false },
    dragStartFn: { type: Function, default: null },
    dropFn: { type: Function, default: null },
    dropRootFn: { type: Function, default: null },
  },
  data() {
    return { hoveredId: null };
  },
  methods: {
    onClick(bookmark) {
      if (this.clickFn) this.clickFn(bookmark);
    },
    onContextMenu(e, bookmark) {
      if (this.contextFn) this.contextFn(e, bookmark);
    },
    onDragStart(bookmark, e) {
      if (!this.dragEnabled) return;
      const dt = e.dataTransfer;
      if (dt) {
        dt.effectAllowed = 'move';
        dt.setData('text/plain', bookmark.id);
      }
      if (this.dragStartFn) this.dragStartFn(bookmark);
    },
    onDragOver(bookmark) {
      if (this.dragEnabled) this.hoveredId = bookmark.id;
    },
    onDragLeave(bookmark) {
      if (this.dragEnabled && this.hoveredId === bookmark.id) this.hoveredId = null;
    },
    onDrop(bookmark) {
      if (!this.dragEnabled) return;
      this.hoveredId = null;
      if (this.dropFn) this.dropFn(bookmark);
    },
    onWrapperDragOver() {
      if (this.dragEnabled) this.hoveredId = null;
    },
    onWrapperDrop() {
      if (!this.dragEnabled) return;
      this.hoveredId = null;
      if (this.dropRootFn) this.dropRootFn();
    },
    onDragEnd() {
      this.hoveredId = null;
    },
  }
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
  .bookmark-item.drag-enabled {
    cursor: grab;
    user-select: none;
  }
  .bookmark-item.hovered {
    outline: 2px dashed rgba(255, 255, 255, 0.7);
    outline-offset: 2px;
    border-radius: 6px;
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