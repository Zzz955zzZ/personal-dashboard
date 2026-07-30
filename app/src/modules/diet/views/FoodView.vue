<script setup lang="ts">
/**
 * 饮食板块外壳：五个页签 + 全部弹窗 + 食材详情抽屉。
 *
 * 这是饮食模块唯一的对外入口页，路由只认它；模块内部结构可以随意重排。
 */
import { onMounted, ref } from 'vue';

import { icon } from '@/shared/icons';
import { FOOD_TABS } from '../constants';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';

import DailyLogView from './DailyLogView.vue';
import IngredientsView from './IngredientsView.vue';
import RecipesView from './RecipesView.vue';
import PantryView from './PantryView.vue';
import ShoppingView from './ShoppingView.vue';

import IngredientDetailDrawer from '../components/IngredientDetailDrawer.vue';
import IngredientFormModal from '../components/IngredientFormModal.vue';
import RecipeFormModal from '../components/RecipeFormModal.vue';
import PantryFormModal from '../components/PantryFormModal.vue';
import CopyDayModal from '../components/CopyDayModal.vue';
import CopyMealModal from '../components/CopyMealModal.vue';
import MealTemplateModal from '../components/MealTemplateModal.vue';

import type { Ingredient, MealTemplate, MealType, Recipe } from '../types';

const store = useDietStore();
const { foodTab, modals } = useDietUi();

/** 正在编辑的对象由外壳持有 —— 弹窗只负责表单，不关心「谁在编辑」 */
const editingIng = ref<Ingredient | null>(null);
const editingRecipe = ref<Recipe | null>(null);
const editingTemplate = ref<MealTemplate | null>(null);
const copyMealSource = ref<MealType>('breakfast');

onMounted(() => {
  store.hydrate();
  store.startAutoPersist();
  store.startStockWatcher();
});

function openIngForm(ing: Ingredient | null): void {
  editingIng.value = ing;
  modals.ingForm = true;
}

function openRecipeForm(r: Recipe | null): void {
  editingRecipe.value = r;
  modals.recipeForm = true;
}

function openTemplateModal(tmpl: MealTemplate | null): void {
  editingTemplate.value = tmpl;
  modals.template = true;
}

function openCopyMeal(m: MealType): void {
  copyMealSource.value = m;
  modals.copyMeal = true;
}
</script>

<template>
  <section class="max-w-5xl mx-auto px-6 sm:px-8 py-10">
    <h2 class="font-display text-3xl sm:text-4xl text-center mb-8">饮食</h2>

    <div v-if="store.corruptedRaw" class="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-sm text-amber-800">
      本地数据解析失败，已改用初始数据展示。原始内容仍保留在内存中，请先导出备份再继续操作。
    </div>

    <!-- 页签 -->
    <div class="flex flex-wrap gap-2 mb-8 justify-center">
      <button
        v-for="t in FOOD_TABS"
        :key="t.key"
        class="px-4 py-2 rounded-full text-sm font-medium border transition-all"
        :class="
          foodTab === t.key
            ? 'bg-coral-400 text-white border-coral-400'
            : 'border-paper-300 text-paper-600 hover:border-coral-300'
        "
        @click="foodTab = t.key"
      >
        <span class="mr-1.5" v-html="icon(t.icon)"></span>{{ t.label }}
      </button>
    </div>

    <transition name="fade" mode="out-in">
      <DailyLogView
        v-if="foodTab === 'dailylog'"
        key="dailylog"
        @edit-template="openTemplateModal"
        @copy-meal="openCopyMeal"
      />
      <IngredientsView v-else-if="foodTab === 'ingredients'" key="ingredients" @edit="openIngForm" />
      <RecipesView v-else-if="foodTab === 'recipes'" key="recipes" @edit="openRecipeForm" />
      <PantryView v-else-if="foodTab === 'pantry'" key="pantry" />
      <ShoppingView v-else key="shopping" />
    </transition>

    <!-- 抽屉与弹窗 -->
    <IngredientDetailDrawer />

    <IngredientFormModal :open="modals.ingForm" :editing="editingIng" @close="modals.ingForm = false" />
    <RecipeFormModal :open="modals.recipeForm" :editing="editingRecipe" @close="modals.recipeForm = false" />
    <PantryFormModal :open="modals.pantryForm" @close="modals.pantryForm = false" />
    <CopyDayModal :open="modals.copyDay" @close="modals.copyDay = false" />
    <CopyMealModal
      :open="modals.copyMeal"
      :source-meal="copyMealSource"
      @close="modals.copyMeal = false"
    />
    <MealTemplateModal
      :open="modals.template"
      :editing="editingTemplate"
      @close="modals.template = false"
      @edit="openTemplateModal"
    />
  </section>
</template>
