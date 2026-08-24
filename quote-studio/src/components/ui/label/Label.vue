<script setup lang="ts">
import { Label, type LabelProps } from 'reka-ui';
import { cn } from '@/lib/utils';
const props = defineProps<LabelProps & { class?: string }>();
</script>

<template>
  <Label
    :class="cn('text-[11px] font-medium uppercase tracking-wide2 text-paper-500 leading-none', props.class)"
    v-bind="props"
  >
    <slot />
  </Label>
</template>
