<template>
  <div class="table-wrapper"
       @dragover.prevent="onWrapperDragOver"
       @drop.prevent="onWrapperDrop">
    <table class="bookmark-table">
      <thead>
        <tr>
          <th class="td-icon"></th>
          <th class="td-title">Название</th>
          <th class="td-url">Адрес</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="bookmark in items" :key="bookmark.id"
            :draggable="dragEnabled ? 'true' : undefined"
            :title="bookmark.title"
            :class="{ hovered: hoveredId === bookmark.id, 'drag-enabled': dragEnabled }"
            @click="onClick(bookmark)"
            @contextmenu="onContextMenu($event, bookmark)"
            @dragstart="onDragStart(bookmark, $event)"
            @dragover.prevent="onDragOver(bookmark)"
            @dragleave="onDragLeave(bookmark)"
            @drop.prevent.stop="onDrop(bookmark)"
            @dragend="onDragEnd">
          <td class="td-icon">
            <a :class="bookmark.url == undefined ? 'folder' : iconFn(bookmark)">
              <div class="icon"></div>
            </a>
          </td>
          <td class="td-title">{{ bookmark.title }}</td>
          <td class="td-url">{{ bookmark.url || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'BookmarkTable',
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
  .table-wrapper {
    overflow: auto;
    padding-top: 20px;
  }
  .bookmark-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 85%;
  }
  .bookmark-table th,
  .bookmark-table td {
    text-align: left;
    padding: 6px 10px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.35);
  }
  .bookmark-table th {
    font-weight: 600;
    opacity: 0.8;
  }
  .bookmark-table tbody tr {
    cursor: pointer;
  }
  .bookmark-table tbody tr.drag-enabled {
    cursor: grab;
    user-select: none;
  }
  .bookmark-table tbody tr.hovered {
    background: rgba(255, 255, 255, 0.12);
    outline: 2px dashed rgba(255, 255, 255, 0.7);
    outline-offset: -2px;
  }
  .bookmark-table tbody tr:hover {
    background: rgba(255, 255, 255, 0.12);
  }
  .bookmark-table .td-icon {
    width: 40px;
  }
  .bookmark-table .td-icon a {
    display: inline-block;
    width: 22px;
    height: 22px;
  }
  .bookmark-table .td-icon .icon {
    width: 100%;
    height: 100%;
    background-size: cover !important;
    background-repeat: no-repeat !important;
    border-radius: 4px;
  }
  .bookmark-table .td-title {
    width: 35%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bookmark-table .td-url {
    color: var(--color-text);
    opacity: 0.75;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bookmark-table .folder .icon { background: var(--vt-bookmark-folder-icon); }
  .bookmark-table .icon { background: var(--vt-bookmark-file-icon); }
</style>