<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  useForwardPropsEmits,
} from 'reka-ui';
import { X } from 'lucide-vue-next';
import { computed } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<DialogContentProps & { class?: string }>();
const emits = defineEmits<DialogContentEmits>();
const delegated = computed(() => {
  const { class: _c, ...rest } = props;
  return rest;
});
const forwarded = useForwardPropsEmits(delegated, emits);
</script>

<template>
  <DialogContent
    v-bind="forwarded"
    :class="
      cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-paper-200 bg-white p-6 shadow-lg rounded-lg',
        props.class,
      )
    "
  >
    <slot />
    <DialogClose
      class="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#8c7b6b]/40"
    >
      <X class="h-4 w-4" />
      <span class="sr-only">关闭</span>
    </DialogClose>
  </DialogContent>
</template>
