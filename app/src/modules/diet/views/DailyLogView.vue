<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

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
const { logDate, modals } = useDietUi();
const { pushUndo } = useUndo();

const emit = defineEmits<{ editTemplate: [tmpl: MealTemplate | null]; copyMeal: [m: MealType] }>();

/* ==================== 页面状态 ==================== */

/* ---------------- 汇总 ---------------- */
const dayTotals = computed(() => store.dayTotals(logDate.value));
const currentDayEntries = computed(() => store.getDayLog(logDate.value));

function pct(key: keyof Nutrition): number {
  const t = store.targets[key];
  if (!t || t <= 0) return 0;
  return Math.min(100, (dayTotals.value[key] / t) * 100);
}

function entryNutri(entry: LogEntry): number {
  const ing = store.findIng(entry.ingredientId);
  if (!ing?.nutrition) return 0;
  return (ing.nutrition.calories || 0) * (entry.amount / 100);
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

/* ==================== 添加弹窗（底部Sheet） ==================== */
const showAddSheet = ref(false);
const addMealType = ref<MealType>('breakfast');
const addIngredientId = ref<number | ''>('');
const addAmount = ref<number | ''>('');
const addSearch = ref('');
const addPickerOpen = ref(false);

const selectedIng = computed(() =>
  addIngredientId.value === '' ? undefined : store.findIng(Number(addIngredientId.value)),
);
const addUnitLabel = computed(() => unitLabel(selectedIng.value));
const addPlaceholder = computed(() => (addUnitLabel.value === '个' ? '1' : '100'));

function openAddSheet(meal?: MealType): void {
  if (meal) addMealType.value = meal;
  showAddSheet.value = true;
  resetAddForm();
}

function resetAddForm(): void {
  addIngredientId.value = '';
  addAmount.value = '';
  addSearch.value = '';
  addPickerOpen.value = false;
}

function selectAddIngredient(id: number): void {
  addIngredientId.value = id;
  store.touchIngredient(id);
  addSearch.value = '';
  addPickerOpen.value = false;
  const ing = store.findIng(id);
  if (!addAmount.value) addAmount.value = ing?.unit === '个' ? 1 : 100;
}

function submitAdd(): void {
  if (addIngredientId.value === '' || !addAmount.value) return;
  const id = Number(addIngredientId.value);
  const grams = toGrams(store.findIng(id), Number(addAmount.value));
  if (grams <= 0) return;
  store.addLogEntry(logDate.value, { ingredientId: id, amount: grams, mealType: addMealType.value });
  showAddSheet.value = false;
}

/* ==================== 管理弹窗（目标/套餐/复制） ==================== */
const showManage = ref(false);
const manageTab = ref<'targets' | 'templates' | 'copy'>('targets');
const showTemplatePickerForApply = ref(false);

function applyTemplate(tmpl: MealTemplate): void {
  const n = store.applyTemplate(logDate.value, tmpl);
  showTemplatePickerForApply.value = false;
  const date = logDate.value;
  pushUndo(`已套用「${tmpl.name}」${n} 项`, () => {
    const list = store.getDayLog(date);
    for (let i = 0; i < n; i++) {
      const e = list.pop();
      if (e) store.restorePantry(e.ingredientId, e.amount);
    }
  });
}
</script>

<template>
  <div>
    <!-- ====== 顶部：日期 + 汇总 ====== -->
    <div class="mb-3">
      <!-- 日期行：极简 -->
      <div class="flex items-center justify-between px-1 mb-2">
        <input
          v-model="logDate"
          type="date"
          class="text-xs sm:text-sm font-medium text-ink bg-transparent border-none outline-none cursor-pointer"
        />
        <button
          class="text-[11px] text-coral-500 hover:text-coral-600 font-medium flex items-center gap-1"
          @click="showManage = true"
        >
          ⚙ 管理
        </button>
      </div>

      <!-- 今日汇总：紧凑横条 -->
      <div class="grid grid-cols-4 gap-1.5">
        <div class="p-2 rounded-lg border border-paper-200/60 bg-white/80 text-center">
          <div class="text-[9px] text-paper-400">热量</div>
          <div class="text-sm font-bold text-ink">{{ dayTotals.calories.toFixed(0) }}</div>
          <div class="h-1 bg-paper-100 rounded-full mt-1"><div class="h-full bg-coral-400 rounded-full" :style="{ width: pct('calories') + '%' }"></div></div>
        </div>
        <div class="p-2 rounded-lg border border-paper-200/60 bg-white/80 text-center">
          <div class="text-[9px] text-paper-400">碳水</div>
          <div class="text-sm font-bold text-ink">{{ dayTotals.carbs.toFixed(0) }}g</div>
          <div class="h-1 bg-paper-100 rounded-full mt-1"><div class="h-full bg-yellow-400 rounded-full" :style="{ width: pct('carbs') + '%' }"></div></div>
        </div>
        <div class="p-2 rounded-lg border border-paper-200/60 bg-white/80 text-center">
          <div class="text-[9px] text-paper-400">蛋白</div>
          <div class="text-sm font-bold text-ink">{{ dayTotals.protein.toFixed(0) }}g</div>
          <div class="h-1 bg-paper-100 rounded-full mt-1"><div class="h-full bg-blue-400 rounded-full" :style="{ width: pct('protein') + '%' }"></div></div>
        </div>
        <div class="p-2 rounded-lg border border-paper-200/60 bg-white/80 text-center">
          <div class="text-[9px] text-paper-400">脂肪</div>
          <div class="text-sm font-bold text-ink">{{ dayTotals.fat.toFixed(0) }}g</div>
          <div class="h-1 bg-paper-100 rounded-full mt-1"><div class="h-full bg-purple-400 rounded-full" :style="{ width: pct('fat') + '%' }"></div></div>
        </div>
      </div>
    </div>

    <!-- ====== 按餐次分组的条目 ====== -->
    <template v-for="m in MEAL_TYPES" :key="m.key">
      <div v-if="store.mealEntries(logDate, m.key).length" class="mb-4">
        <!-- 餐次标题行 -->
        <div class="flex items-center justify-between px-1 mb-1.5">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-ink">{{ m.icon }} {{ m.label }}</span>
            <span class="text-[11px] text-paper-400">{{ fmt1(store.mealMacroSum(logDate, m.key).calories) }} kcal</span>
          </div>
          <button class="text-[11px] text-coral-500" @click="emit('copyMeal', m.key)">复制</button>
        </div>

        <!-- 食物列表 -->
        <div class="flex flex-col gap-1.5">
          <div
            v-for="(entry, idx) in store.mealEntries(logDate, m.key)"
            :key="entry._idx"
            class="flex items-center gap-2 p-2.5 rounded-xl border border-paper-200/60 bg-white/80 group"
            :class="isEditing(entry, m.key) ? 'ring-2 ring-coral-300' : ''"
          >
            <IngredientAvatar :ing="store.findIng(entry.ingredientId)" :size="32" />
            <template v-if="!isEditing(entry, m.key)">
              <div class="flex-1 min-w-0">
                <div class="text-xs sm:text-sm font-medium text-ink truncate">{{ store.findIng(entry.ingredientId)?.name }}</div>
                <div class="text-[10px] text-paper-400">
                  {{ round1(fromGrams(store.findIng(entry.ingredientId), entry.amount)) }}{{ unitLabel(store.findIng(entry.ingredientId)) }}
                  · {{ fmt1(entryNutri(entry)) }}kcal
                </div>
              </div>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="text-paper-400 hover:text-coral-500 text-xs px-1.5" @click="startEdit(entry, m.key)">改</button>
                <button class="text-paper-400 hover:text-red-500 text-xs px-1.5" @click="removeEntry(store.resolveRealIndex(logDate, m.key, idx))">删</button>
              </div>
            </template>
            <template v-else>
              <div class="flex-1 flex gap-1.5 items-center flex-wrap">
                <select v-model="editLogForm.ingredientId" class="flex-1 min-w-[120px] px-2 py-1 rounded-lg border border-paper-300/60 bg-white text-xs focus:outline-none focus:border-coral-300">
                  <option v-for="it in store.ingredients" :key="it.id" :value="it.id">{{ it.emoji }} {{ it.name }}</option>
                </select>
                <input v-model.number="editLogForm.amount" type="number" min="1" class="w-16 px-2 py-1 rounded-lg border border-paper-300/60 bg-white text-xs focus:outline-none focus:border-coral-300" />
                <select v-model="editLogForm.mealType" class="px-2 py-1 rounded-lg border border-paper-300/60 bg-white text-xs focus:outline-none focus:border-coral-300">
                  <option v-for="mt in MEAL_TYPES" :key="mt.key" :value="mt.key">{{ mt.icon }} {{ mt.label }}</option>
                </select>
                <button class="px-2 py-1 rounded-lg text-[11px] font-medium bg-coral-400 text-white" @click="saveEdit(store.resolveRealIndex(logDate, m.key, idx))">保存</button>
                <button class="px-2 py-1 rounded-lg text-[11px] border border-paper-300" @click="cancelEdit()">取消</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- 空状态 -->
    <div v-if="!currentDayEntries.length" class="text-center py-10">
      <div class="text-3xl mb-2">🍽️</div>
      <p class="text-xs text-paper-400">今天还没有记录</p>
      <button class="mt-2 px-4 py-2 rounded-xl bg-coral-400 text-white text-xs font-medium" @click="openAddSheet()">
        添加第一餐
      </button>
    </div>

    <!-- ====== 底部浮动添加按钮 ====== -->
    <div class="fixed bottom-4 right-4 z-30">
      <button
        class="w-12 h-12 rounded-full bg-coral-500 text-white shadow-lg hover:bg-coral-400 active:scale-95 transition-all flex items-center justify-center text-2xl"
        title="添加食物"
        @click="openAddSheet()"
      >
        +
      </button>
    </div>

    <!-- ====== 添加食物底部弹窗 ====== -->
    <Teleport to="body">
      <transition name="slide-up">
        <div v-if="showAddSheet" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center" @click.self="showAddSheet = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showAddSheet = false" />
          <div class="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
            <!-- 标题栏 -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-paper-100">
              <h3 class="text-sm font-semibold text-ink">添加食物</h3>
              <button class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-paper-100 text-paper-400 text-sm" @click="showAddSheet = false">✕</button>
            </div>

            <!-- 餐次选择 -->
            <div class="px-4 pt-3 pb-2">
              <div class="flex gap-2">
                <button
                  v-for="m in MEAL_TYPES"
                  :key="m.key"
                  class="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  :class="addMealType === m.key ? 'bg-coral-50 border-coral-300 text-coral-600' : 'border-paper-200 text-paper-500'"
                  @click="addMealType = m.key"
                >
                  {{ m.icon }} {{ m.label }}
                </button>
              </div>
            </div>

            <!-- 食材搜索/选择 -->
            <div class="px-4 pb-3">
              <IngredientChipPicker
                v-model:search="addSearch"
                v-model:open="addPickerOpen"
                :source="store.ingredients"
                :last-selected="store.ingLastSelected"
                :selected-id="addIngredientId === '' ? null : Number(addIngredientId)"
                @pick="selectAddIngredient"
              />
            </div>

            <!-- 已选食材 + 营养信息 + 数量 + 提交 -->
            <div v-if="addIngredientId !== ''" class="px-4 pb-3 border-t border-paper-100 pt-3">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm font-medium">{{ selectedIng?.emoji }} {{ selectedIng?.name }}</span>
                <span v-if="selectedIng?.brand" class="text-[11px] text-paper-400">·{{ selectedIng.brand }}</span>
                <button class="text-paper-400 hover:text-red-500 text-xs" @click="addIngredientId = ''; addAmount = ''">清除</button>
              </div>

              <!-- 每 100g 营养信息 -->
              <div v-if="selectedIng?.nutrition" class="grid grid-cols-4 gap-1.5 mb-3 p-2.5 rounded-xl bg-paper-50/80 border border-paper-200/60">
                <div class="text-center">
                  <div class="text-[9px] text-paper-400">热量</div>
                  <div class="text-xs font-bold text-coral-500">{{ fmt1(selectedIng.nutrition.calories) }}<span class="text-[9px] font-normal">kcal</span></div>
                </div>
                <div class="text-center">
                  <div class="text-[9px] text-paper-400">碳水</div>
                  <div class="text-xs font-bold text-yellow-500">{{ fmt1(selectedIng.nutrition.carbs) }}<span class="text-[9px] font-normal">g</span></div>
                </div>
                <div class="text-center">
                  <div class="text-[9px] text-paper-400">蛋白</div>
                  <div class="text-xs font-bold text-blue-500">{{ fmt1(selectedIng.nutrition.protein) }}<span class="text-[9px] font-normal">g</span></div>
                </div>
                <div class="text-center">
                  <div class="text-[9px] text-paper-400">脂肪</div>
                  <div class="text-xs font-bold text-purple-500">{{ fmt1(selectedIng.nutrition.fat) }}<span class="text-[9px] font-normal">g</span></div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <input
                  v-model.number="addAmount"
                  type="number"
                  :placeholder="addPlaceholder"
                  min="0.1"
                  step="0.1"
                  class="flex-1 px-3 py-2 rounded-lg border border-paper-300 bg-white text-sm focus:outline-none focus:border-coral-400"
                />
                <span class="text-sm text-paper-500 w-6 text-center">{{ addUnitLabel }}</span>
                <button
                  class="px-4 py-2 rounded-xl bg-coral-400 text-white text-sm font-medium hover:bg-coral-500 active:scale-[0.98] transition-all"
                  @click="submitAdd"
                >
                  记录
                </button>
              </div>
            </div>
            <div v-else class="px-4 pb-4 text-[11px] text-paper-400">↑ 搜索或点击食材进行选择</div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- ====== 管理弹窗（目标 / 套餐 / 复制） ====== -->
    <BaseModal :open="showManage" title="管理" width="sm" @close="showManage = false">
      <!-- Tab 切换 -->
      <div class="flex gap-1 mb-4 border-b border-paper-100">
        <button
          class="px-3 py-2 text-xs font-medium transition-colors"
          :class="manageTab === 'targets' ? 'text-coral-500 border-b-2 border-coral-500' : 'text-paper-400'"
          @click="manageTab = 'targets'"
        >
          🎯 目标
        </button>
        <button
          class="px-3 py-2 text-xs font-medium transition-colors"
          :class="manageTab === 'templates' ? 'text-coral-500 border-b-2 border-coral-500' : 'text-paper-400'"
          @click="manageTab = 'templates'"
        >
          🍽️ 套餐
        </button>
        <button
          class="px-3 py-2 text-xs font-medium transition-colors"
          :class="manageTab === 'copy' ? 'text-coral-500 border-b-2 border-coral-500' : 'text-paper-400'"
          @click="manageTab = 'copy'"
        >
          📋 复制
        </button>
      </div>

      <!-- 目标面板 -->
      <div v-if="manageTab === 'targets'">
        <p class="text-[11px] text-paper-400 mb-3">设定后汇总条显示进度</p>
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
      </div>

      <!-- 套餐面板 -->
      <div v-if="manageTab === 'templates'">
        <div class="max-h-64 overflow-y-auto space-y-2 mb-3">
          <button
            v-for="tmpl in store.mealTemplates"
            :key="tmpl.id"
            class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-coral-50 transition-colors flex items-center gap-3"
            @click="applyTemplate(tmpl)"
          >
            <span class="text-lg">{{ tmpl.emoji || '🍽️' }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium">{{ tmpl.name }}</div>
              <div class="text-[11px] text-paper-400">{{ tmpl.items.length }} 种 · {{ mealTypeLabel(tmpl.defaultMealType) }}</div>
            </div>
            <span v-if="tmpl.isDefault" class="text-[10px] px-1.5 py-0.5 rounded-full bg-coral-100 text-coral-600">默认</span>
          </button>
          <div v-if="!store.mealTemplates.length" class="text-center text-paper-400 py-6 text-sm">暂无套餐</div>
        </div>
        <div class="border-t border-paper-100 pt-3">
          <button
            class="w-full text-center px-3 py-2.5 rounded-xl text-sm font-medium text-coral-500 hover:bg-coral-50 transition-colors"
            @click="showManage = false; emit('editTemplate', null)"
          >
            + 新建 / 编辑套餐
          </button>
        </div>
      </div>

      <!-- 复制面板 -->
      <div v-if="manageTab === 'copy'">
        <p class="text-[11px] text-paper-400 mb-3">将某天的全部记录复制到当前日期</p>
        <button
          class="w-full px-3 py-2.5 rounded-xl text-sm font-medium border border-paper-300 text-paper-600 hover:bg-paper-50 transition-colors text-left"
          @click="showManage = false; modals.copyDay = true"
        >
          📋 复制一整天的记录
        </button>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
