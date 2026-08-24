<script setup lang="ts">
import { cn } from '@/lib/utils';
const props = defineProps<{ class?: string }>();
const model = defineModel<string>();
</script>

<template>
  <textarea
    v-model="model"
    :class="
      cn(
        'flex min-h-[60px] w-full rounded-md border border-paper-300/80 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-paper-300 focus-visible:outline-none focus-visible:border-[#8c7b6b] disabled:cursor-not-allowed disabled:opacity-50 resize-y',
        props.class,
      )
    "
  />
</template>
