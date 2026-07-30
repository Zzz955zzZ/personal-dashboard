<script setup lang="ts">
import { computed, ref } from 'vue';

import SearchInput from '@/shared/components/SearchInput.vue';
import { CAT_DEFS } from '../constants';
import { fmt1 } from '../engine';
import { sortByRecency } from '../composables/use-ingredient-picker';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';
import { useUndo } from '@/shared/composables/use-undo';
import type { Ingredient, IngredientCategory } from '../types';

const store = useDietStore();
const { openIngDetail } = useDietUi();
const { pushUndo } = useUndo();

const emit = defineEmits<{ edit: [ing: Ingredient | null] }>();

const ingCat = ref<IngredientCategory>('protein');
const ingSearch = ref('');

const catKeys = Object.keys(CAT_DEFS) as IngredientCategory[];

const searchedIngList = computed(() => {
  let list = store.ingByCat(ingCat.value);
  const q = ingSearch.value.trim().toLowerCase();
  if (q) list = list.filter((i) => i.name.toLowerCase().includes(q));
  return sortByRecency(list, store.ingLastSelected);
});

function deleteIng(it: Ingredient): void {
  const idx = store.ingredients.findIndex((x) => x.id === it.id);
  store.deleteIngredient(it.id);
  pushUndo(`已删除 ${it.name}`, () => {
    store.ingredients.splice(idx < 0 ? store.ingredients.length : idx, 0, it);
  });
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <button
        v-for="key in catKeys"
        :key="key"
        class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
        :class="ingCat === key ? 'bg-coral-100 border-coral-300' : 'border-paper-300/60 text-paper-500 hover:border-coral-300'"
        @click="ingCat = key"
      >
        {{ CAT_DEFS[key].emoji }} {{ CAT_DEFS[key].label }}
        <span class="ml-1 opacity-50">({{ store.ingByCat(key).length }})</span>
      </button>
      <button
        class="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-coral-400 text-white hover:opacity-90 transition-opacity"
        @click="emit('edit', null)"
      >
        + 新增食材
      </button>
    </div>

    <div class="mb-4">
      <SearchInput v-model="ingSearch" placeholder="搜索食材名称…" size="sm" />
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <div
        v-for="it in searchedIngList"
        :key="it.id"
        class="group relative p-4 rounded-xl border border-paper-300/60 bg-white/70 hover:border-coral-300 hover:shadow-sm transition-all cursor-pointer"
        @click="openIngDetail(it)"
      >
        <div class="avatar-img mx-auto mb-2" :style="it.image ? 'background:none' : ''">
          <img v-if="it.image" :src="it.image" alt="" />
          <span v-else>{{ it.emoji || CAT_DEFS[it.category].emoji }}</span>
        </div>
        <div class="text-sm font-medium text-center truncate">{{ it.name }}</div>
        <div class="mt-1 text-[10px] text-paper-400 text-center truncate">
          碳{{ fmt1(it.nutrition?.carbs) }}g · 蛋白{{ fmt1(it.nutrition?.protein) }}g · 脂肪{{ fmt1(it.nutrition?.fat) }}g /100g
        </div>
        <div class="absolute top-2 right-2 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button class="w-6 h-6 rounded-md bg-paper-200 text-xs hover:bg-coral-100" @click.stop="emit('edit', it)">✎</button>
          <button class="w-6 h-6 rounded-md bg-red-50 text-red-500 text-xs hover:bg-red-100" @click.stop="deleteIng(it)">×</button>
        </div>
      </div>
      <div v-if="!searchedIngList.length" class="col-span-full text-center text-paper-400 py-12 text-sm font-light">
        未找到匹配的食材。
      </div>
    </div>
  </div>
</template>
