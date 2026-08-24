<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
/**
 * 动态分类选择器。
 * 规则：初始只有一个空选择框；选定后自动追加下一个空框；
 * 空框不参与预览；已选项在后续框中不可重复选择。
 */
import { computed, ref, watch } from 'vue';

import { icon } from '@/shared/icons';

export interface CategoryOption {
  value: string;
  label: string;
}

const props = defineProps<{
  options: CategoryOption[];
  modelValue: string[];
  label?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [string[]] }>();

const slots = ref<string[]>(['']);

watch(
  slots,
  (arr) => {
    // 保证末尾始终保留一个空框，且不会连续出现两个以上空框
    while (arr.length > 1 && arr[arr.length - 1] === '' && arr[arr.length - 2] === '') {
      arr.pop();
    }
    if (arr[arr.length - 1] !== '') arr.push('');
    emit(
      'update:modelValue',
      arr.filter((v) => v !== ''),
    );
  },
  { deep: true },
);

function optionsFor(slotValue: string): CategoryOption[] {
  const selected = new Set(
    slots.value.filter((v, i) => v !== '' && slots.value[i] !== slotValue),
  );
  return props.options.filter((o) => o.value === slotValue || !selected.has(o.value));
}

function removeAt(idx: number): void {
  slots.value.splice(idx, 1);
  if (slots.value.length === 0) slots.value.push('');
}

const placeholderLabel = computed(() => props.label ?? '分类');
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(val, idx) in slots"
      :key="idx"
      class="flex items-center gap-2"
    >
      <Select v-model="slots[idx]">
        <SelectTrigger class="qs-input text-sm h-9 px-3 py-0 text-left">
          <SelectValue :placeholder="'— 选择' + placeholderLabel + ' —'" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">— 选择{{ placeholderLabel }} —</SelectItem>
          <SelectItem
            v-for="o in optionsFor(val)"
            :key="o.value"
            :value="o.value"
          >
            {{ o.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost"
        v-if="val !== ''"
        type="button"
        class=" shrink-0 px-2"
        :title="'移除' + placeholderLabel"
        @click="removeAt(idx)">
        <span v-html="icon('x')"></span>
      </Button>
    </div>
  </div>
</template>
