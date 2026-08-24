<script setup lang="ts">
defineProps<{ placeholder?: string; size?: 'sm' | 'md' }>();
const model = defineModel<string>({ default: '' });
</script>

<template>
  <div class="relative w-full">
    <svg
      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-paper-400 pointer-events-none"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
    <input
      v-model="model"
      type="text"
      :placeholder="placeholder"
      class="w-full bg-white text-sm text-ink border border-paper-300/60 focus:outline-none focus:border-coral-300 transition-colors"
      :class="size === 'sm' ? 'pl-8 pr-3 py-2 rounded-lg' : 'pl-9 pr-4 py-2.5 rounded-xl'"
      v-bind="$attrs"
    />
  </div>
</template>
