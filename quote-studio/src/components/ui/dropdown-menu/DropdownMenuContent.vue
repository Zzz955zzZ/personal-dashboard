<script setup lang="ts">
import {
  DropdownMenuContent,
  type DropdownMenuContentProps,
  useForwardProps,
} from 'reka-ui';
import { computed } from 'vue';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<DropdownMenuContentProps & { class?: string }>(),
  { sideOffset: 4 },
);
const delegated = computed(() => {
  const { class: _c, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
</script>

<template>
  <DropdownMenuContent
    v-bind="forwarded"
    :class="
      cn(
        'z-50 min-w-[10rem] overflow-hidden rounded-md border border-paper-200 bg-white p-1 text-ink shadow-md',
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuContent>
</template>
