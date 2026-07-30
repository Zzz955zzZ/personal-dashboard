<script setup lang="ts">
defineProps<{ placeholder?: string; size?: 'sm' | 'md' }>();
const model = defineModel<string>({ default: '' });
</script>

<template>
  <div class="ing-search">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
    <input
      v-model="model"
      type="text"
      :placeholder="placeholder"
      class="w-full pl-8 bg-white text-sm border border-paper-300/60 focus:outline-none focus:border-coral-300"
      :class="size === 'sm' ? 'px-3 py-2 rounded-lg' : 'px-3 py-2.5 rounded-xl'"
      v-bind="$attrs"
    />
  </div>
</template>
