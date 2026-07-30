/**
 * 饮食模块的跨视图 UI 状态
 *
 * v1.0 是单组件，所有 UI 状态天然共享。拆成多个 SFC 后如果全部走 props/emit，
 * 会为了「打开一个弹窗」层层透传，反而比原来更难读。
 * 这里用一个模块级 reactive 单例承载**纯 UI 状态**（不含业务数据，业务数据在 Pinia store），
 * 边界清晰：数据 → store，界面开关 → 这里。
 */

import { reactive, ref } from 'vue';

import { todayStr, type FoodTabKey } from '../constants';
import type { Ingredient, MealType } from '../types';

const foodTab = ref<FoodTabKey>('dailylog');
const logDate = ref(todayStr());
const logMealType = ref<MealType>('breakfast');

/** 食材详情抽屉 */
const selectedIng = ref<Ingredient | null>(null);

/** 菜谱页的多选食材（用于筛选菜谱 / 一键加入记录） */
const selectedIngIds = ref<number[]>([]);

const modals = reactive({
  ingForm: false,
  recipeForm: false,
  pantryForm: false,
  copyDay: false,
  copyMeal: false,
  template: false,
});

export function useDietUi() {
  function openIngDetail(ing: Ingredient): void {
    selectedIng.value = ing;
  }

  function toggleIngSelect(id: number): void {
    const i = selectedIngIds.value.indexOf(id);
    if (i > -1) selectedIngIds.value.splice(i, 1);
    else selectedIngIds.value.push(id);
  }

  return {
    foodTab,
    logDate,
    logMealType,
    selectedIng,
    selectedIngIds,
    modals,
    openIngDetail,
    toggleIngSelect,
  };
}
