<script setup lang="ts">
/** 收益汇总块：销售额 / 成本 / 利润。 */
import { formatEUR } from '@/shared/format';
import type { ProjectRevenueSummary } from '@/modules/revenue';

defineProps<{ summary: ProjectRevenueSummary; label?: string }>();
</script>

<template>
  <div class="qs-card p-5">
    <div v-if="label" class="qs-label mb-3">{{ label }}</div>
    <div class="grid grid-cols-3 gap-3 text-center">
      <div>
        <div class="text-[11px] text-paper-500">销售额</div>
        <div class="text-lg font-semibold tabular-nums mt-1">{{ formatEUR(summary.totalSales) }}</div>
      </div>
      <div>
        <div class="text-[11px] text-paper-500">成本</div>
        <div class="text-lg font-semibold tabular-nums mt-1 text-paper-600">{{ formatEUR(summary.totalCost) }}</div>
      </div>
      <div>
        <div class="text-[11px] text-paper-500">利润</div>
        <div class="text-lg font-semibold tabular-nums mt-1 text-coral-600">{{ formatEUR(summary.totalProfit) }}</div>
      </div>
    </div>
  </div>
</template>
