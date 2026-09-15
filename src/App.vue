<template>
  <PageBackground />
  <div class="app-body" @contextmenu.prevent="null">
    <div class="sidebar">
      <DateTimeBlock />
    </div>
    <div class="main">
      <router-view />
    </div>
  </div>
</template>

<script setup>
  import PageBackground from './components/Common/PageBackground.vue';
  import DateTimeBlock from './components/Common/DateTimeBlock.vue';
</script>

<style scoped>
  .app-body {
    display: flex;
  }
  .app-body > div{
    margin:10px;
  }
  .sidebar{
    width: 250px;
    filter: drop-shadow(0 0 2px #222);
  }
  .main{
    min-width: 600px;
    width: 100%;
  }
</style>