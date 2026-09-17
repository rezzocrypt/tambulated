<template>
    <main>
      {{ t('notFound') }}
    </main>
  </template>

  <script setup>
  import { useLocale } from '@/composables/useLocale.js';
  const { t } = useLocale();
  </script>