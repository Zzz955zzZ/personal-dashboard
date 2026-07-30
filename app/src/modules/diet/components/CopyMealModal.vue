<script setup lang="ts">
/**
 * 复制单个餐次。
 *
 * v1.0 是从中文标签反解出 mealType（`copyMealLabel.replace(...)`），既脆又难读。
 * 这里改为由调用方直接把 MealType 传进来。
 */
import { computed, ref, watch } from 'vue';

import BaseModal from '@/shared/components/BaseModal.vue';
import { MEAL_TYPES, mealTypeLabel, tomorrowStr } from '../constants';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';
import { useUndo } from '@/shared/composables/use-undo';
import type { MealType } from '../types';

const props = defineProps<{ open: boolean; sourceMeal: MealType }>();
const emit = defineEmits<{ close: [] }>();

const store = useDietStore();
const { logDate } = useDietUi();
const { pushUndo } = useUndo();

const targetDate = ref(tomorrowStr());
const targetMeal = ref<MealType>('breakfast');

const sourceLabel = computed(() => mealTypeLabel(props.sourceMeal));
const sourceCount = computed(() => store.mealEntries(logDate.value, props.sourceMeal).length);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    targetDate.value = tomorrowStr();
    targetMeal.value = props.sourceMeal;
  },
);

function execute(): void {
  if (!targetDate.value || !sourceCount.value) return;
  const to = targetDate.value;
  const { count, revert } = store.copyMeal(logDate.value, props.sourceMeal, to, targetMeal.value);
  pushUndo(`复制 ${count} 条${sourceLabel.value}`, revert);
  emit('close');
  logDate.value = to;
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="`📋 复制「${sourceLabel}」`"
    width="md"
    :closable="false"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <div class="text-[11px] text-paper-400">来源 {{ logDate }} · 共 {{ sourceCount }} 条</div>

      <div>
        <label class="text-[11px] uppercase tracking-wide2 text-paper-500 block mb-1">目标日期</label>
        <input
          v-model="targetDate"
          type="date"
          class="w-full px-4 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
        />
      </div>

      <div>
        <label class="text-[11px] uppercase tracking-wide2 text-paper-500 block mb-1">目标餐次</label>
        <select
          v-model="targetMeal"
          class="w-full px-4 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
        >
          <option v-for="m in MEAL_TYPES" :key="m.key" :value="m.key">{{ m.icon }} {{ m.label }}</option>
        </select>
      </div>

      <div class="flex gap-3 mt-1">
        <button
          type="button"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-paper-300 hover:bg-coral-50"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          type="button"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-coral-400 text-white hover:opacity-90 disabled:opacity-40"
          :disabled="!sourceCount"
          @click="execute"
        >
          确认复制
        </button>
      </div>
    </div>
  </BaseModal>
</template>
