<template>
    <div class="bookmark-item">
      <a v-if="Array.isArray(childs) && childs.length > 0" class="folder" :href="`/folder/${id}`">
        <div class="icon"></div>
        <p class="label">{{ name }}</p>
        <slot />
      </a>
      <a v-if="!Array.isArray(childs) || childs.length == 0" class="file">
        <div class="icon" :style="icon != null ? `background: ${icon}`:''"></div>
        <p class="label">{{ name }}</p>
        <slot />
      </a>
    </div>
</template>

<style scoped>
.bookmark-item {
  width: 80px;
}

.bookmark-item .icon {
    width: 100%;
    height: 70px;
    background-size: cover !important;
    background-repeat: no-repeat !important;
}

.bookmark-item .label {
    text-align: center;
    text-overflow: ellipsis;
    overflow: hidden;
    word-wrap: break-word;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 90%;
}

.bookmark-item a {
  background: transparent;
  text-decoration: none !important;
  font-weight: 500;
  text-shadow:
      rgba(0, 0, 0, 0.1) 1px 1px 2px,
      rgba(0, 0, 0, 0.1) -1px -1px 2px,
      rgba(0, 0, 0, 0.1) -1px 1px 2px,
      rgba(0, 0, 0, 0.1) 1px -1px 2px;
}

.bookmark-item a:hover {
  text-shadow: none;
}

.folder > .icon {
  background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABCUlEQVR4nO2VMWrDQBBFp8gRQhoFV5a0pM0Zci/fRAK7CcJd0gXcRfKALxFIZ4OdA+gbxZ1A3nU1A/4Pfv/f7OyuCCGEEDICS3lGJQ1q+UMtSEolC3FTvpZDcnFvErhM/vbyXiRwy9p4lMBQYPUAfGVAVwAabNMVPTazX3w+vaUJDOXb3L64jtLmPT4eX+MCw+Sty+pENrOfuICHtdGpUyj6uIB1Sb0eCoAnELhCV7FeEfASq/2UwWdU7ScNfmTqMxLDuiAooPZTBldI7ScNXmL1GbmHZ/RkXRJT2YZjXGBbrh0LNAkCoYCWe/OyOk55wO5lHhX4l/jOM2h4d7JOp2HyyeUJIYTcFWcLXG7i+rfwxwAAAABJRU5ErkJggg==);
}

.file > .icon {
  background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA0UlEQVR4nO3ZPwrCYAyG8e88/h1Er6Di0PQ6rau3UPAwhe7aTg7VKvEAHiBSdJeSEKu8D7x7fnNCQAj9f/FdVsRyIxbRbrqtMndAxHK1OL5Zb33wR5DR8c366fGF2J3znwW4I8gQMEgLfwQZAoZJ4Y8gY4A7ggwBo6T0R5AhYJyU/ggyBEw2p4+I2f6SdRYwzx/+CDIEtFkA4B0ADIAuABgAXQAwALoAYAB0AcAA6AKAAdAFAAOgCwD+MiAyfDG1WG0GIJalM6KOWRZmAIRQ6GxPRRth4Krtq+UAAAAASUVORK5CYII=);
}

</style>

<script>
export default {
    name: 'bookmark-item',
    props: {
        id: { type: String },
        name: { type: String, required: true },
        icon: { type: String },
        url: { type: String },
        childs: { type: Array }
    },
    data() { return {} },
    methods: {},
}
</script>