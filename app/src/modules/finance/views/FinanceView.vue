<script setup lang="ts">
/**
 * 记账主视图
 *
 * 鲨鱼记账风格：月度收支概览 + 分类快捷入口 + 日分组流水列表。
 */
import { computed, onMounted, ref } from 'vue';

import { useFinanceStore } from '../store/finance-store';
import { CATEGORIES, categoriesByType } from '../constants';
import TransactionFormModal from '../components/TransactionFormModal.vue';

const store = useFinanceStore();

const showForm = ref(false);
const formType = ref<'expense' | 'income'>('expense');

onMounted(() => {
  store.hydrate();
});

/** 月份选项 */
const monthOptions = computed(() => {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = -6; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value: v, label: `${d.getFullYear()}年${d.getMonth() + 1}月` });
  }
  return opts.reverse();
});

function openAdd(type: 'expense' | 'income'): void {
  formType.value = type;
  showForm.value = true;
}

function onSaved(): void {
  showForm.value = false;
}

function getCategory(key: string) {
  return CATEGORIES.find((c) => c.key === key);
}

function fmt(n: number): string {
  return n.toFixed(n % 1 === 0 ? 0 : 1);
}
</script>

<template>
  <div class="min-h-screen bg-amber-50">
    <!-- 月度概览卡片 -->
    <div class="bg-gradient-to-br from-amber-400 to-amber-500 px-4 sm:px-5 pt-4 sm:pt-6 pb-5 sm:pb-8 rounded-b-3xl shadow-sm">
      <div class="flex items-center justify-between mb-3 sm:mb-4">
        <select
          v-model="store.currentMonth"
          class="bg-white/20 border-0 rounded-lg px-3 py-1.5 text-sm font-medium text-white outline-none cursor-pointer backdrop-blur"
        >
          <option
            v-for="m in monthOptions"
            :key="m.value"
            :value="m.value"
            class="text-ink"
          >
            {{ m.label }}
          </option>
        </select>
        <button
          class="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors text-lg"
          title="搜索"
        >
          🔍
        </button>
      </div>

      <!-- 收支大数字 -->
      <div class="flex items-end gap-4 sm:gap-6">
        <div>
          <div class="text-[11px] sm:text-xs text-white/70 font-medium">收入</div>
          <div class="text-xl sm:text-2xl font-bold text-white tabular-nums">{{ fmt(store.stats.income) }}</div>
        </div>
        <div>
          <div class="text-[11px] sm:text-xs text-white/70 font-medium">支出</div>
          <div class="text-xl sm:text-2xl font-bold text-white tabular-nums">{{ fmt(store.stats.expense) }}</div>
        </div>
        <div class="ml-auto text-right">
          <div class="text-[11px] sm:text-xs text-white/70 font-medium">结余</div>
          <div
            class="text-lg sm:text-xl font-bold tabular-nums"
            :class="store.stats.balance >= 0 ? 'text-white' : 'text-red-100'"
          >
            {{ fmt(store.stats.balance) }}
          </div>
        </div>
      </div>

      <!-- 快捷分类入口 -->
      <div class="grid grid-cols-5 gap-1.5 sm:gap-2 mt-3 sm:mt-5">
        <button
          v-for="cat in categoriesByType('expense').slice(0, 10)"
          :key="cat.key"
          class="flex flex-col items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
          @click="openAdd('expense')"
        >
          <span class="text-lg leading-none">{{ cat.emoji }}</span>
          <span class="text-[10px] text-white/90 leading-tight">{{ cat.label }}</span>
        </button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="px-4 sm:px-5 pt-3 sm:pt-4 pb-2">
      <input
        v-model="store.searchQuery"
        type="text"
        placeholder="搜索交易记录..."
        class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white border border-amber-200/60 text-sm text-ink outline-none focus:border-amber-400 transition-colors placeholder:text-paper-400"
      />
    </div>

    <!-- 筛选条：类型切换 -->
    <div class="px-4 sm:px-5 pb-3 flex items-center gap-2">
      <button
        class="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all"
        :class="
          store.filterType === 'all'
            ? 'bg-amber-500 text-white shadow-sm'
            : 'bg-white text-paper-600 border border-amber-200/60'
        "
        @click="store.filterType = 'all'"
      >
        全部
      </button>
      <button
        class="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all"
        :class="
          store.filterType === 'expense'
            ? 'bg-red-500 text-white shadow-sm'
            : 'bg-white text-paper-600 border border-amber-200/60'
        "
        @click="store.filterType = 'expense'"
      >
        支出
      </button>
      <button
        class="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all"
        :class="
          store.filterType === 'income'
            ? 'bg-green-600 text-white shadow-sm'
            : 'bg-white text-paper-600 border border-amber-200/60'
        "
        @click="store.filterType = 'income'"
      >
        收入
      </button>
    </div>

    <!-- 日分组流水 -->
    <div class="px-4 sm:px-5 pb-20 sm:pb-24 space-y-3 sm:space-y-5">
      <div v-for="group in store.dayGroups" :key="group.date" class="space-y-0">
        <!-- 日期头 -->
        <div class="flex items-center justify-between sticky top-0 bg-amber-50/95 backdrop-blur py-1 z-10">
          <span class="text-xs font-semibold text-paper-700">
            {{ group.date.slice(5).replace('-', '月') + '日' }} · {{ group.weekday }}
          </span>
          <span class="text-xs text-paper-500 tabular-nums">
            支出: {{ fmt(group.totalExpense) }}
            <template v-if="group.totalIncome > 0"> / 收入: {{ fmt(group.totalIncome) }}</template>
          </span>
        </div>

        <!-- 交易列表 -->
        <div class="space-y-1.5">
          <div
            v-for="txn in group.txns"
            :key="txn.id"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-amber-100/50 shadow-sm group"
          >
            <!-- 分类图标 -->
            <span class="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-50 text-base shrink-0">
              {{ getCategory(txn.category)?.emoji || '📌' }}
            </span>

            <!-- 信息 -->
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-ink truncate">
                {{ getCategory(txn.category)?.label || txn.category }}
                <span v-if="txn.description" class="text-paper-400 font-normal ml-1">
                  · {{ txn.description }}
                </span>
              </div>
            </div>

            <!-- 金额 -->
            <span
              class="text-sm font-bold tabular-nums shrink-0"
              :class="txn.type === 'income' ? 'text-green-600' : 'text-ink'"
            >
              {{ txn.type === 'income' ? '+' : '-' }}{{ fmt(txn.amount) }}
            </span>

            <!-- 删除按钮 -->
            <button
              class="w-6 h-6 flex items-center justify-center rounded text-paper-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-xs shrink-0"
              @click="store.deleteTxn(txn.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="store.dayGroups.length === 0"
        class="flex flex-col items-center justify-center py-16 text-paper-400"
      >
        <span class="text-4xl mb-3">📝</span>
        <span class="text-sm font-medium">还没有记录</span>
        <span class="text-xs mt-1">点击下方 + 开始记账</span>
      </div>
    </div>

    <!-- FAB 浮动按钮 -->
    <div class="fixed bottom-5 right-5 flex flex-col items-end gap-2 z-30">
      <button
        class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-400 active:scale-95 transition-all flex items-center justify-center text-xl sm:text-2xl"
        title="记收入"
        @click="openAdd('income')"
      >
        +
      </button>
      <button
        class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-400 active:scale-95 transition-all flex items-center justify-center text-xl sm:text-2xl"
        title="记支出"
        @click="openAdd('expense')"
      >
        −
      </button>
    </div>

    <!-- 记账弹窗 -->
    <TransactionFormModal
      :open="showForm"
      :initial-type="formType"
      @save="onSaved"
      @close="showForm = false"
    />
  </div>
</template>
