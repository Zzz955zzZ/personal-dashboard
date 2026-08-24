<script setup lang="ts">
import { Input } from '@/components/ui/input';

defineProps<{ placeholder?: string; size?: 'sm' | 'md' }>();
const model = defineModel<string>({ default: '' });
</script>

<template>
  <div class="relative w-full">
    <svg
      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-paper-400 pointer-events-none z-10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
    <Input
      v-model="model"
      type="text"
      :placeholder="placeholder"
      :class="(size === 'sm' ? 'pl-8 pr-3 py-2 h-8 text-xs' : 'pl-9 pr-4 py-2.5') + ' bg-white border-paper-300/60 focus-visible:border-coral-300'"
      v-bind="$attrs"
    />
  </div>
</template>
