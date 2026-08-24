<script setup lang="ts">
/**
 * 简约色卡组件
 * - 仅通过纯色块展示颜色，不含任何可见文字标签或说明。
 * - 支持预设颜色集合、网格/线性排列、选中态环。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md';

const props = withDefaults(
  defineProps<{
    colors: string[];
    modelValue?: string;
    columns?: number;
    size?: Size;
  }>(),
  {
    columns: 5,
    size: 'sm',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const sizeClasses: Record<Size, string> = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
};

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))`,
}));

function select(color: string): void {
  emit('update:modelValue', color);
}
</script>

<template>
  <div
    class="grid gap-1.5"
    :style="gridStyle"
    role="radiogroup"
  >
    <button
      v-for="color in colors"
      :key="color"
      type="button"
      role="radio"
      :aria-checked="modelValue === color"
      class="rounded-md transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 hover:scale-105"
      :class="cn(
        sizeClasses[size],
        modelValue === color ? 'ring-2 ring-ink/40' : 'ring-1 ring-black/5',
      )"
      :style="{ backgroundColor: color }"
      @click="select(color)"
    />
  </div>
</template>
