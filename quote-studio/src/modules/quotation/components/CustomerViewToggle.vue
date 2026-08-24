<script setup lang="ts">
/** 管理态 ⇄ 客户视图 只读切换。 */
import { icon } from '@/shared/icons';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

function toggle(): void {
  emit('update:modelValue', !props.modelValue);
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded-full border border-paper-300/70 bg-white px-3 py-1.5 text-sm transition-colors"
    :class="modelValue ? 'text-coral-600' : 'text-paper-600'"
    @click="toggle"
  >
    <span v-html="icon(modelValue ? 'eye' : 'edit')"></span>
    <span class="font-medium">{{ modelValue ? '客户视图' : '管理态' }}</span>
    <span
      class="relative w-8 h-4 rounded-full transition-colors"
      :class="modelValue ? 'bg-coral-400' : 'bg-paper-300'"
    >
      <span
        class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform"
        :class="modelValue ? 'translate-x-4' : ''"
      ></span>
    </span>
  </button>
</template>
