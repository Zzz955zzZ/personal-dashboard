<script setup lang="ts">
import { Separator, type SeparatorProps, useForwardProps } from 'reka-ui';
import { computed } from 'vue';
import { cn } from '@/lib/utils';

const props = withDefaults(defineProps<SeparatorProps & { class?: string }>(), {
  orientation: 'horizontal',
});
const delegated = computed(() => {
  const { class: _c, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
</script>

<template>
  <Separator
    v-bind="forwarded"
    :class="cn('shrink-0 bg-paper-200', orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full', props.class)"
  />
</template>
