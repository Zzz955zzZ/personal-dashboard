<script setup lang="ts">
import { SelectTrigger, SelectIcon } from 'reka-ui';
import { ChevronDown } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
}>();
</script>

<template>
  <SelectTrigger
    :class="cn(
      'flex h-9 w-full items-center justify-between rounded-md border border-paper-300 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#3d342b]/30 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-paper-400',
      props.class,
    )"
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="h-4 w-4 opacity-50" />
    </SelectIcon>
  </SelectTrigger>
</template>
