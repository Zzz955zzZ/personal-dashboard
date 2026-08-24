<script setup lang="ts">
import { computed } from 'vue';
import { SelectRoot } from 'reka-ui';

/**
 * reka-ui SelectItem 禁止 value=""，但业务里常把空字符串当作“未选择/未归类”。
 * 这里用内部哨兵值做透明转换：外部模型保持 ''，组件内部用 '__qs_empty__'。
 */
const EMPTY_SENTINEL = '__qs_empty__';

const props = defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const proxy = computed({
  get: () => (props.modelValue === '' ? EMPTY_SENTINEL : props.modelValue),
  set: (v: string) => emit('update:modelValue', v === EMPTY_SENTINEL ? '' : v),
});
</script>

<template>
  <SelectRoot v-model="proxy"><slot /></SelectRoot>
</template>
