<script setup lang="ts">
defineProps<{ description?: string; number: number; title: string; }>();
</script>
<template>
  <section
    class="mb-5 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
  >
    <div
      class="flex items-center gap-3 border-b border-border bg-muted/60 px-6 py-4"
    >
      <span
        class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
        >{{ number }}</span>
      <div>
        <h2 class="m-0 text-base font-semibold text-foreground">{{ title }}</h2>
        <p v-if="description" class="m-0 mt-1 text-xs text-muted-foreground">
          {{ description }}
        </p>
      </div>
      <slot name="actions"></slot>
    </div>
    <slot></slot>
  </section>
</template>
