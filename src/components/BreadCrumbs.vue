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
        {{item.title}}
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BreadCrumbs',
  props: {
    items: { type: Array, default:  () => [] },
    rootElement: { type: Array, default:  () => [] },
    clickFn: {type: Function, default: null},
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
  }
}
</script>

<style scoped>
  .breadcrumbs {
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

  .breadcrumbs .crumb-section.hovered .crumb {
    outline: 2px dashed rgba(255, 255, 255, 0.7);
    outline-offset: 2px;
    border-radius: 4px;
  }
</style>

<style>
  .breadcrumbs {
    background: linear-gradient(to right,
      rgba(255,255,255, 0) 0%,
      rgba(255,255,255, 0.6) 20%,
      rgba(255,255,255, 1) 100%);
  }

  @media (prefers-color-scheme: dark) {
    .breadcrumbs {
      background: linear-gradient(to right,
        rgba(255,255,255, 1) 0%,
        rgba(255,255,255, 0.6) 20%,
        rgba(255,255,255, 0) 100%);
    }
  }
</style>