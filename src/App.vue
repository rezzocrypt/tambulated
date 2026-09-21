<template>
  <PageBackground />
  <div class="dashboard">
    <aside class="sidebar">
      <component
        v-for="id in visibleBlocks"
        :key="id"
        :is="BLOCK_COMPONENTS[id]"
      />
    </aside>
    <main class="main" @contextmenu.prevent>
      <router-view />
    </main>
  </div>
</template>

<script setup>
  import { computed } from 'vue';
  import PageBackground from '@/components/Common/PageBackground.vue';
  import DateTimeBlock from '@/components/Common/DateTimeBlock.vue';
  import WeatherBlock from '@/components/Common/WeatherBlock.vue';
  import CryptoRates from '@/components/Common/CryptoRates.vue';
  import { useBlockConfig } from '@/composables/useBlocks.js';

  const BLOCK_COMPONENTS = Object.freeze({
    datetime: DateTimeBlock,
    weather: WeatherBlock,
    crypto: CryptoRates,
  });

  const { blocks, isHidden } = useBlockConfig();
  const visibleBlocks = computed(() => blocks.value.filter((id) => !isHidden(id)));
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