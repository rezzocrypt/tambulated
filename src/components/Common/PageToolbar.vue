<template>
  <div class="page-toolbar">
    <div class="page-toolbar-group">
      <div class="page-toolbar-title">
        <slot name="title" />
      </div>
      <div class="page-toolbar-meta">
        <slot name="meta" />
      </div>
    </div>
    <div v-if="$slots.center" class="page-toolbar-center">
      <slot name="center" />
    </div>
    <div class="page-toolbar-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'PageToolbar' });
</script>