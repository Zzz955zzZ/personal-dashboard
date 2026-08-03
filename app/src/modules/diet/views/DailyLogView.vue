<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import { icon } from '@/shared/icons';
import BaseModal from '@/shared/components/BaseModal.vue';
import IngredientAvatar from '../components/IngredientAvatar.vue';
import IngredientChipPicker from '../components/IngredientChipPicker.vue';
import { MEAL_TYPES, mealTypeLabel } from '../constants';
import { fmt1, fromGrams, round1, toGrams, unitLabel } from '../engine';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';
import { useUndo } from '@/shared/composables/use-undo';
import type { LogEntry, MealTemplate, MealType, Nutrition } from '../types';

const store = useDietStore();
const { logDate, logMealType, modals } = useDietUi();
const { pushUndo } = useUndo();

const emit = defineEmits<{ editTemplate: [tmpl: MealTemplate | null]; copyMeal: [m: MealType] }>();

/* ---------------- 新增记录表单 ---------------- */
const logForm = reactive<{ ingredientId: number | ''; amount: number | '' }>({
  ingredientId: '',
  amount: '',
});
const logSearch = ref('');
const logPickerOpen = ref(false);

const selectedIng = computed(() =>
  logForm.ingredientId === '' ? undefined : store.findIng(Number(logForm.ingredientId)),
);
const currentLogUnit = computed(() => unitLabel(selectedIng.value));
const logUnitPlaceholder = computed(() => (currentLogUnit.value === '个' ? '1' : '100'));

function selectLogIngredient(id: number): void {
  logForm.ingredientId = id;
  store.touchIngredient(id);
  logSearch.value = '';
  logPickerOpen.value = false;
  const ing = store.findIng(id);
  if (!logForm.amount) logForm.amount = ing?.unit === '个' ? 1 : 100;
}

function clearLogSelection(): void {
  logForm.ingredientId = '';
  logSearch.value = '';
}

/* ---------------- 汇总与预览 ---------------- */
const dayTotals = computed(() => store.dayTotals(logDate.value));
const currentDayEntries = computed(() => store.getDayLog(logDate.value));

function pct(key: keyof Nutrition): number {
  const t = store.targets[key];
  if (!t || t <= 0) return 0;
  return Math.min(100, (dayTotals.value[key] / t) * 100);
}

const logPreview = computed<{ ingredientId: number | null; totals: Nutrition }>(() => {
  const empty: Nutrition = { calories: 0, carbs: 0, protein: 0, fat: 0 };
  if (logForm.ingredientId === '' || !logForm.amount) {
    return { ingredientId: null, totals: empty };
  }
  const ing = store.findIng(Number(logForm.ingredientId));
  const base = dayTotals.value;
  if (!ing?.nutrition) return { ingredientId: Number(logForm.ingredientId), totals: { ...base } };
  const f = toGrams(ing, Number(logForm.amount)) / 100;
  return {
    ingredientId: ing.id,
    totals: {
      calories: base.calories + (ing.nutrition.calories || 0) * f,
      carbs: base.carbs + (ing.nutrition.carbs || 0) * f,
      protein: base.protein + (ing.nutrition.protein || 0) * f,
      fat: base.fat + (ing.nutrition.fat || 0) * f,
    },
  };
});

function logPreviewPct(key: keyof Nutrition): number {
  const t = store.targets[key];
  if (!t || t <= 0) return 0;
  return Math.min(100, Math.round((logPreview.value.totals[key] / t) * 100));
}

function entryNutri(entry: LogEntry): number {
  const ing = store.findIng(entry.ingredientId);
  if (!ing?.nutrition) return 0;
  return (ing.nutrition.calories || 0) * (entry.amount / 100);
}

/* ---------------- 提交 ---------------- */
function submitLogEntry(): void {
  if (logForm.ingredientId === '' || !logForm.amount) return;
  const id = Number(logForm.ingredientId);
  const grams = toGrams(store.findIng(id), Number(logForm.amount));
  if (grams <= 0) return;
  store.addLogEntry(logDate.value, { ingredientId: id, amount: grams, mealType: logMealType.value });
  logForm.amount = '';
  clearLogSelection();
}

/* ---------------- 行内编辑 ---------------- */
const editingIdx = ref<number | null>(null);
const editingMeal = ref<MealType | null>(null);
const editLogForm = reactive<{ ingredientId: number | ''; amount: number; mealType: MealType }>({
  ingredientId: '',
  amount: 0,
  mealType: 'breakfast',
});

function startEdit(entry: LogEntry & { _idx: number }, mealType: MealType): void {
  editingIdx.value = entry._idx;
  editingMeal.value = mealType;
  editLogForm.ingredientId = entry.ingredientId;
  editLogForm.amount = entry.amount;
  editLogForm.mealType = entry.mealType;
}

function cancelEdit(): void {
  editingIdx.value = null;
  editingMeal.value = null;
}

function isEditing(entry: { _idx: number }, mealType: MealType): boolean {
  return editingIdx.value === entry._idx && editingMeal.value === mealType;
}

function saveEdit(realIdx: number): void {
  if (editLogForm.ingredientId === '') return;
  store.updateLogEntry(logDate.value, realIdx, {
    ingredientId: Number(editLogForm.ingredientId),
    amount: Number(editLogForm.amount),
    mealType: editLogForm.mealType,
  });
  cancelEdit();
}

function removeEntry(realIdx: number): void {
  const removed = store.removeLogEntryAt(logDate.value, realIdx);
  if (!removed) return;
  const date = logDate.value;
  pushUndo(`已删除 ${store.findIng(removed.ingredientId)?.name ?? '记录'}`, () => {
    store.getDayLog(date).splice(realIdx, 0, removed);
    store.deductPantry(removed.ingredientId, removed.amount);
  });
}

/* ---------------- 模板 / 套餐 ---------------- */
const showTemplatePicker = ref(false);
const showTargets = ref(false);

function applyTemplate(tmpl: MealTemplate): void {
  const n = store.applyTemplate(logDate.value, tmpl);
  showTemplatePicker.value = false;
  const date = logDate.value;
  pushUndo(`已套用「${tmpl.name}」${n} 项`, () => {
    const list = store.getDayLog(date);
    for (let i = 0; i < n; i++) {
      const e = list.pop();
      if (e) store.restorePantry(e.ingredientId, e.amount);
    }
  });
}

function saveAsDefaultBreakfast(): void {
  const breakfast = store.getDayLog(logDate.value).filter((e) => e.mealType === 'breakfast');
  if (!breakfast.length) {
    window.alert('当前日期没有早餐记录。请先添加早餐条目，或使用午餐/晚餐记录创建套餐。');
    return;
  }
  for (const t of store.mealTemplates) t.isDefault = false;
  store.saveTemplate(
    {
      name: `默认早餐 (${logDate.value})`,
      emoji: '🌅',
      isDefault: true,
      defaultMealType: 'breakfast',
      items: breakfast.map((e) => ({ ingredientId: e.ingredientId, amount: e.amount })),
    },
    null,
  );
  const added = store.mealTemplates[store.mealTemplates.length - 1];
  pushUndo('设为默认早餐', () => {
    if (added) store.deleteTemplate(added.id);
  });
}

/** 切到新的空白日期时自动套用默认模板（与 v1.0 一致，只在日期真正变化时触发一次） */
let lastAutoFillDate = '';
function checkAutoFill(): void {
  if (logDate.value === lastAutoFillDate) return;
  lastAutoFillDate = logDate.value;
  store.autoFillIfEmpty(logDate.value);
}
watch(logDate, checkAutoFill, { immediate: true });
</script>

<template>
  <div>
    <!-- 工具栏 -->
    <div class="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
      <button
        v-if="store.mealTemplates.length"
        class="px-3 py-1.5 rounded-lg text-xs font-medium border border-paper-300/60 text-paper-600 hover:border-coral-300 transition-all flex items-center gap-1 shrink-0 whitespace-nowrap"
        @click="showTemplatePicker = true"
      >
        <span v-html="icon('copy')"></span> 套餐
      </button>

      <button
        class="px-3 py-1.5 rounded-lg text-xs font-medium border border-paper-300/60 text-paper-600 hover:border-coral-300 transition-all flex items-center gap-1 shrink-0 whitespace-nowrap"
        @click="showTargets = true"
      >
        🎯 目标
      </button>

      <button
        class="px-3 py-1.5 rounded-lg text-xs font-medium border border-paper-300/60 text-paper-600 hover:border-coral-300 transition-all flex items-center gap-1 shrink-0 whitespace-nowrap"
        @click="modals.copyDay = true"
      >
        <span v-html="icon('doc')"></span> 复制
      </button>

      <button
        v-if="currentDayEntries.length"
        class="px-3 py-1.5 rounded-lg text-xs font-medium border border-paper-300/60 text-paper-600 hover:border-coral-300 transition-all flex items-center gap-1 shrink-0 whitespace-nowrap"
        @click="saveAsDefaultBreakfast()"
      >
        ⭐ 默认早餐
      </button>

      <button
        class="px-3 py-1.5 rounded-lg text-xs font-medium border border-paper-300/60 text-paper-600 hover:border-coral-300 transition-all shrink-0 whitespace-nowrap ml-auto"
        @click="emit('editTemplate', null)"
      >
        ⚙️ 管理
      </button>
    </div>

    <!-- 日期 -->
    <div class="mb-5 flex items-center gap-3 p-4 rounded-xl border border-paper-300/60 bg-white/70">
      <label class="text-[11px] uppercase tracking-wide2 text-paper-500 shrink-0">日期</label>
      <input
        v-model="logDate"
        type="date"
        class="flex-1 px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
      />
    </div>

    <!-- 餐次 -->
    <div class="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
      <button
        v-for="m in MEAL_TYPES"
        :key="m.key"
        class="px-4 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 whitespace-nowrap"
        :class="logMealType === m.key ? 'bg-coral-100 border-coral-300' : 'border-paper-300/60 text-paper-500 hover:border-coral-300'"
        @click="logMealType = m.key"
      >
        {{ m.icon }} {{ m.label }}
      </button>
    </div>

    <!-- 添加表单 -->
    <form class="mb-5" @submit.prevent="submitLogEntry">
      <div class="p-4 rounded-xl border border-paper-300/60 bg-white/70">
        <IngredientChipPicker
          v-model:search="logSearch"
          v-model:open="logPickerOpen"
          :source="store.ingredients"
          :last-selected="store.ingLastSelected"
          :selected-id="logForm.ingredientId === '' ? null : Number(logForm.ingredientId)"
          show-calories
          @pick="selectLogIngredient"
        />
        <div v-if="logForm.ingredientId !== ''" class="flex flex-col gap-2.5 pt-3 border-t border-paper-200/60">
          <!-- 食材名 + 清除 -->
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-medium truncate">
              {{ selectedIng?.emoji }} {{ selectedIng?.name }}
            </span>
            <button type="button" class="shrink-0 text-paper-400 hover:text-red-500 text-xs" @click="clearLogSelection()">
              &times; 清除
            </button>
          </div>
          <!-- 数量 + 单位 + 餐次 + 提交 -->
          <div class="flex items-center gap-2 flex-wrap">
            <input
              v-model.number="logForm.amount"
              type="number"
              :placeholder="logUnitPlaceholder"
              min="0.1"
              step="0.1"
              class="w-24 px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
            />
            <span class="text-sm text-paper-500">{{ currentLogUnit }}</span>
            <select v-model="logMealType" class="px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300">
              <option v-for="m in MEAL_TYPES" :key="m.key" :value="m.key">{{ m.icon }} {{ m.label }}</option>
            </select>
            <button type="submit" class="px-4 py-2 rounded-xl text-sm font-medium bg-coral-400 text-white hover:opacity-90">记录</button>
          </div>
        </div>
        <div v-else class="text-xs text-paper-400 pt-2">↑ 搜索或点击上方食材进行选择</div>
      </div>

      <div v-if="logPreview.ingredientId && Number(logForm.amount) > 0" class="mt-3 p-3 rounded-xl border border-coral-200 bg-coral-50/70 text-xs">
        <div class="text-paper-500 mb-1.5 font-medium">添加后预计摄入量</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div><span class="text-paper-400">热量:</span> <strong>{{ logPreview.totals.calories.toFixed(0) }}</strong> / {{ store.targets.calories || '—' }} kcal <span class="text-paper-400">({{ logPreviewPct('calories') }}%)</span></div>
          <div><span class="text-paper-400">碳水:</span> <strong>{{ logPreview.totals.carbs.toFixed(1) }}</strong> / {{ store.targets.carbs || '—' }}g <span class="text-paper-400">({{ logPreviewPct('carbs') }}%)</span></div>
          <div><span class="text-paper-400">蛋白:</span> <strong>{{ logPreview.totals.protein.toFixed(1) }}</strong> / {{ store.targets.protein || '—' }}g <span class="text-paper-400">({{ logPreviewPct('protein') }}%)</span></div>
          <div><span class="text-paper-400">脂肪:</span> <strong>{{ logPreview.totals.fat.toFixed(1) }}</strong> / {{ store.targets.fat || '—' }}g <span class="text-paper-400">({{ logPreviewPct('fat') }}%)</span></div>
        </div>
      </div>
    </form>

    <!-- 汇总条 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
      <div class="p-3 sm:p-4 rounded-xl border border-paper-300/60 bg-white/70">
        <div class="text-[10px] uppercase tracking-wide text-paper-500">热量</div>
        <div class="text-base sm:text-lg font-semibold mt-0.5">{{ dayTotals.calories.toFixed(0) }} <span class="text-[10px] sm:text-xs font-normal text-paper-400">/ {{ store.targets.calories || '—' }} kcal</span></div>
        <div class="macro-bar bg-paper-200 mt-1.5"><div class="macro-fill bg-coral-400" :style="{ width: pct('calories') + '%' }"></div></div>
      </div>
      <div class="p-3 sm:p-4 rounded-xl border border-paper-300/60 bg-white/70">
        <div class="text-[10px] uppercase tracking-wide text-paper-500">碳水</div>
        <div class="text-base sm:text-lg font-semibold mt-0.5">{{ dayTotals.carbs.toFixed(1) }} <span class="text-[10px] sm:text-xs font-normal text-paper-400">/ {{ store.targets.carbs || '—' }} g</span></div>
        <div class="macro-bar bg-paper-200 mt-1.5"><div class="macro-fill bg-yellow-400" :style="{ width: pct('carbs') + '%' }"></div></div>
      </div>
      <div class="p-3 sm:p-4 rounded-xl border border-paper-300/60 bg-white/70">
        <div class="text-[10px] uppercase tracking-wide text-paper-500">蛋白质</div>
        <div class="text-base sm:text-lg font-semibold mt-0.5">{{ dayTotals.protein.toFixed(1) }} <span class="text-[10px] sm:text-xs font-normal text-paper-400">/ {{ store.targets.protein || '—' }} g</span></div>
        <div class="macro-bar bg-paper-200 mt-1.5"><div class="macro-fill bg-blue-400" :style="{ width: pct('protein') + '%' }"></div></div>
      </div>
      <div class="p-3 sm:p-4 rounded-xl border border-paper-300/60 bg-white/70">
        <div class="text-[10px] uppercase tracking-wide text-paper-500">脂肪</div>
        <div class="text-base sm:text-lg font-semibold mt-0.5">{{ dayTotals.fat.toFixed(1) }} <span class="text-[10px] sm:text-xs font-normal text-paper-400">/ {{ store.targets.fat || '—' }} g</span></div>
        <div class="macro-bar bg-paper-200 mt-1.5"><div class="macro-fill bg-purple-400" :style="{ width: pct('fat') + '%' }"></div></div>
      </div>
    </div>

    <!-- 按餐次分组的条目 -->
    <template v-for="m in MEAL_TYPES" :key="m.key">
      <div v-if="store.mealEntries(logDate, m.key).length" class="mb-5">
        <div class="text-xs uppercase tracking-wide2 text-paper-500 mb-2 flex items-center gap-2">
          <span>{{ m.icon }} {{ m.label }}</span>
          <span class="text-paper-300">· {{ fmt1(store.mealMacroSum(logDate, m.key).calories) }}kcal</span>
          <button class="ml-auto text-coral-500 hover:text-coral-600 text-[11px] font-medium" @click="emit('copyMeal', m.key)">
            📋 复制此餐
          </button>
        </div>
        <div class="flex flex-col gap-2">
          <div
            v-for="(entry, idx) in store.mealEntries(logDate, m.key)"
            :key="entry._idx"
            class="flex items-center gap-3 p-4 rounded-xl border border-paper-300/60 bg-white/70 group"
            :class="isEditing(entry, m.key) ? 'ring-2 ring-coral-300' : ''"
          >
            <IngredientAvatar :ing="store.findIng(entry.ingredientId)" :size="36" />
            <template v-if="!isEditing(entry, m.key)">
              <div class="flex-1">
                <div class="text-sm font-medium">{{ store.findIng(entry.ingredientId)?.name || entry.ingredientId }}</div>
                <div class="text-[11px] text-paper-400">
                  {{ round1(fromGrams(store.findIng(entry.ingredientId), entry.amount)) }}{{ unitLabel(store.findIng(entry.ingredientId)) }}
                  · ≈ {{ fmt1(entryNutri(entry)) }}kcal
                </div>
              </div>
              <div class="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button class="text-paper-400 hover:text-coral-500 transition-all text-sm px-2" @click="startEdit(entry, m.key)">编辑</button>
                <button class="text-paper-400 hover:text-red-500 transition-all text-sm px-2" @click="removeEntry(store.resolveRealIndex(logDate, m.key, idx))">删除</button>
              </div>
            </template>
            <template v-else>
              <div class="flex-1 flex gap-2 items-center flex-wrap">
                <select v-model="editLogForm.ingredientId" class="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300">
                  <option v-for="it in store.ingredients" :key="it.id" :value="it.id">{{ it.emoji }} {{ it.name }}</option>
                </select>
                <input v-model.number="editLogForm.amount" type="number" min="1" class="w-20 px-2 py-1.5 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300" />
                <select v-model="editLogForm.mealType" class="px-2 py-1.5 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300">
                  <option v-for="mt in MEAL_TYPES" :key="mt.key" :value="mt.key">{{ mt.icon }} {{ mt.label }}</option>
                </select>
                <button class="px-3 py-1.5 rounded-lg text-xs font-medium bg-coral-400 text-white hover:opacity-90" @click="saveEdit(store.resolveRealIndex(logDate, m.key, idx))">保存</button>
                <button class="px-3 py-1.5 rounded-lg text-xs font-medium border border-paper-300 hover:bg-coral-50" @click="cancelEdit()">取消</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>
    <div v-if="!currentDayEntries.length" class="text-center text-paper-400 py-12 text-sm font-light">今日暂无记录。</div>

    <!-- 目标摄入编辑弹窗 -->
    <BaseModal :open="showTargets" title="每日目标摄入" width="sm" @close="showTargets = false">
      <p class="text-[11px] text-paper-400 mb-4">设定后，汇总条会显示「已摄入 / 目标」进度。点击空白处或 ✕ 即保存。</p>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-[11px] text-paper-500 block mb-1">热量 kcal</label>
          <input v-model.number="store.targets.calories" type="number" class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300" />
        </div>
        <div>
          <label class="text-[11px] text-paper-500 block mb-1">碳水 g</label>
          <input v-model.number="store.targets.carbs" type="number" class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300" />
        </div>
        <div>
          <label class="text-[11px] text-paper-500 block mb-1">蛋白质 g</label>
          <input v-model.number="store.targets.protein" type="number" class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300" />
        </div>
        <div>
          <label class="text-[11px] text-paper-500 block mb-1">脂肪 g</label>
          <input v-model.number="store.targets.fat" type="number" class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300" />
        </div>
      </div>
    </BaseModal>

    <!-- 套餐选择弹窗 -->
    <BaseModal :open="showTemplatePicker" title="选择套餐" width="sm" @close="showTemplatePicker = false">
      <div class="max-h-72 overflow-y-auto -mx-5 px-5">
        <button
          v-for="tmpl in store.mealTemplates"
          :key="tmpl.id"
          class="w-full text-left px-4 py-3 rounded-xl hover:bg-coral-50 transition-colors flex items-center gap-3 mb-2"
          @click="applyTemplate(tmpl)"
        >
          <span class="text-xl">{{ tmpl.emoji || '🍽️' }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium">{{ tmpl.name }}</div>
            <div class="text-[11px] text-paper-400">
              {{ tmpl.items.length }} 种食材 · {{ mealTypeLabel(tmpl.defaultMealType) }}
            </div>
          </div>
          <span v-if="tmpl.isDefault" class="text-[11px] px-2 py-0.5 rounded-full bg-coral-100 text-coral-600">默认</span>
        </button>
      </div>
      <div class="border-t border-paper-200 mt-3 pt-3">
        <button
          class="w-full text-center px-3 py-2.5 rounded-xl text-sm font-medium text-coral-500 hover:bg-coral-50 transition-colors"
          @click="showTemplatePicker = false; emit('editTemplate', null)"
        >
          + 新建套餐
        </button>
      </div>
    </BaseModal>
  </div>
</template>
