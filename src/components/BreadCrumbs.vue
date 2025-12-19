<template>
  <div class="breadcrumbs" >
    <div class="crumb-section">
      <a class="crumb" v-on:click="clickFn({children: rootElement})">Главная</a>
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
    clickFn: {type: Function, default: null}
  }
}
</script>

<style scoped>
  .breadcrumbs {
    width: 100%;
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
</style>