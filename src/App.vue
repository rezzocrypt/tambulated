<template>
  <PageBackground />
  <div class="dashboard">
    <aside class="sidebar">
      <DateTimeBlock />
    </aside>
    <main class="main" @contextmenu.prevent>
      <router-view />
    </main>
  </div>
</template>

<script setup>
  import PageBackground from '@/components/Common/PageBackground.vue';
  import DateTimeBlock from '@/components/Common/DateTimeBlock.vue';
</script>

<style scoped>
  .dashboard {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: stretch;
    gap: 20px;
    flex: 1;
    min-height: 0;
  }
  .sidebar {
    width: 220px;
    flex-shrink: 0;
  }
  .main {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>