<template>
  <div class="wrapper"
       @dragover.prevent="onWrapperDragOver"
       @drop.prevent="onWrapperDrop"
       @contextmenu.prevent="onWrapperContextMenu">
    <div class="bookmark-item drag-enabled"
         v-for="bookmark in items" :key="bookmark.id"
         draggable="true"
         :class="{ hovered: hoveredId === bookmark.id }"
         @contextmenu.stop="onContextMenu($event, bookmark)"
         @click="onClick(bookmark)"
         @dragstart="onDragStart(bookmark, $event)"
         @dragover.prevent.stop="onDragOver(bookmark)"
         @dragleave="onDragLeave(bookmark)"
         @drop.prevent.stop="onDrop(bookmark)"
         @dragend="onDragEnd">
      <a
        :class="bookmark.url == undefined ? 'folder' : iconFn(bookmark)">
        <div class="icon-wrapper">
          <div class="icon">
            <img v-if="faviconUrl(bookmark)" class="favicon-img"
                 :src="faviconUrl(bookmark)" :alt="bookmark.title"
                 @error="onFaviconError($event, bookmark)" />
          </div>
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
    backgroundContextFn: { type: Function, default: null },
    iconFn: { type: Function, default: null },
    faviconUrlFn: { type: Function, default: null },
    dragStartFn: { type: Function, default: null },
    dropFn: { type: Function, default: null },
    dropRootFn: { type: Function, default: null },
  },
  data() {
    return { hoveredId: null };
  },
  methods: {
    faviconUrl(bookmark) {
      if (bookmark.url == undefined || !this.faviconUrlFn) return '';
      return this.faviconUrlFn(bookmark);
    },
    onFaviconError(e, bookmark) {
      e.target.style.display = 'none';
    },
    onClick(bookmark) {
      if (this.clickFn) this.clickFn(bookmark);
    },
    onContextMenu(e, bookmark) {
      if (this.contextFn) this.contextFn(e, bookmark);
    },
    onWrapperContextMenu(e) {
      if (this.backgroundContextFn) this.backgroundContextFn(e);
    },
    onDragStart(bookmark, e) {
      const dt = e.dataTransfer;
      if (dt) {
        dt.effectAllowed = 'move';
        dt.setData('text/plain', bookmark.id);
      }
      if (this.dragStartFn) this.dragStartFn(bookmark);
    },
    onDragOver(bookmark) {
      this.hoveredId = bookmark.id;
    },
    onDragLeave(bookmark) {
      if (this.hoveredId === bookmark.id) this.hoveredId = null;
    },
    onDrop(bookmark) {
      this.hoveredId = null;
      if (this.dropFn) this.dropFn(bookmark);
    },
    onWrapperDragOver() {
      this.hoveredId = null;
    },
    onWrapperDrop() {
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
    align-items: flex-start;
    align-content: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    overflow-y: auto;
    padding: 20px 4px 8px;
    flex: 1;
    min-height: 0;
  }
  .bookmark-item {
    width: var(--vt-bookmark-icon-size);
    cursor: pointer;
  }
  .bookmark-item a {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .bookmark-item.drag-enabled {
    cursor: grab;
    user-select: none;
  }
  .bookmark-item .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--vt-bookmark-icon-size);
    height: var(--vt-bookmark-icon-size);
    padding: 12px;
    background: var(--glass-bg-strong);
    border: 1px solid var(--border);
    border-radius: 20px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: var(--shadow-sm);
    transition:
      transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1),
      background-color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }
  .bookmark-item .icon {
    width: 100%;
    height: 100%;
    background-size: cover !important;
    background-repeat: no-repeat !important;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bookmark-item .favicon-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
  }
  .bookmark-item a:hover .icon-wrapper {
    transform: translateY(-4px);
    background: var(--glass-hover);
    border-color: var(--border-strong);
    box-shadow: var(--shadow);
  }
  .bookmark-item .label {
    width: 100%;
    text-align: center;
    font-size: 12.5px;
    line-height: 1.35;
    color: var(--text-primary);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    text-overflow: ellipsis;
    overflow: hidden;
    word-break: break-word;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  .bookmark-item.hovered .icon-wrapper {
    outline: 2px dashed var(--accent);
    outline-offset: 3px;
  }
  .bookmark-item .folder .icon { background: var(--vt-bookmark-folder-icon); }
  .bookmark-item .favicon .icon { background: var(--vt-bookmark-file-icon); }
</style>