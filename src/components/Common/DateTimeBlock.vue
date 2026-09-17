<template>
  <div class="datetime-card">
    <div class="sidebar-time">{{ currentTime }}</div>
    <div class="sidebar-date">{{ currentDate }}</div>
  </div>
</template>

<script>
import { useLocale } from '@/composables/useLocale.js';

export default {
  name: 'DateTimeBlock',
  data() {
    return {
      now: new Date(),
      intervalRef: null,
    };
  },
  computed: {
    currentTime() {
      return useLocale().toLocaleString(this.now, { hour: '2-digit', minute: '2-digit' });
    },
    currentDate() {
      return useLocale().toLocaleString(this.now, { weekday: 'long', day: '2-digit', month: 'long' });
    },
  },
  mounted() {
    this.intervalRef = window.setInterval(() => {
      this.now = new Date();
    }, 1000);
  },
  beforeUnmount() {
    if (this.intervalRef) {
      window.clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  },
};
</script>

<style scoped>
  .datetime-card {
    padding: 20px 18px;
    background: var(--glass-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: var(--shadow-sm);
  }
  .sidebar-time {
    font-size: 46px;
    font-weight: 200;
    letter-spacing: -0.03em;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .sidebar-date {
    margin-top: 6px;
    font-size: 14px;
    color: var(--text-secondary);
    text-transform: capitalize;
    white-space: nowrap;
  }
</style>