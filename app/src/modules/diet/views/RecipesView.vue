<script setup lang="ts">
import { computed, ref } from 'vue';

import IngredientChipPicker from '../components/IngredientChipPicker.vue';
import { RECIPE_CATS, todayStr } from '../constants';
import { toGrams } from '../engine';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';
import { useUndo } from '@/shared/composables/use-undo';
import type { LogEntry, Recipe, RecipeCategory } from '../types';

const store = useDietStore();
const { selectedIngIds, toggleIngSelect } = useDietUi();
const { pushUndo } = useUndo();

const emit = defineEmits<{ edit: [r: Recipe | null] }>();

const recipeFilter = ref<'all' | RecipeCategory>('all');
/** 与 v1.0 一致：默认只显示「材料齐全」的菜谱 */
const inventoryFilter = ref(true);
const recSelSearch = ref('');

const recipeCatKeys = Object.keys(RECIPE_CATS) as RecipeCategory[];

const filteredRecipes = computed(() => {
  let list = store.recipes;
  if (selectedIngIds.value.length) {
    list = list.filter((r) => r.ingredientIds.some((iid) => selectedIngIds.value.includes(iid)));
  }
  if (recipeFilter.value !== 'all') {
    list = list.filter((r) => r.category === recipeFilter.value);
  }
  if (inventoryFilter.value) {
    list = list.filter((r) => store.recipeAllAvailable(r));
  }
  return list;
});

function deleteRecipe(r: Recipe): void {
  const idx = store.recipes.findIndex((x) => x.id === r.id);
  store.deleteRecipe(r.id);
  pushUndo(`已删除菜谱「${r.name}」`, () => {
    store.recipes.splice(idx < 0 ? store.recipes.length : idx, 0, r);
  });
}

/** 把当前选中的食材按默认份量加入今日记录（v1.0 的「菜谱 → 记录」桥接） */
function addSelectedToDailyLog(): void {
  if (!selectedIngIds.value.length) return;
  const date = todayStr();
  const ids = [...selectedIngIds.value];
  const added: Array<{ entry: LogEntry }> = [];
  for (const iid of ids) {
    const ing = store.findIng(iid);
    const grams = toGrams(ing, ing?.unit === '个' ? 1 : 100);
    added.push({ entry: store.addLogEntry(date, { ingredientId: iid, amount: grams, mealType: 'breakfast' }) });
  }
  pushUndo(`从菜谱库添加 ${added.length} 种食材至今日记录`, () => {
    const list = store.getDayLog(date);
    for (let i = added.length - 1; i >= 0; i--) {
      const idx = list.lastIndexOf(added[i]!.entry);
      if (idx > -1) {
        list.splice(idx, 1);
        store.restorePantry(added[i]!.entry.ingredientId, added[i]!.entry.amount);
      }
    }
  });
}
</script>

<template>
  <div>
    <!-- 食材筛选面板 -->
    <div class="mb-4 p-4 rounded-xl border border-paper-300/60 bg-white/70">
      <div class="flex items-center justify-between gap-2 mb-3">
        <span class="text-xs font-medium text-paper-600">点击食材筛选包含该食材的菜谱</span>
        <div class="flex items-center gap-2 shrink-0">
          <span v-if="selectedIngIds.length" class="text-xs text-coral-500 font-medium">
            已选 {{ selectedIngIds.length }} 种 · 自动筛选中
          </span>
          <button v-if="selectedIngIds.length" class="text-xs text-paper-400 hover:text-coral-500 transition-colors" @click="selectedIngIds = []">
            清除选择
          </button>
        </div>
      </div>

      <div v-if="selectedIngIds.length" class="flex flex-wrap gap-1.5 mb-3">
        <span
          v-for="sid in selectedIngIds"
          :key="sid"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-coral-100 border border-coral-300 text-coral-700"
        >
          {{ store.findIng(sid)?.emoji || '?' }} {{ store.findIng(sid)?.name || sid }}
          <button class="ml-0.5 hover:text-red-500 font-bold" @click="toggleIngSelect(sid)">&times;</button>
        </span>
      </div>

      <IngredientChipPicker
        v-model:search="recSelSearch"
        :source="store.ingredients"
        :last-selected="store.ingLastSelected"
        :selected-ids="selectedIngIds"
        placeholder="搜索食材…"
        always-open
        @pick="toggleIngSelect"
      />

      <div v-if="selectedIngIds.length" class="mt-3 pt-3 border-t border-paper-200/60 flex justify-end">
        <button
          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-coral-400 text-white hover:opacity-90 transition-opacity"
          @click="addSelectedToDailyLog()"
        >
          ➕ 添加选中至今日记录
        </button>
      </div>
    </div>

    <!-- 分类 / 库存筛选 -->
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <button
        class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
        :class="recipeFilter === 'all' ? 'bg-coral-100 border-coral-300' : 'border-paper-300/60 text-paper-500'"
        @click="recipeFilter = 'all'"
      >
        全部
      </button>
      <button
        v-for="key in recipeCatKeys"
        :key="key"
        class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
        :class="recipeFilter === key ? 'bg-coral-100 border-coral-300' : 'border-paper-300/60 text-paper-500'"
        @click="recipeFilter = key"
      >
        {{ RECIPE_CATS[key].emoji }} {{ RECIPE_CATS[key].label }}
      </button>
      <span class="w-px h-6 bg-paper-300 mx-1"></span>
      <button
        class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
        :class="inventoryFilter ? 'bg-green-50 border-green-300 text-green-700' : 'border-paper-300/60 text-paper-500 hover:border-green-200'"
        @click="inventoryFilter = !inventoryFilter"
      >
        ✅ 材料齐全
      </button>
      <button
        class="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-coral-400 text-white hover:opacity-90"
        @click="emit('edit', null)"
      >
        + 新增菜谱
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div v-for="r in filteredRecipes" :key="r.id" class="p-5 rounded-xl border border-paper-300/60 bg-white/70 group">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="text-base font-medium">{{ r.name }}</h4>
            <span class="text-[10px] uppercase tracking-wide border border-paper-300 rounded px-1.5 py-0.5 text-paper-400 mt-1 inline-block">
              {{ RECIPE_CATS[r.category]?.emoji }} {{ RECIPE_CATS[r.category]?.label }}
            </span>
          </div>
          <div class="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button class="w-6 h-6 rounded-md bg-paper-200 text-xs hover:bg-coral-100" @click="emit('edit', r)">✎</button>
            <button class="w-6 h-6 rounded-md bg-red-50 text-red-500 text-xs hover:bg-red-100" @click="deleteRecipe(r)">×</button>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="iid in r.ingredientIds"
            :key="iid"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
            :class="store.hasInPantry(iid) ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-paper-100 text-paper-500 border border-paper-200'"
          >
            {{ store.findIng(iid)?.emoji || '?' }} {{ store.findIng(iid)?.name || iid }}
            <span v-if="selectedIngIds.includes(iid)" class="text-coral-500 text-[9px]">★</span>
          </span>
        </div>
        <p class="mt-3 text-sm text-paper-500 font-light leading-relaxed">{{ r.method }}</p>
      </div>
      <div v-if="!filteredRecipes.length" class="col-span-full text-center text-paper-400 py-12 text-sm font-light">
        暂无符合条件的菜谱。
      </div>
    </div>
  </div>
</template>
