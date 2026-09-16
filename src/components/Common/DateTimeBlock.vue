<template>
  <div class="datetime-card">
    <div class="sidebar-time">{{ currentTime }}</div>
    <div class="sidebar-date">{{ currentDate }}</div>
  </div>
</template>

<script>
export default {
  name: 'DateTimeBlock',
  data() {
    return {
      currentTime: '',
      currentDate: '',
      intervalRef: null,
    };
  },
  mounted() {
    const update = () => {
      const now = new Date();
      this.currentTime = now.toLocaleString('ru', { hour: '2-digit', minute: '2-digit' });
      this.currentDate = now.toLocaleString('ru', { weekday: 'long', day: '2-digit', month: 'long' });
    };
    update();
    this.intervalRef = window.setInterval(update, 1000);
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