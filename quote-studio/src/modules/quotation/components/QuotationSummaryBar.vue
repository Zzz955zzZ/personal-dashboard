<script setup lang="ts">
/** 整单汇总条：含税总额 / 进价合计 / 利润。含折扣(dto%)与逐行税率(iva%)。客户视图仅显示应付总额。 */
import { computed } from 'vue';
import { formatEUR } from '@/shared/format';
import type { Quotation } from '@/modules/quotation';
import { computeQuoteTotals } from '@/modules/quotation/totals';

const props = defineProps<{ quotation: Quotation; isCustomer: boolean }>();

const totals = computed(() => computeQuoteTotals(props.quotation.items));
const itemCount = () => props.quotation.items.length;
</script>

<template>
  <div class="qs-card p-4 sm:p-5">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div class="text-[11px] text-paper-500">
          {{ isCustomer ? '应付总额（含税）' : '报价总额（含税）' }}（共 {{ itemCount() }} 项）
        </div>
        <div class="text-2xl font-bold tabular-nums">{{ formatEUR(totals.total) }}</div>
      </div>
      <template v-if="!isCustomer">
        <div class="text-right">
          <div class="text-[11px] text-paper-500">进价合计</div>
          <div class="text-lg font-semibold tabular-nums text-paper-600">{{ formatEUR(totals.cost) }}</div>
        </div>
        <div class="text-right">
          <div class="text-[11px] text-paper-500">利润</div>
          <div class="text-lg font-semibold tabular-nums text-ink">{{ formatEUR(totals.profit) }}</div>
        </div>
      </template>
    </div>
  </div>
</template>
