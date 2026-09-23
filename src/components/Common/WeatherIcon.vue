<template>
  <svg
    class="weather-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="label ? 'img' : null"
    :aria-label="label || undefined"
  >
    <!-- clear -->
    <template v-if="group === 0">
      <template v-if="night">
        <path class="wi-moon" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        <path class="wi-star" d="M17 4.5h1M17.5 4v1M21 6.5h2M22 6v1" />
      </template>
      <template v-else>
        <circle class="wi-sun" cx="12" cy="12" r="4.2" />
        <path class="wi-ray" d="M12 2.5v1.8" />
        <path class="wi-ray" d="M12 19.7v1.8" />
        <path class="wi-ray" d="m4.9 4.9 1.3 1.3" />
        <path class="wi-ray" d="m17.8 17.8 1.3 1.3" />
        <path class="wi-ray" d="M2.5 12h1.8" />
        <path class="wi-ray" d="M19.7 12h1.8" />
        <path class="wi-ray" d="m4.9 19.1 1.3-1.3" />
        <path class="wi-ray" d="m17.8 6.2 1.3-1.3" />
      </template>
    </template>

    <!-- partly cloudy -->
    <template v-else-if="group === 1">
      <template v-if="night">
        <path class="wi-moon" d="M10.188 8.5A6 6 0 0 1 16 4a1 1 0 0 0 6 6 6 6 0 0 1-3 5.197" />
      </template>
      <template v-else>
        <path class="wi-ray" d="M12 2v1.8" />
        <path class="wi-ray" d="m4.93 4.93 1.3 1.3" />
        <path class="wi-ray" d="M20 12h1.8" />
        <path class="wi-ray" d="m19.07 4.93-1.3 1.3" />
        <path class="wi-sun" d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
      </template>
      <path class="wi-cloud" d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" />
    </template>

    <!-- overcast -->
    <template v-else-if="group === 2">
      <path class="wi-cloud" d="M17.5 21H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      <path class="wi-cloud-dim" d="M22 10a3 3 0 0 0-3-3h-2.207a5.502 5.502 0 0 0-10.702.5" />
    </template>

    <!-- fog -->
    <template v-else-if="group === 3">
      <path class="wi-cloud" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path class="wi-fog" d="M16 17H7" />
      <path class="wi-fog" d="M17 21H9" />
    </template>

    <!-- drizzle -->
    <template v-else-if="group === 4">
      <path class="wi-cloud" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path class="wi-drop" d="M8 19v1" />
      <path class="wi-drop" d="M8 14v1" />
      <path class="wi-drop" d="M16 19v1" />
      <path class="wi-drop" d="M16 14v1" />
      <path class="wi-drop" d="M12 21v1" />
      <path class="wi-drop" d="M12 16v1" />
    </template>

    <!-- rain -->
    <template v-else-if="group === 5">
      <path class="wi-cloud" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path class="wi-drop" d="M16 14v6" />
      <path class="wi-drop" d="M8 14v6" />
      <path class="wi-drop" d="M12 16v6" />
    </template>

    <!-- snow -->
    <template v-else-if="group === 6">
      <path class="wi-cloud" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path class="wi-snowflake" d="M12 15v4" />
      <path class="wi-snowflake" d="m10 16.5 4-1" />
      <path class="wi-snowflake" d="m10 17.5 4 1" />
    </template>

    <!-- rain showers -->
    <template v-else-if="group === 7">
      <path class="wi-cloud" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path class="wi-drop" d="M9 15v5" />
      <path class="wi-drop" d="M15 15v5" />
      <path class="wi-drop" d="M12 17v5" />
      <path class="wi-drop" d="M7 17v3" />
      <path class="wi-drop" d="M17 17v3" />
    </template>

    <!-- snow showers -->
    <template v-else-if="group === 8">
      <path class="wi-cloud" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path class="wi-snow-dot" d="M8 16h.01" />
      <path class="wi-snow-dot" d="M8 20h.01" />
      <path class="wi-snow-dot" d="M12 18h.01" />
      <path class="wi-snow-dot" d="M12 22h.01" />
      <path class="wi-snow-dot" d="M16 16h.01" />
      <path class="wi-snow-dot" d="M16 20h.01" />
    </template>

    <!-- thunderstorm -->
    <template v-else-if="group === 9">
      <path class="wi-cloud" d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973" />
      <path class="wi-bolt" d="m13 12-3 5h4l-3 5" />
    </template>
  </svg>
</template>

<script>
export default {
  name: 'WeatherIcon',
  props: {
    group: {
      type: Number,
      default: -1,
    },
    night: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: '',
    },
  },
};
</script>

<style scoped>
  .weather-icon {
    display: block;
    width: 100%;
    height: 100%;
    color: var(--text-primary);
  }
  .wi-sun,
  .wi-ray {
    stroke: #fbbf24;
  }
  .wi-moon {
    stroke: #a5b4fc;
  }
  .wi-star {
    stroke: #fbbf24;
  }
  .wi-cloud-dim,
  .wi-fog {
    stroke: var(--text-secondary);
  }
  .wi-drop,
  .wi-bolt,
  .wi-snow-dot,
  .wi-snowflake {
    stroke: var(--accent-2);
  }
</style>