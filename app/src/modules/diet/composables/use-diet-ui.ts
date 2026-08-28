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

/** 从记录页跳转过来选择食材的上下文（用于新增一条记录） */
interface IngredientPickerContext {
  type: 'ingredient';
  date: string;
  mealType: MealType;
}
const pickerContext = ref<IngredientPickerContext | null>(null);

/** 把某条「食材已不存在」的记录重新关联到真实食材的上下文 */
interface IngredientRelinkContext {
  type: 'relink';
  date: string;
  /** 该记录在整日数组中的真实下标 */
  realIdx: number;
}
const relinkContext = ref<IngredientRelinkContext | null>(null);

const modals = reactive({
  ingForm: false,
  copyDay: false,
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

  function startIngredientPicker(date: string, mealType: MealType): void {
    pickerContext.value = { type: 'ingredient', date, mealType };
    foodTab.value = 'ingredients';
  }

  function clearPickerContext(): void {
    pickerContext.value = null;
  }

  /** 进入「重新选择食材」模式：跳到食材页，点选后替换孤儿记录的 ingredientId */
  function startRelink(date: string, realIdx: number): void {
    relinkContext.value = { type: 'relink', date, realIdx };
    foodTab.value = 'ingredients';
  }

  function clearRelinkContext(): void {
    relinkContext.value = null;
  }

  /** 食材页的两种跳转上下文共用一个「取消」动作 */
  function cancelContext(): void {
    pickerContext.value = null;
    relinkContext.value = null;
  }

  return {
    foodTab,
    logDate,
    logMealType,
    selectedIng,
    selectedIngIds,
    pickerContext,
    relinkContext,
    modals,
    openIngDetail,
    toggleIngSelect,
    startIngredientPicker,
    clearPickerContext,
    startRelink,
    clearRelinkContext,
    cancelContext,
  };
}
