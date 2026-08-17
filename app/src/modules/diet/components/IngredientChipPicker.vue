<script setup lang="ts">
/**
 * 「搜索 + 分类筛选 + 芯片点选」食材选择器。
 * v1.0 里这段结构在每日记录 / 采购 / 库存 / 菜谱 四处各写了一遍，此处统一。
 *
 * 数据变多（≈86 条）后，仅靠搜索仍显杂乱，故增加分类标签（全部 + 六类），
 * 默认按分类收拢，配合搜索与最近使用排序，避免长列表庞杂。
 */
import { computed, ref } from 'vue';

import SearchInput from '@/shared/components/SearchInput.vue';
import { fmt1 } from '../engine';
import { filterIngredients, sortByRecency } from '../composables/use-ingredient-picker';
import { CAT_DEFS } from '../constants';
import type { Ingredient, IngredientCategory } from '../types';

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

/** 分类筛选：'all' 表示不限 */
const catFilter = ref<IngredientCategory | 'all'>('all');
const catKeys = Object.keys(CAT_DEFS) as IngredientCategory[];

const list = computed(() => {
  let l = props.source;
  if (catFilter.value !== 'all') l = l.filter((i) => i.category === catFilter.value);
  return sortByRecency(filterIngredients(l, search.value), props.lastSelected);
});

const visible = computed(
  () => props.alwaysOpen || open.value || search.value.trim().length > 0,
);

function isActive(id: number): boolean {
  return props.selectedId === id || props.selectedIds.includes(id);
}
</script>

<template>
  <div>
    <div class="mb-3">
      <SearchInput v-model="search" :placeholder="placeholder" @focus="open = true" />
    </div>

    <!-- 分类筛选：随数据量增大，按类收拢避免庞杂 -->
    <div class="flex flex-wrap gap-1.5 mb-3">
      <button
        type="button"
        class="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
        :class="
          catFilter === 'all'
            ? 'bg-coral-400 text-white border-coral-400'
            : 'border-paper-300/60 text-paper-500 hover:border-coral-300'
        "
        @click="catFilter = 'all'"
      >
        全部
      </button>
      <button
        v-for="key in catKeys"
        :key="key"
        type="button"
        class="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
        :class="
          catFilter === key
            ? 'bg-coral-400 text-white border-coral-400'
            : 'border-paper-300/60 text-paper-500 hover:border-coral-300'
        "
        @click="catFilter = key"
      >
        {{ CAT_DEFS[key].emoji }} {{ CAT_DEFS[key].label }}
      </button>
    </div>

    <div v-if="visible" class="flex flex-wrap gap-2 overflow-y-auto mb-3" :class="maxHeight">
      <button
        v-for="it in list"
        :key="it.id"
        type="button"
        :title="it.brand || undefined"
        class="px-2.5 py-1.5 rounded-full text-xs border transition-all"
        :class="
          isActive(it.id)
            ? 'bg-coral-400 text-white border-coral-400'
            : 'border-paper-300/60 text-paper-600 hover:border-coral-300 hover:bg-coral-50'
        "
        @click="emit('pick', it.id)"
      >
        {{ it.emoji }} {{ it.name }}
        <span v-if="it.brand" class="opacity-55 ml-0.5 text-[10px]">·{{ it.brand }}</span>
        <span v-if="showCalories" class="text-[9px] opacity-60 ml-0.5">
          {{ fmt1(it.nutrition?.calories) }}kcal
        </span>
      </button>
      <div v-if="!list.length" class="text-xs text-paper-400 py-2">{{ emptyText }}</div>
    </div>
  </div>
</template>
