<script setup lang="ts">
/** 某餐次的内部详情页：总摄入量 + 条目列表 + 添加入口 */
import { computed } from 'vue';

import BaseModal from '@/shared/components/BaseModal.vue';
import IngredientAvatar from './IngredientAvatar.vue';
import { mealTypeLabel } from '../constants';
import { entryFromGrams, entryUnit, fmt1 } from '../engine';
import { useDietStore } from '../store/diet-store';
import type { LogEntry, MealType } from '../types';

const props = defineProps<{ open: boolean; mealType: MealType; date: string }>();
const emit = defineEmits<{ close: []; 'edit-entry': [entry: LogEntry & { _idx: number }, mealType: MealType]; add: [mealType: MealType] }>();

const store = useDietStore();

const mealLabel = computed(() => mealTypeLabel(props.mealType));
const entries = computed(() => store.mealEntries(props.date, props.mealType));
const total = computed(() => store.mealMacroSum(props.date, props.mealType));

function entryNutrition(entry: LogEntry) {
  const ing = store.findIng(entry.ingredientId);
  const out = { calories: 0, carbs: 0, protein: 0, fat: 0 };
  if (!ing?.nutrition) return out;
  const f = entry.amount / 100;
  out.calories = (ing.nutrition.calories || 0) * f;
  out.carbs = (ing.nutrition.carbs || 0) * f;
  out.protein = (ing.nutrition.protein || 0) * f;
  out.fat = (ing.nutrition.fat || 0) * f;
  return out;
}

function fmtNutri(n: ReturnType<typeof entryNutrition>): string {
  return `${fmt1(n.calories)}kcal · 碳${fmt1(n.carbs)}g · 蛋${fmt1(n.protein)}g · 脂${fmt1(n.fat)}g`;
}

function onEntryClick(entry: LogEntry & { _idx: number }): void {
  emit('edit-entry', entry, props.mealType);
}
</script>

<template>
  <BaseModal :open="open" :title="`${mealLabel} · ${date}`" width="full" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <!-- 该餐次总摄入量 -->
      <div class="grid grid-cols-4 gap-2 p-3 rounded-xl bg-paper-50 border border-paper-200/60">
        <div class="text-center">
          <div class="text-[10px] text-paper-400">热量</div>
          <div class="text-sm font-bold text-ink">{{ fmt1(total.calories) }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] text-paper-400">碳水</div>
          <div class="text-sm font-bold text-ink">{{ fmt1(total.carbs) }}g</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] text-paper-400">蛋白</div>
          <div class="text-sm font-bold text-ink">{{ fmt1(total.protein) }}g</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] text-paper-400">脂肪</div>
          <div class="text-sm font-bold text-ink">{{ fmt1(total.fat) }}g</div>
        </div>
      </div>

      <!-- 条目列表 -->
      <div class="flex flex-col gap-2">
        <div
          v-for="entry in entries"
          :key="entry._idx"
          data-testid="detail-row"
          class="flex items-center gap-3 p-3 rounded-xl border border-paper-300/60 bg-white/70 hover:bg-paper-50/60 transition-colors cursor-pointer"
          @click="onEntryClick(entry)"
        >
          <IngredientAvatar :ing="store.safeIng(entry.ingredientId)" :size="38" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ store.safeIng(entry.ingredientId).name }}</div>
            <div class="text-[10px] text-paper-400">
              {{ entryFromGrams(entry, store.findIng(entry.ingredientId), entry.amount).toFixed(1) }}{{ entryUnit(entry, store.findIng(entry.ingredientId)) }}
              · {{ fmtNutri(entryNutrition(entry)) }}
            </div>
          </div>
          <span class="text-xs text-paper-300">›</span>
        </div>
        <div v-if="!entries.length" class="text-center text-paper-400 py-10 text-sm">暂无记录</div>
      </div>

      <button
        class="w-full py-2.5 rounded-xl text-sm font-medium text-coral-500 hover:bg-coral-50 border border-coral-200 transition-colors"
        @click="emit('add', mealType)"
      >
        + 添加{{ mealLabel }}
      </button>
    </div>
  </BaseModal>
</template>
