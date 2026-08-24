<script setup lang="ts">
import { DropdownMenuLabel, type DropdownMenuLabelProps } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<DropdownMenuLabelProps & { class?: string; inset?: boolean }>();
</script>

<template>
  <DropdownMenuLabel
    :class="
      cn('px-2 py-1.5 text-[10px] uppercase tracking-wide text-paper-400', inset && 'pl-8', props.class)
    "
    v-bind="props"
  >
    <slot />
  </DropdownMenuLabel>
</template>
