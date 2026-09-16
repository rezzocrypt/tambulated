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
          <td class="td-title">
            <span class="title-text">{{ bookmark.title }}</span>
          </td>
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
    flex: 1;
    min-height: 0;
  }
  .bookmark-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    font-size: 14px;
    background: var(--glass-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .bookmark-table thead th {
    text-align: left;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.18);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid var(--border);
  }
  .bookmark-table tbody td {
    padding: 10px 16px;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border);
    overflow: hidden;
  }
  .bookmark-table tbody tr:last-child td {
    border-bottom: none;
  }
  .bookmark-table tbody tr {
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .bookmark-table tbody tr.drag-enabled {
    cursor: grab;
    user-select: none;
  }
  .bookmark-table tbody tr:not(.hovered):hover {
    background: var(--glass-hover);
  }
  .bookmark-table tbody tr.hovered {
    background: var(--glass-hover);
    outline: 2px dashed var(--accent);
    outline-offset: -2px;
  }
  .bookmark-table .td-icon {
    width: 52px;
  }
  .bookmark-table .td-icon a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 3px;
    border-radius: 7px;
    background: var(--glass-bg-strong);
    border: 1px solid var(--border);
  }
  .bookmark-table .td-icon .icon {
    width: 100%;
    height: 100%;
    background-size: cover !important;
    background-repeat: no-repeat !important;
    border-radius: 3px;
  }
  .bookmark-table .td-title {
    width: 35%;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .bookmark-table .td-title .title-text {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  }
  .bookmark-table .td-url {
    color: var(--text-secondary);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .bookmark-table .folder .icon { background: var(--vt-bookmark-folder-icon); }
  .bookmark-table .icon { background: var(--vt-bookmark-file-icon); }
</style>