<script setup>
import FileItem from './components/FileItem.vue'
</script>

<template>
  <header>
    <div class="wrapper">
      <div style="flex-wrap: wrap; display: flex;">
        <FileItem name="Моя папка asfdsdasdsad" :childs="[]"/>
        <FileItem name="Папка 2" :childs="[]"/>
        <FileItem name="а это файл" icon="url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACIklEQVR4nO3Xz0sUYRzH8flX/EWidkihgymeBDt4dbRskTLBxENkIBGUEGR2i4oQC0IXL+IhCnQR0VsImh6ENsNCyeUxYoksf637jseHddLFIvN5dh96PjDM7GHh+5r5PvN9xvNcXPQGPxctR11Ot7WAZOsZcwg0ALbfzpK8UmEGoQUgYuYQ6AKYQqATIAwgtAOEZoQRgNCIMAYQmhBGAUIDwjhA7EdkJeBvDs8BfPcEsK+F7oRgZRF+rEG420LAlxh7Se5Aa7lFgEulQfHzr9W557JFgPMnYCehCl9+ZyHAz4UP80H7yHTWWgYI3wvaKJGAULFlgOYy2NpQgPdzRy6ejE7imXEFiE5DfZ5lgIYCiK8GbdR308JBJrO9tXvaHWjtVRYBJoZU4cMPYSqirmMfoeW0BYDmMtj4rmZBWyVcPAXLCwqx8EY9nWe3YeQ5jA1CJAyPrsG5giwBDD1QxcpFLH931EBkgD9mcjgLAE0n4VtcFRSdAbG0v8jUmkhlZRGWoup6cz3DALmFeNmXfmdl+7zoha4GaCxUQ04u6oOZncwQoD4fem/A509BMbJA2d+HbSHkhu9xB7x6CqP96v+hkgwArlarhflr5OSVrXSUt5dvEnCrDta+pvf49bPHVjzaAHLSplomLoJd5+D9Yy0ebYALRelvFDm8/mHPg/EWetKp7r78fOy/e+ggyl6Ab+bwHMB3TwDXQv91C7m4eL/NT9rWaYTkzttuAAAAAElFTkSuQmCC)"/>
      </div>
    </div>
  </header>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>