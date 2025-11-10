<template>
  <div class="app-body">
    <div class="sidebar">
      <div class="sidebar-time">
        {{ currentTime }}
      </div>
      <div class="sidebar-date">
        {{ currentDate }}
      </div>
    </div>
    <div class="main">
      <router-view />
    </div>
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
    this.intervalRef = window.setInterval(() => {
      var currentDate = new Date();
      this.currentTime = currentDate.toLocaleString('ru', { hour: '2-digit', minute: '2-digit' });
      this.currentDate = currentDate.toLocaleString('ru', { weekday: 'long', day: '2-digit', month: 'long'});
    });
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
  nav a{
    color: green;
    padding: 5px;
  }
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
  .sidebar-time{
    font-size: 300%;
  }
  .main{
    min-width: 600px;
    width: 100%;
  }
</style>