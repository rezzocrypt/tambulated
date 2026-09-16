<template>
      <div class="sidebar-time">
        {{ currentTime }}
      </div>
      <div class="sidebar-date">
        {{ currentDate }}
      </div>
</template>
<script>
export default{
  data: function(){
    return {
      currentTime: '',
      currentDate: '',
      intervalRef: null
    };
  },
  mounted () {
    var update = () => {
      var currentDate = new Date();
      this.currentTime = currentDate.toLocaleString('ru', { hour: '2-digit', minute: '2-digit' });
      this.currentDate = currentDate.toLocaleString('ru', { weekday: 'long', day: '2-digit', month: 'long'});
    };
    update();
    this.intervalRef = window.setInterval(update, 1000);
  },
  beforeUnmount () {
    if (this.intervalRef) {
      window.clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }
};
</script>
<style scoped>
  .sidebar-time{
    font-size: 300%;
  }
</style>