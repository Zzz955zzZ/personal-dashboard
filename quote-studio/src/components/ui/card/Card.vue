<script setup lang="ts">
import { cn } from '@/lib/utils';
const props = defineProps<{ class?: string }>();
</script>

<template>
  <div :class="cn('rounded-2xl border border-paper-200/70 bg-white shadow-[0_1px_3px_rgba(61,52,43,0.05),0_16px_32px_-20px_rgba(61,52,43,0.25)]', props.class)">
    <slot />
  </div>
</template>
