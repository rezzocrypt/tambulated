<template>
  <Teleport to="body">
    <div class="page-bg" aria-hidden="true">
      <div class="bg-layer default" :style="defaultStyle"></div>
      <div
        class="bg-layer live"
        :class="{ loaded: liveLoaded }"
        :style="liveStyle"
      ></div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const FALLBACK = 'images/defaultbg.jpg'
const STORAGE_URL = 'background'
const STORAGE_DATE = 'backgroundDate'

const defaultStyle = ref({ backgroundImage: `url("${FALLBACK}")` })
const liveStyle = ref(null)
const liveLoaded = ref(false)

function today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

function preload(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = reject
    img.src = url
  })
}

async function applyBackground(url, persist) {
  try {
    const loadedUrl = await preload(url)
    liveStyle.value = { backgroundImage: `url("${loadedUrl}")` }
    liveLoaded.value = true
    if (persist) {
      localStorage.setItem(STORAGE_URL, url)
      localStorage.setItem(STORAGE_DATE, today())
    }
  } catch {
    // keep the default background
  }
}

onMounted(async () => {
  const bgUrl = localStorage.getItem(STORAGE_URL)
  const bgDate = localStorage.getItem(STORAGE_DATE)

  if (bgUrl !== null && bgDate === today()) {
    await applyBackground(bgUrl, false)
    return
  }

  try {
    const response = await fetch('https://bing.biturl.top/')
    const data = await response.json()
    if (!data || !data.url) return
    await applyBackground(data.url, true)
  } catch {
    // keep the default background
  }
})
</script>

<style scoped>
.page-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
.bg-layer {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.bg-layer.live {
  opacity: 0;
  transition: opacity 0.8s ease;
}
.bg-layer.live.loaded {
  opacity: 1;
}
</style>