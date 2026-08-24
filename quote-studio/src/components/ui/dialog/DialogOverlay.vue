<script setup lang="ts">
import { DialogOverlay, type DialogOverlayProps, useForwardProps } from 'reka-ui';
import { computed } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<DialogOverlayProps & { class?: string }>();
const delegated = computed(() => {
  const { class: _c, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
</script>

<template>
  <DialogOverlay v-bind="forwarded" :class="cn('fixed inset-0 z-50 bg-black/50', props.class)" />
</template>
