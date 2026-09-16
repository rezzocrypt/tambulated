<template>
  <div class="breadcrumbs">
    <div class="crumb-section" :class="{ hovered: hoveredCrumb }">
      <a class="crumb"
         v-on:click="clickFn({children: rootElement})"
         @dragover.prevent="onDragOver"
         @dragleave="onDragLeave"
         @drop.prevent.stop="onDropRoot">Главная</a>
    </div>
    <div class="crumb-section" v-for="item in items" :key="item.id">
      <a class="crumb" v-on:click="clickFn(item)">
        {{ item.title }}
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BreadCrumbs',
  props: {
    items: { type: Array, default: () => [] },
    rootElement: { type: Array, default: () => [] },
    clickFn: { type: Function, default: null },
    dragEnabled: { type: Boolean, default: false },
    dropRootFn: { type: Function, default: null },
  },
  data() {
    return { hoveredCrumb: false };
  },
  methods: {
    onDragOver() {
      if (this.dragEnabled) this.hoveredCrumb = true;
    },
    onDragLeave() {
      if (this.dragEnabled) this.hoveredCrumb = false;
    },
    onDropRoot() {
      if (!this.dragEnabled) return;
      this.hoveredCrumb = false;
      if (this.dropRootFn) this.dropRootFn();
    },
  },
};
</script>

<style scoped>
  .breadcrumbs {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    overflow: hidden;
    min-width: 0;
  }
  .crumb-section {
    display: inline-flex;
    align-items: center;
    min-width: 0;
  }
  .crumb-section:not(:first-child)::before {
    content: "›";
    margin: 0 4px 0 8px;
    font-size: 16px;
    line-height: 1;
    color: var(--text-secondary);
    opacity: 0.5;
  }
  .crumb {
    padding: 4px 8px;
    border-radius: 8px;
    color: var(--text-secondary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.15s ease, background-color 0.15s ease;
  }
  .crumb:hover {
    color: var(--text-primary);
    background: var(--glass-hover);
  }
  .crumb-section.hovered .crumb {
    outline: 2px dashed var(--accent);
    outline-offset: 2px;
    background: var(--glass-hover);
  }
</style>