<script setup lang="ts">
defineProps<{ title?: string }>();
</script>
<template>
  <div class="customer-tab-panel"><slot></slot></div>
</template>
<style scoped>
.customer-tab-panel {
  min-height: 120px;
}
</style>
