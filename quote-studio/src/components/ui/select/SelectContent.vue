<script setup lang="ts">
import { SelectPortal, SelectContent, SelectViewport } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
}>();
</script>

<template>
  <SelectPortal>
    <SelectContent
      :class="cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-paper-200 bg-white text-ink shadow-md',
        props.class,
      )"
      position="popper"
      :side-offset="4"
    >
      <SelectViewport class="p-1">
        <slot />
      </SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>
