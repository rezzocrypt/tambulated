<template>
  <nav class="app-menu" :aria-label="t('menu')">
    <router-link
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      exact-active-class="active"
      class="app-menu-item"
      :title="item.label"
      :aria-label="item.label"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round" v-html="item.icon"></svg>
    </router-link>
    <div class="app-menu-sep"></div>
    <SettingsMenu />
  </nav>
</template>

<script setup>
import { useLocale } from '@/composables/useLocale.js';
import SettingsMenu from '@/components/Common/SettingsMenu.vue';

const { t } = useLocale();

const items = [
  {
    to: '/',
    label: t('navBookmarks'),
    icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>',
  },
  {
    to: '/tasks',
    label: t('tasksTitle'),
    icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
  },
];
</script>

<style scoped>
.app-menu {
  position: fixed;
  top: 50%;
  right: 16px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  transform: translateY(-50%);
  background: var(--glass-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.app-menu-sep {
  flex-shrink: 0;
  height: 1px;
  margin: 2px 4px;
  background: var(--border);
}
:deep(.settings) {
  display: flex;
  justify-content: flex-end;
}
:deep(.settings-pop) {
  top: auto;
  bottom: calc(100% + 10px);
}
.app-menu-item {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.app-menu-item:hover {
  background: var(--glass-hover);
  color: var(--text-primary);
}
.app-menu-item.active {
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(109, 92, 255, 0.45);
}
</style>