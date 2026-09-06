<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import BaseModal from '@/shared/components/BaseModal.vue';
import IngredientAvatar from '../components/IngredientAvatar.vue';
import MealDetailModal from '../components/MealDetailModal.vue';
import ProfileManagerModal from '../components/ProfileManagerModal.vue';
import { DEFAULT_PROFILE_ID, MEAL_TYPES, mealTypeLabel } from '../constants';
import { entryFromGrams, entryToGrams, entryUnit, fmt1, round1 } from '../engine';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';
import { useUndo } from '@/shared/composables/use-undo';
import { selectOnFocus } from '@/shared/utils/input';
import type { DietProfile, IngredientUnit, LogEntry, MealTemplate, MealType, Nutrition } from '../types';

const store = useDietStore();
const { logDate, modals, startIngredientPicker, startRelink, openIngDetail } = useDietUi();
const { pushUndo, pushToast } = useUndo();

/* ==================== 多用户切换 ==================== */
const showProfileManager = ref(false);
const editingProfileId = ref<string | null>(null);

function openProfileManager(id: string | null): void {
  editingProfileId.value = id;
  showProfileManager.value = true;
}

/** 在档案管理弹窗内点「编辑」：保持在打开状态并切换为编辑表单 */
function onProfileEdit(id: string): void {
  editingProfileId.value = id;
}

function switcherActiveStyle(p: DietProfile): Record<string, string> {
  return { borderColor: p.color, color: p.color, backgroundColor: p.color + '1A' };
}
function switcherIdleStyle(p: DietProfile): Record<string, string> {
  return { borderColor: p.color + '66', color: p.color };
}

const emit = defineEmits<{ editTemplate: [tmpl: MealTemplate | null] }>();

/* ==================== 页面状态 ==================== */

const dayTotals = computed(() => store.dayTotals(logDate.value));
const currentDayEntries = computed(() => store.visibleDayLog(logDate.value));

function pct(key: keyof Nutrition): number {
  const t = store.targets[key];
  if (!t || t <= 0) return 0;
  return Math.min(100, (dayTotals.value[key] / t) * 100);
}

function entryNutrition(entry: LogEntry): Nutrition {
  const ing = store.findIng(entry.ingredientId);
  const out: Nutrition = { calories: 0, carbs: 0, protein: 0, fat: 0 };
  if (!ing?.nutrition) return out;
  const f = entry.amount / 100;
  out.calories = (ing.nutrition.calories || 0) * f;
  out.carbs = (ing.nutrition.carbs || 0) * f;
  out.protein = (ing.nutrition.protein || 0) * f;
  out.fat = (ing.nutrition.fat || 0) * f;
  return out;
}

function fmtNutri(n: Nutrition): string {
  return `${fmt1(n.calories)}kcal · 碳${fmt1(n.carbs)}g · 蛋${fmt1(n.protein)}g · 脂${fmt1(n.fat)}g`;
}

/* 自动套用默认套餐：hydration 完成后、切换日期/用户时各触发一次。
   子组件 onMounted 早于外壳的 store.hydrate()，故不能只在 mounted 里套用——
   用 watch 等 hydrated 翻转后再填充，修复「默认早餐要点添加才出现」的时序 bug。 */
function applyDefaults(): void {
  if (!store.hydrated) return;
  store.autoFillDefaults(logDate.value);
}

watch(
  [() => store.hydrated, logDate, () => store.currentUserId],
  applyDefaults,
  { immediate: true },
);

/* 当前用户可见的套餐（含旧数据无归属者 → 默认档案「我」） */
const visibleTemplates = computed(() =>
  store.mealTemplates.filter((t) => (t.userId ?? DEFAULT_PROFILE_ID) === store.currentUserId),
);

/* ==================== 餐次展开 ==================== */
const expandedMeals = reactive<Record<MealType, boolean>>({
  breakfast: true,
  lunch: true,
  dinner: true,
});

function toggleMeal(meal: MealType): void {
  expandedMeals[meal] = !expandedMeals[meal];
}

/* ==================== 添加食材：跳转食材页选择 ==================== */
function startPicker(meal?: MealType): void {
  const m = meal || 'breakfast';
  expandedMeals[m] = true;
  startIngredientPicker(logDate.value, m);
}

/* ==================== 移动端编辑抽屉 ==================== */
const showEditSheet = ref(false);
const saving = ref(false);
const editRealIdx = ref<number | null>(null);
const editMealType = ref<MealType>('breakfast');
const editForm = reactive<{
  ingredientId: number | '';
  amount: number | '';
  mealType: MealType;
  unit: IngredientUnit;
}>({
  ingredientId: '',
  amount: '',
  mealType: 'breakfast',
  unit: 'g',
});

function openEdit(entry: LogEntry & { _idx: number }, mealType: MealType): void {
  // entry._idx 即该记录在「整日数组」中的真实下标（mealEntries 已赋值），
  // 直接采用，避免「按餐次序号二次换算」导致非首个餐次记录定位失败、误报「位置已变」。
  const realIdx = entry._idx;
  editRealIdx.value = realIdx;
  editMealType.value = mealType;
  editForm.ingredientId = entry.ingredientId;
  const ing = store.findIng(entry.ingredientId);
  editForm.unit = entry.unit || ing?.unit || 'g';
  editForm.amount = round1(entryFromGrams(entry, ing, entry.amount));
  editForm.mealType = entry.mealType;
  showEditSheet.value = true;
}

/** 当前编辑的记录是否引用了已不存在的食材（幽灵记录） */
const isGhostEdit = computed(() =>
  editForm.ingredientId === '' ? false : !store.findIng(Number(editForm.ingredientId)),
);

/** 把幽灵记录重新关联到真实食材（复用食材页搜索选择，避免旧的长下拉） */
function startRelinkEntry(): void {
  if (editRealIdx.value === null) return;
  const idx = editRealIdx.value;
  closeEdit();
  startRelink(logDate.value, idx);
}

function closeEdit(): void {
  showEditSheet.value = false;
  editRealIdx.value = null;
}

function openDetailFromEdit(): void {
  if (editForm.ingredientId === '') return;
  const ing = store.findIng(Number(editForm.ingredientId));
  if (!ing) return;
  closeEdit();
  openIngDetail(ing);
}

async function saveEdit(): Promise<void> {
  // 校验：未选食材或分量非法时拦截并提示
  if (editRealIdx.value === null || editForm.ingredientId === '' || !editForm.amount || Number(editForm.amount) <= 0) {
    pushToast('请输入有效的分量');
    return;
  }
  saving.value = true;
  try {
    const idNum = Number(editForm.ingredientId);
    const ing = store.findIng(idNum);
    // 幽灵记录没有换算基准：把输入值直接按克存储
    const grams = ing
      ? entryToGrams({ unit: editForm.unit }, ing, Number(editForm.amount))
      : Number(editForm.amount) || 0;
    store.updateLogEntry(logDate.value, editRealIdx.value, {
      ingredientId: idNum,
      amount: grams,
      mealType: editForm.mealType,
      unit: ing ? editForm.unit : 'g',
    });
    pushToast('已保存');
    closeEdit();
  } catch (e) {
    // 兜底错误提示，避免静默失败
    pushToast('保存失败，请重试');
    console.error('[DailyLogView] saveEdit 失败', e);
  } finally {
    saving.value = false;
  }
}

function setEditUnit(u: IngredientUnit): void {
  if (editForm.unit === u || editForm.ingredientId === '') return;
  // 幽灵记录无 gramsPerUnit，单位只能按克
  if (isGhostEdit.value) return;
  const ing = store.findIng(Number(editForm.ingredientId));
  const grams = entryToGrams({ unit: editForm.unit }, ing, Number(editForm.amount) || 0);
  editForm.unit = u;
  editForm.amount = round1(entryFromGrams({ unit: u }, ing, grams));
}

/** 编辑抽屉里「该分量」的实时营养素：按所选数量与单位换算 */
const editPreviewNutrition = computed<Nutrition>(() => {
  const out: Nutrition = { calories: 0, carbs: 0, protein: 0, fat: 0 };
  if (editForm.ingredientId === '') return out;
  const ing = store.findIng(Number(editForm.ingredientId));
  if (!ing?.nutrition) return out;
  const grams = entryToGrams({ unit: editForm.unit }, ing, Number(editForm.amount) || 0);
  const f = grams / 100;
  out.calories = (ing.nutrition.calories || 0) * f;
  out.carbs = (ing.nutrition.carbs || 0) * f;
  out.protein = (ing.nutrition.protein || 0) * f;
  out.fat = (ing.nutrition.fat || 0) * f;
  return out;
});

function removeEntry(realIdx: number, name: string): void {
  const removed = store.removeLogEntryAt(logDate.value, realIdx);
  closeEdit();
  if (removed) {
    // 撤回：把刚删的条目原位插回并回补库存，8 秒内可撤销误删
    pushUndo(`已删除 ${name}`, () => {
      const list = store.getDayLog(logDate.value);
      list.splice(realIdx, 0, removed);
      store.deductPantry(removed.ingredientId, removed.amount);
    });
  } else {
    pushToast(`已删除 ${name}`);
  }
}

/* ==================== 餐次详情页 ==================== */
const showMealDetail = ref(false);
const detailMealType = ref<MealType>('breakfast');

function openMealDetail(mealType: MealType): void {
  detailMealType.value = mealType;
  showMealDetail.value = true;
}
function closeMealDetail(): void {
  showMealDetail.value = false;
}

/* ==================== 管理弹窗 ==================== */
const showManage = ref(false);
const manageTab = ref<'targets' | 'templates' | 'copy'>('targets');

function applyTemplate(tmpl: MealTemplate): void {
  const n = store.applyTemplate(logDate.value, tmpl);
  expandedMeals[tmpl.defaultMealType] = true;
  pushToast(`已套用「${tmpl.name}」${n} 项`);
}
</script>

<template>
  <div>
    <!-- 用户切换：每个用户独立记录，点击切换查看/编辑对象 -->
    <div class="flex items-center gap-1.5 mb-3 flex-wrap">
      <button
        v-for="p in store.profiles"
        :key="p.id"
        class="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
        :class="store.currentUserId === p.id ? 'ring-1' : 'opacity-80 hover:opacity-100'"
        :style="store.currentUserId === p.id ? switcherActiveStyle(p) : switcherIdleStyle(p)"
        :data-testid="'user-chip-' + p.id"
        @click="store.setCurrentUser(p.id)"
      >
        <span>{{ p.emoji }}</span>
        <span>{{ p.name }}</span>
      </button>
      <button
        class="w-7 h-7 rounded-full border border-paper-300 text-paper-500 hover:bg-paper-50 flex items-center justify-center text-sm transition-colors"
        title="管理用户"
        data-testid="user-manage"
        @click="openProfileManager(null)"
      >✎</button>
      <button
        class="w-7 h-7 rounded-full border border-coral-300 text-coral-500 hover:bg-coral-50 flex items-center justify-center text-sm transition-colors"
        title="新增用户"
        data-testid="user-add"
        @click="openProfileManager(null)"
      >+</button>
    </div>

    <!-- 日期行 -->
    <div class="flex items-center justify-between px-1 mb-3">
      <div class="flex items-center gap-2">
        <input
          v-model="logDate"
          type="date"
          class="text-xs sm:text-sm font-medium text-ink bg-transparent border-none outline-none cursor-pointer"
        />
        <span
          v-if="store.activeProfile"
          class="text-[11px] px-1.5 py-0.5 rounded-full"
          :style="{ backgroundColor: store.activeProfile.color + '1A', color: store.activeProfile.color }"
        >{{ store.activeProfile.emoji }} {{ store.activeProfile.name }} 的记录</span>
      </div>
      <button
        class="text-[11px] text-coral-500 hover:text-coral-600 font-medium flex items-center gap-1"
        @click="showManage = true"
      >
        管理
      </button>
    </div>

    <!-- 今日汇总 -->
    <div class="grid grid-cols-4 gap-1.5 mb-4">
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

    <!-- 按餐次分组 -->
    <template v-for="m in MEAL_TYPES" :key="m.key">
      <div class="mb-3 rounded-xl border border-paper-200/60 bg-white/80 overflow-hidden">
        <!-- 餐次标题 -->
        <button
          class="w-full flex items-center justify-between px-3 py-2.5 bg-paper-50/60"
          @click="toggleMeal(m.key)"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-ink">{{ m.label }}</span>
            <span class="text-[11px] text-paper-400">{{ store.mealEntries(logDate, m.key).length }} 项</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-paper-500">{{ fmt1(store.mealMacroSum(logDate, m.key).calories) }} kcal</span>
            <button
              class="text-[11px] text-coral-500 hover:text-coral-600 px-1"
              @click.stop="openMealDetail(m.key)"
            >
              详情
            </button>
            <span class="text-xs transition-transform" :class="expandedMeals[m.key] ? 'rotate-180' : ''">▼</span>
          </div>
        </button>

        <!-- 展开明细 -->
        <div v-show="expandedMeals[m.key]" class="px-2 pb-2">
          <div
            v-for="entry in store.mealEntries(logDate, m.key)"
            :key="entry._idx"
            data-testid="log-row"
            class="flex items-center gap-2 p-2 rounded-xl hover:bg-paper-50/80 active:bg-paper-100 transition-colors"
            @click="openEdit(entry, m.key)"
          >
            <IngredientAvatar :ing="store.safeIng(entry.ingredientId)" :size="34" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-ink truncate">
                {{ store.safeIng(entry.ingredientId).name }}
                <span v-if="store.safeIng(entry.ingredientId).brand" class="text-[10px] text-paper-400">·{{ store.safeIng(entry.ingredientId).brand }}</span>
              </div>
            <div class="text-[10px] text-paper-400">
              {{ round1(entryFromGrams(entry, store.findIng(entry.ingredientId), entry.amount)) }}{{ entryUnit(entry, store.findIng(entry.ingredientId)) }}
              · {{ fmtNutri(entryNutrition(entry)) }}
            </div>
            </div>
          </div>
          <div v-if="!store.mealEntries(logDate, m.key).length" class="text-center text-paper-400 py-4 text-xs">
            暂无记录，点击下方按钮添加
          </div>
          <button
            class="w-full mt-1 py-1.5 rounded-lg text-xs font-medium text-coral-500 hover:bg-coral-50 transition-colors"
            @click="startPicker(m.key)"
          >
            + 添加
          </button>
        </div>
      </div>
    </template>

    <!-- 空状态 -->
    <div v-if="!currentDayEntries.length" class="text-center py-10">
      <div class="text-3xl mb-2">🍽️</div>
      <p class="text-xs text-paper-400">今天还没有记录</p>
      <button class="mt-2 px-4 py-2 rounded-xl bg-coral-400 text-white text-xs font-medium" @click="startPicker()">
        添加第一餐
      </button>
    </div>

    <!-- 底部浮动添加按钮（用当前用户主题色，便于区分归属） -->
    <div class="fixed bottom-4 right-4 z-30">
      <button
        class="w-14 h-14 rounded-full text-white shadow-lg hover:opacity-90 transition-all flex items-center justify-center text-3xl"
        :style="{ backgroundColor: store.activeProfile?.color || '#fb7185' }"
        data-testid="fab-add"
        @click="startPicker()"
      >
        +
      </button>
    </div>


    <!-- 编辑食物抽屉 -->
    <Teleport to="body">
      <transition name="slide-up">
        <div v-if="showEditSheet" data-testid="edit-sheet" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" @click.self="showEditSheet = false">
          <div class="absolute inset-0 bg-black/70" @click="showEditSheet = false" />
          <div class="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl">
            <div class="flex items-center justify-between px-4 py-3 border-b border-paper-100">
              <h3 class="text-sm font-semibold text-ink">修改分量 / 餐次</h3>
              <div class="flex items-center gap-1">
                <button
                  v-if="editRealIdx !== null"
                  class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-red-500 text-sm"
                  @click.stop="removeEntry(editRealIdx, store.findIng(Number(editForm.ingredientId))?.name || '记录')"
                >
                  ×
                </button>
                <button class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-paper-100 text-paper-400 text-sm" @click="closeEdit">✕</button>
              </div>
            </div>
            <div class="p-4 space-y-4">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-[11px] text-paper-500">食材</label>
                  <button
                    v-if="!isGhostEdit"
                    class="text-[11px] text-coral-500 hover:text-coral-600"
                    @click="openDetailFromEdit"
                  >食材详情 ›</button>
                  <button
                    v-else
                    class="text-[11px] text-coral-500 hover:text-coral-600"
                    @click="startRelinkEntry"
                  >重新选择食材 ›</button>
                </div>
                <div class="flex items-center gap-3 px-3 py-2 rounded-lg border border-paper-300/60 bg-paper-50/50">
                  <span class="text-lg">{{ store.safeIng(Number(editForm.ingredientId)).emoji }}</span>
                  <span class="text-sm text-ink">{{ store.safeIng(Number(editForm.ingredientId)).name }}</span>
                </div>
                <p v-if="isGhostEdit" class="mt-1 text-[11px] text-amber-500">⚠ 该食材已不存在，可重新选择或删除此记录</p>
              </div>
              <div>
                <label class="text-[11px] text-paper-500 block mb-1">分量</label>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="editForm.amount"
                    type="number"
                    min="0.1"
                    step="0.1"
                    @focus="selectOnFocus"
                    class="flex-1 px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
                  />
                  <div class="flex rounded-lg border border-paper-300/60 bg-white overflow-hidden">
                    <button
                      type="button"
                      class="px-3 py-2 text-sm font-medium transition-colors"
                      :class="editForm.unit === 'g' ? 'bg-coral-400 text-white' : 'text-paper-500 hover:bg-paper-50'"
                      @click="setEditUnit('g')"
                    >
                      g
                    </button>
                  <button
                    type="button"
                    class="px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    :class="editForm.unit === '个' ? 'bg-coral-400 text-white' : 'text-paper-500 hover:bg-paper-50'"
                    :disabled="isGhostEdit"
                    @click="setEditUnit('个')"
                  >
                    个
                  </button>
                  </div>
                </div>
              </div>
              <!-- 该分量营养素（随数量/单位实时换算） -->
              <div class="p-3 rounded-xl bg-paper-50 border border-paper-200/60">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[11px] text-paper-500">该分量营养素</span>
                  <span class="text-[11px] text-paper-400">{{ Number(editForm.amount) || 0 }}{{ editForm.unit }}</span>
                </div>
                <div class="grid grid-cols-4 gap-1.5 text-center">
                  <div>
                    <div class="text-[9px] text-paper-400">热量</div>
                    <div class="text-sm font-bold text-ink">{{ fmt1(editPreviewNutrition.calories) }}</div>
                  </div>
                  <div>
                    <div class="text-[9px] text-paper-400">碳水</div>
                    <div class="text-sm font-bold text-ink">{{ fmt1(editPreviewNutrition.carbs) }}g</div>
                  </div>
                  <div>
                    <div class="text-[9px] text-paper-400">蛋白</div>
                    <div class="text-sm font-bold text-ink">{{ fmt1(editPreviewNutrition.protein) }}g</div>
                  </div>
                  <div>
                    <div class="text-[9px] text-paper-400">脂肪</div>
                    <div class="text-sm font-bold text-ink">{{ fmt1(editPreviewNutrition.fat) }}g</div>
                  </div>
                </div>
              </div>
              <div>
                <label class="text-[11px] text-paper-500 block mb-1">餐次</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="m in MEAL_TYPES"
                    :key="m.key"
                    class="py-1.5 rounded-lg text-xs font-medium border transition-all"
                    :class="editForm.mealType === m.key ? 'bg-coral-50 border-coral-300 text-coral-600' : 'border-paper-200 text-paper-500'"
                    @click="editForm.mealType = m.key"
                  >
                    {{ m.label }}
                  </button>
                </div>
              </div>
              <button
                class="w-full px-4 py-2.5 rounded-xl bg-coral-400 text-white text-sm font-medium hover:bg-coral-500 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="saving"
                @click="saveEdit"
              >
                {{ saving ? '保存中…' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <MealDetailModal
      :open="showMealDetail"
      :meal-type="detailMealType"
      :date="logDate"
      @close="closeMealDetail"
      @edit-entry="(entry, mt) => { closeMealDetail(); openEdit(entry, mt); }"
      @add="startPicker"
    />

    <!-- 管理弹窗 -->
    <BaseModal :open="showManage" title="管理" width="sm" @close="showManage = false">
      <div class="flex gap-1 mb-4 border-b border-paper-100">
        <button
          class="px-3 py-2 text-xs font-medium transition-colors"
          :class="manageTab === 'targets' ? 'text-coral-500 border-b-2 border-coral-500' : 'text-paper-400'"
          @click="manageTab = 'targets'"
        >
          目标
        </button>
        <button
          class="px-3 py-2 text-xs font-medium transition-colors"
          :class="manageTab === 'templates' ? 'text-coral-500 border-b-2 border-coral-500' : 'text-paper-400'"
          @click="manageTab = 'templates'"
        >
          套餐
        </button>
        <button
          class="px-3 py-2 text-xs font-medium transition-colors"
          :class="manageTab === 'copy' ? 'text-coral-500 border-b-2 border-coral-500' : 'text-paper-400'"
          @click="manageTab = 'copy'"
        >
          复制
        </button>
      </div>

      <div v-if="manageTab === 'targets'">
        <p class="text-[11px] text-paper-400 mb-3">设定后汇总条显示进度 · 以下为「{{ store.activeProfile?.name ?? '我' }}」的目标</p>
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

      <div v-if="manageTab === 'templates'">
        <p class="text-[11px] text-paper-400 mb-3">以下为「{{ store.activeProfile?.name ?? '我' }}」的套餐</p>
        <div class="max-h-64 overflow-y-auto space-y-2 mb-3">
          <button
            v-for="tmpl in visibleTemplates"
            :key="tmpl.id"
            class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-coral-50 transition-colors flex items-center gap-3 border border-paper-300/60 bg-white/70"
            @click="applyTemplate(tmpl)"
          >
            <span class="text-lg">{{ tmpl.emoji || '🍽️' }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium">{{ tmpl.name }}</div>
              <div class="text-[11px] text-paper-400">{{ tmpl.items.length }} 种 · {{ mealTypeLabel(tmpl.defaultMealType) }}</div>
            </div>
            <span v-if="tmpl.isDefault" class="text-[10px] px-1.5 py-0.5 rounded-full bg-coral-100 text-coral-600">默认</span>
          </button>
          <div v-if="!visibleTemplates.length" class="text-center text-paper-400 py-6 text-sm">暂无套餐，点下方新建</div>
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

      <div v-if="manageTab === 'copy'">
        <p class="text-[11px] text-paper-400 mb-3">将某天的记录复制到当前日期</p>
        <button
          class="w-full px-3 py-2.5 rounded-xl text-sm font-medium border border-paper-300 text-paper-600 hover:bg-paper-50 transition-colors text-left"
          @click="showManage = false; modals.copyDay = true"
        >
          复制一整天的记录
        </button>
      </div>
    </BaseModal>

    <!-- 用户档案管理 -->
    <ProfileManagerModal
      :open="showProfileManager"
      :editing-id="editingProfileId"
      @close="showProfileManager = false"
      @edit="onProfileEdit"
    />
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
