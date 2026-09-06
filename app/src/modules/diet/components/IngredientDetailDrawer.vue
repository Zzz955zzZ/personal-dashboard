<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { CAT_DEFS, mealTypeLabel } from '../constants';
import { catClass, classifyTag, fmt1, healthTags, micronGroups, unitLabel } from '../engine';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';
import { useUndo } from '@/shared/composables/use-undo';
import { selectOnFocus } from '@/shared/utils/input';
import type { Ingredient, LogEntry } from '../types';

const store = useDietStore();
const { selectedIng, pickerContext, clearPickerContext, foodTab } = useDietUi();
const { pushUndo, pushToast } = useUndo();

const emit = defineEmits<{ edit: [ing: Ingredient]; close: [] }>();

/* ==================== picker 模式：添加到记录 ==================== */
const addQty = ref(100);
const addUnit = ref<'g' | '个'>('g');
const isPicker = computed(() => pickerContext.value !== null);

watch(
  () => selectedIng.value,
  (ing) => {
    if (!ing) return;
    // 沿用当前用户上次记录该食材所用的单位；无记录则回退食材默认单位
    addUnit.value = store.getLastUnit(ing.id);
    addQty.value = addUnit.value === '个' ? 1 : 100;
  },
  { immediate: true },
);

function computedGrams(): number {
  if (!selectedIng.value) return 0;
  const qty = Number(addQty.value) || 0;
  if (addUnit.value === '个') return qty * (Number(selectedIng.value.gramsPerUnit) || 50);
  return qty;
}

function confirmAdd(): void {
  if (!pickerContext.value || !selectedIng.value) return;
  const ctx = pickerContext.value;
  const ing = selectedIng.value;
  const added = store.addLogEntry(ctx.date, {
    ingredientId: ing.id,
    amount: computedGrams(),
    mealType: ctx.mealType,
    unit: addUnit.value,
  });
  clearPickerContext();
  selectedIng.value = null;
  foodTab.value = 'dailylog';
  // 撤回：移除刚加入的条目并回补库存，8 秒内可撤销误加
  pushUndo(`已添加 ${ing.name}`, () => {
    const list = store.getDayLog(ctx.date);
    const idx = list.indexOf(added);
    if (idx > -1) {
      list.splice(idx, 1);
      store.restorePantry(added.ingredientId, added.amount);
    }
  });
}

function cancelAdd(): void {
  selectedIng.value = null;
}

function close(): void {
  selectedIng.value = null;
  emit('close');
}

function perUnit(v: number | undefined, grams: number): string {
  return fmt1(((v || 0) * grams) / 100);
}

function onEdit(): void {
  if (!selectedIng.value) return;
  const ing = selectedIng.value;
  selectedIng.value = null;
  emit('edit', ing);
}

function onDelete(): void {
  if (!selectedIng.value) return;
  const ing = selectedIng.value;
  if (store.isSeedIngredient(ing.id)) {
    pushToast('系统默认食材不可删除');
    return;
  }
  // 捕获被级联删除的记录，撤销时一并恢复，避免留下孤儿数据
  const removedLogs: Record<string, LogEntry[]> = {};
  for (const date of Object.keys(store.dailyLogs)) {
    const rs = store.dailyLogs[date]!.filter((e) => e.ingredientId === ing.id);
    if (rs.length) removedLogs[date] = rs;
  }
  const idx = store.ingredients.findIndex((x) => x.id === ing.id);
  const removedCount = store.deleteIngredient(ing.id);
  selectedIng.value = null;
  pushUndo(`已删除 ${ing.name}${removedCount ? ` 及 ${removedCount} 条记录` : ''}`, () => {
    store.ingredients.splice(idx < 0 ? store.ingredients.length : idx, 0, ing);
    for (const [date, rs] of Object.entries(removedLogs)) {
      store.dailyLogs[date]!.push(...rs);
    }
  });
}
</script>

<template>
  <transition name="slide">
    <aside v-if="selectedIng" class="fixed inset-0 z-50" @click="close()">
      <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      <div
        class="absolute right-0 top-0 h-full w-[420px] max-w-[92vw] bg-coral-50 border-l border-paper-300/60 p-7 overflow-y-auto"
        @click.stop
      >
        <button class="text-paper-400 hover:text-ink transition-colors text-sm float-right" @click="close()">✕ 关闭</button>
        <div class="clear-both pt-2">
          <div class="avatar-img mx-auto mb-3" style="width: 80px; height: 80px; font-size: 38px">
            <img v-if="selectedIng.image" :src="selectedIng.image" alt="" />
            <span v-else>{{ selectedIng.emoji || '?' }}</span>
          </div>
          <h3 class="font-display text-3xl text-center">{{ selectedIng.name }}</h3>
          <div class="text-[11px] tracking-wide2 uppercase text-paper-500 text-center mt-1">
            {{ CAT_DEFS[selectedIng.category]?.label }}
          </div>
          <div v-if="selectedIng.brand" class="text-sm text-coral-500 text-center mt-0.5">
            {{ selectedIng.brand }}
          </div>
          <div class="h-px bg-paper-300/60 my-6"></div>

          <div class="mb-6">
            <div class="text-xs uppercase tracking-wide2 text-paper-500 mb-3">营养数据 / 每 100g</div>
            <div class="grid grid-cols-2 gap-2">
              <div class="p-3 rounded-xl border border-paper-300/60 bg-white/70 text-center">
                <div class="text-[11px] text-paper-400">热量</div>
                <div class="text-lg font-semibold text-coral-500">{{ fmt1(selectedIng.nutrition?.calories) }} <span class="text-xs font-normal">kcal</span></div>
              </div>
              <div class="p-3 rounded-xl border border-paper-300/60 bg-white/70 text-center">
                <div class="text-[11px] text-paper-400">碳水</div>
                <div class="text-lg font-semibold text-yellow-500">{{ fmt1(selectedIng.nutrition?.carbs) }} <span class="text-xs font-normal">g</span></div>
              </div>
              <div class="p-3 rounded-xl border border-paper-300/60 bg-white/70 text-center">
                <div class="text-[11px] text-paper-400">蛋白质</div>
                <div class="text-lg font-semibold text-blue-500">{{ fmt1(selectedIng.nutrition?.protein) }} <span class="text-xs font-normal">g</span></div>
              </div>
              <div class="p-3 rounded-xl border border-paper-300/60 bg-white/70 text-center">
                <div class="text-[11px] text-paper-400">脂肪</div>
                <div class="text-lg font-semibold text-purple-500">{{ fmt1(selectedIng.nutrition?.fat) }} <span class="text-xs font-normal">g</span></div>
              </div>
            </div>
            <p v-if="selectedIng.unit === '个'" class="mt-3 text-[11px] text-paper-500 text-center leading-relaxed">
              每 {{ selectedIng.gramsPerUnit || 50 }}g（1{{ unitLabel(selectedIng) }}）：≈
              {{ perUnit(selectedIng.nutrition?.calories, selectedIng.gramsPerUnit || 50) }} kcal ·
              碳水 {{ perUnit(selectedIng.nutrition?.carbs, selectedIng.gramsPerUnit || 50) }}g ·
              蛋白 {{ perUnit(selectedIng.nutrition?.protein, selectedIng.gramsPerUnit || 50) }}g ·
              脂肪 {{ perUnit(selectedIng.nutrition?.fat, selectedIng.gramsPerUnit || 50) }}g
            </p>
          </div>

          <div class="mb-6">
            <div class="text-xs uppercase tracking-wide2 text-paper-500 mb-3">营养标签</div>

            <div v-if="healthTags(selectedIng).length" class="flex flex-wrap gap-1.5 mb-2.5">
              <span v-for="ht in healthTags(selectedIng)" :key="ht.text" class="px-2.5 py-1 rounded-full text-xs font-medium border" :class="ht.cls">
                {{ ht.text }}
              </span>
            </div>

            <div v-if="micronGroups(selectedIng).length">
              <div v-for="grp in micronGroups(selectedIng)" :key="grp.cat" class="mb-2">
                <div class="text-[10px] uppercase tracking-wide2 text-paper-400 mb-1">{{ grp.cat }}</div>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="n in grp.items" :key="n" class="px-2.5 py-1 rounded-full text-xs font-medium border" :class="catClass(grp.cat)">
                    {{ n }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="(selectedIng.tags || []).length" class="flex flex-wrap gap-1.5">
              <span v-for="t in selectedIng.tags" :key="t" class="px-2.5 py-1 rounded-full text-xs font-medium border" :class="catClass(classifyTag(t))">
                {{ t }}
              </span>
            </div>
          </div>

          <p v-if="selectedIng.note" class="text-sm text-paper-600 font-light leading-relaxed">{{ selectedIng.note }}</p>

          <!-- picker 模式：数量 + 单位 + 确认添加 -->
          <div v-if="isPicker" class="mt-8 sticky bottom-0 -mx-7 -mb-7 p-7 bg-coral-50/95 backdrop-blur border-t border-paper-300/60">
            <div class="text-sm font-medium text-ink mb-3">
              加入 {{ pickerContext ? mealTypeLabel(pickerContext.mealType) : '' }}
            </div>
            <div class="flex items-center gap-2 mb-4">
              <input
                v-model.number="addQty"
                type="number"
                min="0.1"
                step="0.1"
                @focus="selectOnFocus"
                class="flex-1 px-4 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
              />
              <div class="flex rounded-xl border border-paper-300/60 bg-white overflow-hidden">
                <button
                  type="button"
                  class="px-3 py-2.5 text-sm font-medium transition-colors"
                  :class="addUnit === 'g' ? 'bg-coral-400 text-white' : 'text-paper-500 hover:bg-paper-50'"
                  @click="addUnit = 'g'"
                >
                  g
                </button>
                <button
                  type="button"
                  class="px-3 py-2.5 text-sm font-medium transition-colors"
                  :class="addUnit === '个' ? 'bg-coral-400 text-white' : 'text-paper-500 hover:bg-paper-50'"
                  @click="addUnit = '个'"
                >
                  个
                </button>
              </div>
            </div>
            <div class="flex gap-3">
              <button
                class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-paper-300 bg-white hover:bg-coral-50 transition-colors"
                @click="cancelAdd"
              >
                取消
              </button>
              <button
                class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-coral-400 text-white hover:opacity-90 transition-opacity"
                @click="confirmAdd"
              >
                确认添加
              </button>
            </div>
          </div>

          <!-- 普通模式：编辑 / 删除 -->
          <div v-else class="mt-8 sticky bottom-0 -mx-7 -mb-7 p-7 bg-coral-50/95 backdrop-blur border-t border-paper-300/60 flex gap-3">
            <button
              v-if="!store.isSeedIngredient(selectedIng.id)"
              class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-paper-300 bg-white hover:bg-coral-50 transition-colors"
              @click="onEdit"
            >
              ✎ 编辑
            </button>
            <button
              v-if="!store.isSeedIngredient(selectedIng.id)"
              class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
              @click="onDelete"
            >
              删除
            </button>
            <div v-if="store.isSeedIngredient(selectedIng.id)" class="w-full text-center text-xs text-paper-400 py-2">系统默认食材，不可编辑或删除</div>
          </div>
        </div>
      </div>
    </aside>
  </transition>
</template>
