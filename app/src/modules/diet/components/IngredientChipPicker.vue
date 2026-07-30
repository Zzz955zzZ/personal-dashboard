<script setup lang="ts">
/**
 * 「搜索 + 芯片点选」食材选择器。
 * v1.0 里这段结构在每日记录 / 采购 / 库存 / 菜谱 四处各写了一遍，此处统一。
 */
import { computed } from 'vue';

import SearchInput from '@/shared/components/SearchInput.vue';
import { fmt1 } from '../engine';
import { filterIngredients, sortByRecency } from '../composables/use-ingredient-picker';
import type { Ingredient } from '../types';

const props = withDefaults(
  defineProps<{
    source: Ingredient[];
    lastSelected: Record<number, number>;
    /** 单选：当前选中 id；多选：选中 id 数组 */
    selectedId?: number | null;
    selectedIds?: number[];
    placeholder?: string;
    /** 是否始终展开芯片区（菜谱/模板里是常驻的） */
    alwaysOpen?: boolean;
    showCalories?: boolean;
    maxHeight?: string;
    emptyText?: string;
  }>(),
  {
    selectedId: null,
    selectedIds: () => [],
    placeholder: '搜索并选择食材…',
    alwaysOpen: false,
    showCalories: false,
    maxHeight: 'max-h-44',
    emptyText: '无匹配食材',
  },
);

const emit = defineEmits<{ pick: [id: number] }>();

const search = defineModel<string>('search', { default: '' });
const open = defineModel<boolean>('open', { default: false });

const list = computed(() =>
  sortByRecency(filterIngredients(props.source, search.value), props.lastSelected),
);

const visible = computed(() => props.alwaysOpen || open.value || search.value.trim().length > 0);

function isActive(id: number): boolean {
  return props.selectedId === id || props.selectedIds.includes(id);
}
</script>

<template>
  <div>
    <div class="mb-3">
      <SearchInput v-model="search" :placeholder="placeholder" @focus="open = true" />
    </div>
    <div v-if="visible" class="flex flex-wrap gap-2 overflow-y-auto mb-3" :class="maxHeight">
      <button
        v-for="it in list"
        :key="it.id"
        type="button"
        class="px-2.5 py-1.5 rounded-full text-xs border transition-all"
        :class="
          isActive(it.id)
            ? 'bg-coral-400 text-white border-coral-400'
            : 'border-paper-300/60 text-paper-600 hover:border-coral-300 hover:bg-coral-50'
        "
        @click="emit('pick', it.id)"
      >
        {{ it.emoji }} {{ it.name }}
        <span v-if="showCalories" class="text-[9px] opacity-60 ml-0.5">
          {{ fmt1(it.nutrition?.calories) }}kcal
        </span>
      </button>
      <div v-if="!list.length" class="text-xs text-paper-400 py-2">{{ emptyText }}</div>
    </div>
  </div>
</template>
