<script setup lang="ts">
/**
 * 快速记账弹窗
 *
 * 支持金额、分类（带图标）、备注、日期。
 * 收入/支出切换，常用分类快捷选。
 */
import { computed, onMounted, ref, watch } from 'vue';

import { useFinanceStore } from '../store/finance-store';
import { categoriesByType } from '../constants';
import type { TxnType } from '../types';

const props = defineProps<{
  open: boolean;
  initialType?: TxnType;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'close'): void;
}>();

const store = useFinanceStore();

const type = ref<TxnType>('expense');
const amount = ref('');
const category = ref('');
const description = ref('');
const date = ref(new Date().toISOString().slice(0, 10));

function reset(): void {
  type.value = props.initialType || 'expense';
  amount.value = '';
  category.value = '';
  description.value = '';
  date.value = new Date().toISOString().slice(0, 10);
}

watch(
  () => props.open,
  (v) => {
    if (v) reset();
  },
);

onMounted(() => {
  if (props.open) reset();
});

/** 当前类型可选的分类 */
const currentCategories = computed(() => categoriesByType(type.value));

/** 切换类型时重置分类 */
watch(type, () => {
  category.value = '';
});

function selectCategory(key: string): void {
  category.value = key;
}

function save(): void {
  const amt = parseFloat(amount.value);
  if (!amount.value.trim() || isNaN(amt) || amt <= 0) return;
  if (!category.value) return;

  store.addTxn({
    type: type.value,
    amount: Math.round(amt * 100) / 100,
    category: category.value,
    description: description.value.trim(),
    date: date.value,
  });

  emit('save');
}
</script>

<template>
  <Teleport to="body">
    <transition name="slide-up">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center" @click.self="emit('close')">
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/60" @click="emit('close')" />

        <!-- 弹窗 -->
        <div class="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
          <!-- 标题栏 + 类型切换 -->
          <div class="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 class="text-lg font-bold text-ink">记一笔</h3>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-paper-100 text-paper-400 transition-colors"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>

          <!-- 收入/支出 切换 -->
          <div class="px-5 flex gap-2 mb-4">
            <button
              class="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              :class="
                type === 'expense'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-red-50 text-red-500 border border-red-200'
              "
              @click="type = 'expense'"
            >
              支出
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              :class="
                type === 'income'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-green-50 text-green-600 border border-green-200'
              "
              @click="type = 'income'"
            >
              收入
            </button>
          </div>

          <!-- 金额输入 -->
          <div class="px-5 mb-4">
            <div class="flex items-baseline gap-1">
              <span
                class="text-4xl font-bold tabular-nums"
                :class="type === 'expense' ? 'text-red-500' : 'text-green-600'"
              >
                {{ type === 'expense' ? '-' : '+' }}
              </span>
            <input
                v-model="amount"
                type="text"
                inputmode="decimal"
                pattern="[0-9.]*"
                enterkeyhint="done"
                placeholder="0.00"
                class="flex-1 text-4xl font-bold tabular-nums outline-none bg-transparent"
                :class="type === 'expense' ? 'text-red-500' : 'text-green-600'"
              />
            </div>
          </div>

          <!-- 分类网格 -->
          <div class="px-5 mb-4">
            <label class="block text-xs font-medium text-paper-500 mb-2">选择分类</label>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="cat in currentCategories"
                :key="cat.key"
                class="flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all"
                :class="
                  category === cat.key
                    ? type === 'expense'
                      ? 'border-red-300 bg-red-50 text-red-600'
                      : 'border-green-300 bg-green-50 text-green-600'
                    : 'border-paper-200 hover:border-paper-300 text-paper-600'
                "
                @click="selectCategory(cat.key)"
              >
                <span class="text-xl leading-none">{{ cat.emoji }}</span>
                <span class="text-[10px] leading-tight">{{ cat.label }}</span>
              </button>
            </div>
          </div>

          <!-- 备注 -->
          <div class="px-5 mb-4">
            <input
              v-model="description"
              type="text"
              placeholder="添加备注..."
              class="w-full px-4 py-2.5 rounded-xl border border-paper-200 text-base sm:text-sm text-ink outline-none focus:border-amber-400 transition-colors placeholder:text-paper-400"
              maxlength="100"
            />
          </div>

          <!-- 日期 -->
          <div class="px-5 mb-4">
            <input
              v-model="date"
              type="date"
              class="w-full px-4 py-2.5 rounded-xl border border-paper-200 text-base sm:text-sm text-ink outline-none cursor-pointer"
            />
          </div>

          <!-- 保存按钮 -->
          <div class="px-5 pb-6 pt-1">
            <button
              class="w-full py-3.5 rounded-2xl text-base font-bold text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-40"
              :class="type === 'expense' ? 'bg-red-500 hover:bg-red-400' : 'bg-green-600 hover:bg-green-500'"
              :disabled="!amount.trim() || !category || parseFloat(amount) <= 0"
              @click="save"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.tabular-nums {
  font-feature-settings: 'tnum' on, 'lnum' on;
}

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
