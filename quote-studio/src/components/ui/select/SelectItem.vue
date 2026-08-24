<script setup lang="ts">
import { computed } from 'vue';
import { SelectItem, SelectItemIndicator, SelectItemText } from 'reka-ui';
import { Check } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const EMPTY_SENTINEL = '__qs_empty__';

const props = defineProps<{
  value: string;
  disabled?: boolean;
  class?: string;
}>();

const internalValue = computed(() => (props.value === '' ? EMPTY_SENTINEL : props.value));
</script>

<template>
  <SelectItem
    :value="internalValue"
    :disabled="props.disabled"
    :class="cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-paper-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      props.class,
    )"
  >
    <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectItemIndicator>
        <Check class="h-4 w-4" />
      </SelectItemIndicator>
    </span>
    <SelectItemText><slot /></SelectItemText>
  </SelectItem>
</template>
