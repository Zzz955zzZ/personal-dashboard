<script setup lang="ts">
/**
 * 饮食板块外壳：五个页签 + 全部弹窗 + 食材详情抽屉。
 *
 * 这是饮食模块唯一的对外入口页，路由只认它；模块内部结构可以随意重排。
 *
 * 性能：所有非首屏视图和弹窗均使用 defineAsyncComponent 懒加载，
 * 首次打开「每日记录」时只加载 DailyLogView（~20KB），其余按需加载。
 */
import { defineAsyncComponent, onMounted, ref } from 'vue';

import { icon } from '@/shared/icons';
import { FOOD_TABS } from '../constants';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';

// 首屏页签 —— 同步导入（用户进来第一眼就看到）
import DailyLogView from './DailyLogView.vue';

// 其余页签 —— 切到时才加载
const IngredientsView = defineAsyncComponent(() => import('./IngredientsView.vue'));
const RecipesView = defineAsyncComponent(() => import('./RecipesView.vue'));
const PantryView = defineAsyncComponent(() => import('./PantryView.vue'));
const ShoppingView = defineAsyncComponent(() => import('./ShoppingView.vue'));

// 抽屉与弹窗 —— 用户交互时才加载
const IngredientDetailDrawer = defineAsyncComponent(() => import('../components/IngredientDetailDrawer.vue'));
const IngredientFormModal = defineAsyncComponent(() => import('../components/IngredientFormModal.vue'));
const RecipeFormModal = defineAsyncComponent(() => import('../components/RecipeFormModal.vue'));
const PantryFormModal = defineAsyncComponent(() => import('../components/PantryFormModal.vue'));
const CopyDayModal = defineAsyncComponent(() => import('../components/CopyDayModal.vue'));
const CopyMealModal = defineAsyncComponent(() => import('../components/CopyMealModal.vue'));
const MealTemplateModal = defineAsyncComponent(() => import('../components/MealTemplateModal.vue'));

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
  <section class="max-w-5xl mx-auto px-3 sm:px-8 py-2 sm:py-10">
    <!-- 标题：仅桌面端显示，手机省空间 -->
    <div class="hidden sm:flex items-center justify-center gap-3 mb-5 sm:mb-8">
      <span class="text-xl sm:text-3xl" v-html="icon('broccoli')"></span>
      <h2 class="font-display text-xl sm:text-4xl">饮食</h2>
    </div>

    <div v-if="store.corruptedRaw" class="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-sm text-amber-800">
      本地数据解析失败，已改用初始数据展示。原始内容仍保留在内存中，请先导出备份再继续操作。
    </div>

    <!-- 页签：手机端紧凑 -->
    <div class="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 mb-3 sm:mb-8">
      <div class="flex gap-1.5 min-w-max justify-start sm:justify-center">
        <button
          v-for="t in FOOD_TABS"
          :key="t.key"
          class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium border transition-all whitespace-nowrap"
          :class="
            foodTab === t.key
              ? 'bg-coral-400 text-white border-coral-400'
              : 'border-paper-300 text-paper-600 hover:border-coral-300'
          "
          @click="foodTab = t.key"
        >
          <span class="mr-1" v-html="icon(t.icon)"></span>{{ t.label }}
        </button>
      </div>
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

    <!-- 抽屉与弹窗（全部懒加载，无需 Suspense —— Vue 内部处理异步组件解析） -->
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
      :edit="openTemplateModal"
    />
  </section>
</template>
