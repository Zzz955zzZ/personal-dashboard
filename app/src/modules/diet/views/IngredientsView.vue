<script setup lang="ts">
import { computed, ref } from 'vue';

import SearchInput from '@/shared/components/SearchInput.vue';
import { CAT_DEFS, mealTypeLabel } from '../constants';
import { fmt1, toGrams } from '../engine';
import { sortByRecency } from '../composables/use-ingredient-picker';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';
import type { Ingredient, IngredientCategory } from '../types';

const store = useDietStore();
const { foodTab, openIngDetail, pickerContext, clearPickerContext } = useDietUi();

const emit = defineEmits<{ edit: [ing: Ingredient | null] }>();

const ingCat = ref<IngredientCategory | 'all'>('all');
const ingSearch = ref('');

const catKeys = Object.keys(CAT_DEFS) as IngredientCategory[];

const searchedIngList = computed(() => {
  let list =
    ingCat.value === 'all'
      ? store.ingredients
      : store.ingByCat(ingCat.value);
  const q = ingSearch.value.trim().toLowerCase();
  if (q) list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.brand && i.brand.toLowerCase().includes(q)));
  return sortByRecency(list, store.ingLastSelected);
});

function onCardClick(it: Ingredient): void {
  const ctx = pickerContext.value;
  if (ctx) {
    const grams = toGrams(it, it.unit === '个' ? 1 : 100);
    store.addLogEntry(ctx.date, { ingredientId: it.id, amount: grams, mealType: ctx.mealType });
    clearPickerContext();
    foodTab.value = 'dailylog';
    return;
  }
  openIngDetail(it);
}

function cancelPicker(): void {
  clearPickerContext();
  foodTab.value = 'dailylog';
}
</script>

<template>
  <div>
    <!-- 分类标签：紧凑平铺 -->
    <div class="flex flex-wrap items-center gap-1.5 mb-3">
      <button
        class="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all"
        :class="ingCat === 'all' ? 'bg-coral-400 text-white border-coral-400' : 'border-paper-300/60 text-paper-500 hover:border-coral-300'"
        @click="ingCat = 'all'"
      >
        全部
        <span class="ml-0.5 opacity-70">{{ store.ingredients.length }}</span>
      </button>
      <button
        v-for="key in catKeys"
        :key="key"
        class="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all"
        :class="ingCat === key ? 'bg-coral-400 text-white border-coral-400' : 'border-paper-300/60 text-paper-500 hover:border-coral-300'"
        @click="ingCat = key"
      >
        <span class="mr-0.5">{{ CAT_DEFS[key].emoji }}</span>{{ CAT_DEFS[key].label }}
        <span class="ml-0.5 opacity-70">{{ store.ingByCat(key).length }}</span>
      </button>
      <button
        v-if="!pickerContext"
        class="ml-auto px-3 py-1 rounded-lg text-[11px] font-medium bg-coral-400 text-white hover:opacity-90 transition-opacity"
        @click="emit('edit', null)"
      >
        + 新增
      </button>
    </div>

    <div v-if="pickerContext" class="mb-3 p-3 rounded-xl bg-coral-50 border border-coral-200 flex items-center justify-between">
      <span class="text-sm font-medium text-coral-700">选择食材加入 {{ mealTypeLabel(pickerContext.mealType) }}</span>
      <button class="text-xs text-paper-500 hover:text-coral-600 px-2 py-1" @click="cancelPicker">取消</button>
    </div>

    <div class="mb-3">
      <SearchInput v-model="ingSearch" placeholder="搜索食材或品牌…" size="sm" />
    </div>

    <!-- 食材卡片：紧凑精致 -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      <div
        v-for="it in searchedIngList"
        :key="it.id"
        class="group relative p-2.5 rounded-xl border border-paper-300/60 bg-white/80 hover:border-coral-300 transition-all cursor-pointer flex flex-col"
        :class="pickerContext ? 'active:scale-[0.98]' : ''"
        @click="onCardClick(it)"
      >
        <div class="flex items-start gap-2">
          <div class="avatar-img shrink-0" :style="it.image ? 'background:none' : ''" style="width: 36px; height: 36px; font-size: 20px;">
            <img v-if="it.image" :src="it.image" alt="" />
            <span v-else>{{ it.emoji || CAT_DEFS[it.category].emoji }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate leading-tight">{{ it.name }}</div>
            <div v-if="it.brand" class="text-[10px] text-coral-500 truncate">{{ it.brand }}</div>
          </div>
        </div>
        <div class="mt-1.5 text-[10px] text-paper-400 truncate">
          碳{{ fmt1(it.nutrition?.carbs) }} · 蛋{{ fmt1(it.nutrition?.protein) }} · 脂{{ fmt1(it.nutrition?.fat) }} /100g
        </div>
      </div>
      <div v-if="!searchedIngList.length" class="col-span-full text-center text-paper-400 py-12 text-sm font-light">
        未找到匹配的食材。
      </div>
    </div>
  </div>
</template>
