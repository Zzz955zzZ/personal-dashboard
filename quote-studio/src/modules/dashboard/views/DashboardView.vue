<script setup lang="ts">
/**
 * 数据看板（Cuadro de Mando）：首页板块之一。
 * - 核心指标 KPI（已内嵌盈利：已确认收益 / 利润 / 利润率）。
 * - 业务数据视图：表格 / 柱状图 / 折线图 三种模式可切换。
 * - 盈利明细：收益 vs 成本 vs 利润 对比 + 盈利最高的项目。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useProjectsStore, useRevenueStore, type Project } from '@/modules/revenue';
import { useQuotationStore, type Quotation } from '@/modules/quotation';
import { useSettingsStore } from '@/modules/settings';
import { formatEUR, formatDate } from '@/shared/format';
import { icon } from '@/shared/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BarChart from '../components/BarChart.vue';
import LineChart from '../components/LineChart.vue';

const router = useRouter();
const projectsStore = useProjectsStore();
const revenueStore = useRevenueStore();
const quotationStore = useQuotationStore();
const settings = useSettingsStore();

onMounted(() => {
  projectsStore.hydrate();
  revenueStore.hydrate();
  quotationStore.hydrate();
  settings.hydrate();
});

/* ---------------- 业务数据视图模式 ---------------- */
type ViewMode = 'table' | 'bar' | 'line';
const viewMode = ref<ViewMode>('table');
const viewOptions: { mode: ViewMode; icon: string; label: string }[] = [
  { mode: 'table', icon: 'table', label: '表格' },
  { mode: 'bar', icon: 'bar-chart', label: '柱状图' },
  { mode: 'line', icon: 'line-chart', label: '折线图' },
];

/* ---------------- 核心 KPI ---------------- */
const totalQuoted = computed(() =>
  quotationStore.quotations.reduce((s, q) => s + q.totalAmount, 0),
);
const confirmedRevenue = computed(() =>
  revenueStore.entries.reduce((s, e) => s + e.amount, 0),
);
const totalProfit = computed(() =>
  revenueStore.entries.reduce((s, e) => s + e.margin, 0),
);
const activeProjects = computed(() =>
  projectsStore.projects.filter((p) => p.status === 'active').length,
);
const totalProjects = computed(() => projectsStore.projects.length);
const profitRate = computed(() =>
  confirmedRevenue.value > 0 ? (totalProfit.value / confirmedRevenue.value) * 100 : 0,
);

/* ---------------- 盈利明细 ---------------- */
const portfolio = computed(() => projectsStore.portfolioSummary);
const maxProfitMetric = computed(() =>
  Math.max(portfolio.value.totalSales, portfolio.value.totalCost, portfolio.value.totalProfit, 1),
);

const profitByProject = computed(() => {
  const map = new Map<string, { sales: number; cost: number; profit: number }>();
  for (const e of revenueStore.entries) {
    const cur = map.get(e.projectId) ?? { sales: 0, cost: 0, profit: 0 };
    cur.sales += e.amount;
    cur.cost += e.cost;
    cur.profit += e.margin;
    map.set(e.projectId, cur);
  }
  return Array.from(map.entries())
    .map(([pid, v]) => ({ project: projectsStore.getProject(pid), ...v }))
    .filter((x) => x.project)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5) as Array<{ project: Project; sales: number; cost: number; profit: number }>;
});

/* ---------------- 月度序列（图表） ---------------- */
const monthlySeries = computed(() => {
  const map = new Map<string, { sales: number; profit: number }>();
  for (const e of revenueStore.entries) {
    const key = (e.recordedAt || '').slice(0, 7) || '—';
    const cur = map.get(key) ?? { sales: 0, profit: 0 };
    cur.sales += e.amount;
    cur.profit += e.margin;
    map.set(key, cur);
  }
  const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return {
    labels: sorted.map(([m]) => m),
    sales: sorted.map(([, v]) => v.sales),
    profit: sorted.map(([, v]) => v.profit),
  };
});

const hasChartData = computed(() => monthlySeries.value.labels.length > 0);

const chartSeries = computed(() => [
  { name: '收益', color: '#5c4f42', values: monthlySeries.value.sales },
  { name: '利润', color: '#7C9885', values: monthlySeries.value.profit },
]);

/* ---------------- 表格视图：全部报价单 ---------------- */
interface QuotationRow {
  q: Quotation;
  project: Project;
}
const allQuotations = computed(() => {
  const list: QuotationRow[] = [];
  for (const q of quotationStore.quotations) {
    const project = projectsStore.getProject(q.projectId);
    if (project) list.push({ q, project });
  }
  list.sort((a, b) => new Date(b.q.updatedAt).getTime() - new Date(a.q.updatedAt).getTime());
  return list;
});

/* ---------------- 最近报价 ---------------- */
const recentQuotations = computed(() => allQuotations.value.slice(0, 5));

/* ---------------- 分类占比 ---------------- */
const categoryBreakdown = computed(() => {
  const map = new Map<string, { name: string; amount: number; count: number }>();
  for (const q of quotationStore.quotations) {
    for (const it of q.items) {
      const g = settings.getCategoryGroup(it.categoryGroupId);
      if (!g) continue;
      const existing = map.get(g.id);
      if (existing) {
        existing.amount += it.lineTotal;
        existing.count += 1;
      } else {
        map.set(g.id, { name: g.name, amount: it.lineTotal, count: 1 });
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
});
const maxCategoryAmount = computed(() =>
  categoryBreakdown.value.length ? Math.max(...categoryBreakdown.value.map((c) => c.amount)) : 0,
);

function goToQuotation(projectId: string): void {
  void router.push({ name: 'quotation-edit', params: { projectId } });
}
</script>

<template>
  <div class="min-h-screen">
    <div class="px-8 sm:px-12 lg:px-16 pt-20 pb-8">
      <h1 class="font-display text-4xl sm:text-5xl text-ink">看板</h1>
    </div>

    <main class="px-8 sm:px-12 lg:px-16 pb-20 space-y-8">
      <!-- 核心指标（已内嵌盈利） -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card class="border-paper-200">
          <CardHeader class="pb-1 pt-6 px-6">
            <CardTitle class="text-[11px] font-normal uppercase tracking-wide text-paper-400">报价总额</CardTitle>
          </CardHeader>
          <CardContent class="pt-0 px-6 pb-6">
            <div class="text-4xl font-semibold tabular-nums text-ink tracking-tight">{{ formatEUR(totalQuoted) }}</div>
          </CardContent>
        </Card>

        <Card class="border-paper-200">
          <CardHeader class="pb-1 pt-6 px-6">
            <CardTitle class="text-[11px] font-normal uppercase tracking-wide text-paper-400">已确认收益</CardTitle>
          </CardHeader>
          <CardContent class="pt-0 px-6 pb-6">
            <div class="text-4xl font-semibold tabular-nums text-ink tracking-tight">{{ formatEUR(confirmedRevenue) }}</div>
          </CardContent>
        </Card>

        <Card class="border-paper-200">
          <CardHeader class="pb-1 pt-6 px-6">
            <CardTitle class="text-[11px] font-normal uppercase tracking-wide text-paper-400">利润</CardTitle>
          </CardHeader>
          <CardContent class="pt-0 px-6 pb-6">
            <div class="text-4xl font-semibold tabular-nums text-ink tracking-tight">{{ formatEUR(totalProfit) }}</div>
            <div class="text-[11px] text-paper-400 mt-1 tabular-nums">{{ profitRate.toFixed(1) }}% 利润率</div>
          </CardContent>
        </Card>

        <Card class="border-paper-200">
          <CardHeader class="pb-1 pt-6 px-6">
            <CardTitle class="text-[11px] font-normal uppercase tracking-wide text-paper-400">活跃项目</CardTitle>
          </CardHeader>
          <CardContent class="pt-0 px-6 pb-6">
            <div class="flex items-baseline gap-1.5">
              <span class="text-4xl font-semibold tabular-nums text-ink tracking-tight">{{ activeProjects }}</span>
              <span class="text-sm text-paper-400">/ {{ totalProjects }}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- 业务数据视图（表格 / 柱状图 / 折线图） -->
        <Card class="lg:col-span-2 border-paper-200">
          <CardHeader class="pb-3 pt-5 px-5 flex flex-row items-center justify-between gap-3">
            <CardTitle class="text-xs font-normal uppercase tracking-wide text-paper-400">业务数据</CardTitle>
            <div class="flex items-center gap-1 bg-paper-50 border border-paper-200 rounded-lg p-0.5">
              <button
                v-for="o in viewOptions"
                :key="o.mode"
                type="button"
                class="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors"
                :class="viewMode === o.mode
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-paper-400 hover:text-paper-600'"
                @click="viewMode = o.mode"
              >
                <span v-html="icon(o.icon)"></span>{{ o.label }}
              </button>
            </div>
          </CardHeader>
          <CardContent class="pt-0 px-6 pb-6">
            <!-- 表格视图 -->
            <div v-if="viewMode === 'table'">
              <div v-if="allQuotations.length === 0" class="text-center py-12 text-paper-400 text-sm">
                还没有报价单。
              </div>
              <div v-else class="overflow-x-auto -mx-5">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-[11px] uppercase tracking-wide text-paper-400 border-b border-paper-100">
                      <th class="text-left font-normal px-5 py-2">项目</th>
                      <th class="text-left font-normal px-3 py-2">客户</th>
                      <th class="text-right font-normal px-3 py-2">金额</th>
                      <th class="text-right font-normal px-3 py-2">利润</th>
                      <th class="text-left font-normal px-3 py-2">状态</th>
                      <th class="text-right font-normal px-5 py-2">日期</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-paper-100">
                    <tr
                      v-for="x in allQuotations"
                      :key="x.q.id"
                      class="hover:bg-paper-50/60 cursor-pointer transition-colors"
                      @click="goToQuotation(x.project.id)"
                    >
                      <td class="px-5 py-3 font-medium text-ink truncate max-w-[12rem]">{{ x.project.projectNo || x.project.name }}</td>
                      <td class="px-3 py-3 text-paper-500 truncate max-w-[8rem]">{{ x.project.clientName || '无客户' }}</td>
                      <td class="px-3 py-3 text-right tabular-nums text-ink">{{ formatEUR(x.q.totalAmount) }}</td>
                      <td class="px-3 py-3 text-right tabular-nums text-paper-600">{{ formatEUR(x.q.totalMargin) }}</td>
                      <td class="px-3 py-3">
                        <span
                          class="text-[10px] px-2 py-0.5 rounded-full"
                          :class="x.q.status === 'confirmed' ? 'bg-paper-100 text-paper-600' : 'bg-white border border-paper-200 text-paper-400'"
                        >{{ x.q.status === 'confirmed' ? '已确认' : '草稿' }}</span>
                      </td>
                      <td class="px-5 py-3 text-right text-paper-400 tabular-nums text-xs">{{ formatDate(x.q.updatedAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 柱状图 -->
            <div v-else-if="viewMode === 'bar'">
              <div v-if="!hasChartData" class="text-center py-12 text-paper-400 text-sm">暂无收益数据，确认报价后将自动统计。</div>
              <div v-else>
                <BarChart :labels="monthlySeries.labels" :series="chartSeries" />
                <div class="flex items-center justify-center gap-5 mt-2 text-xs text-paper-500">
                  <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-sm" style="background:#5c4f42"></span>收益</span>
                  <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-sm" style="background:#7C9885"></span>利润</span>
                </div>
              </div>
            </div>

            <!-- 折线图 -->
            <div v-else>
              <div v-if="!hasChartData" class="text-center py-12 text-paper-400 text-sm">暂无收益数据，确认报价后将自动统计。</div>
              <div v-else>
                <LineChart :labels="monthlySeries.labels" :series="chartSeries" />
                <div class="flex items-center justify-center gap-5 mt-2 text-xs text-paper-500">
                  <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-sm" style="background:#5c4f42"></span>收益</span>
                  <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-sm" style="background:#7C9885"></span>利润</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 分类占比 -->
        <Card class="border-paper-200">
          <CardHeader class="pb-3 pt-6 px-6">
            <CardTitle class="text-xs font-normal uppercase tracking-wide text-paper-400">分类占比</CardTitle>
          </CardHeader>
          <CardContent class="pt-0 px-6 pb-6">
            <div v-if="categoryBreakdown.length === 0" class="text-center py-12 text-paper-400 text-sm">
              暂无分类数据。
            </div>
            <div v-else class="space-y-4">
              <div v-for="c in categoryBreakdown" :key="c.name">
                <div class="flex items-center justify-between text-xs mb-1.5">
                  <span class="text-ink truncate">{{ c.name }}</span>
                  <span class="text-paper-400 tabular-nums shrink-0 ml-2">{{ formatEUR(c.amount) }}</span>
                </div>
                <div class="h-1 w-full bg-paper-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-[#5c4f42] rounded-full"
                    :style="{ width: maxCategoryAmount > 0 ? `${(c.amount / maxCategoryAmount) * 100}%` : '0%' }"
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- 盈利明细（内嵌盈利指标） -->
        <Card class="lg:col-span-2 border-paper-200">
          <CardHeader class="pb-3 pt-6 px-6">
            <CardTitle class="text-xs font-normal uppercase tracking-wide text-paper-400">盈利明细</CardTitle>
          </CardHeader>
          <CardContent class="pt-0 px-6 pb-6 space-y-5">
            <!-- 收益 / 成本 / 利润 对比 -->
            <div class="grid grid-cols-3 gap-3">
              <div>
                <div class="text-[11px] uppercase tracking-wide text-paper-400 mb-1">收益</div>
                <div class="h-1.5 w-full bg-paper-100 rounded-full overflow-hidden">
                  <div class="h-full bg-[#5c4f42] rounded-full" :style="{ width: `${(portfolio.totalSales / maxProfitMetric) * 100}%` }"></div>
                </div>
                <div class="text-sm font-semibold tabular-nums text-ink mt-1.5">{{ formatEUR(portfolio.totalSales) }}</div>
              </div>
              <div>
                <div class="text-[11px] uppercase tracking-wide text-paper-400 mb-1">成本</div>
                <div class="h-1.5 w-full bg-paper-100 rounded-full overflow-hidden">
                  <div class="h-full bg-[#C9A36B] rounded-full" :style="{ width: `${(portfolio.totalCost / maxProfitMetric) * 100}%` }"></div>
                </div>
                <div class="text-sm font-semibold tabular-nums text-ink mt-1.5">{{ formatEUR(portfolio.totalCost) }}</div>
              </div>
              <div>
                <div class="text-[11px] uppercase tracking-wide text-paper-400 mb-1">利润</div>
                <div class="h-1.5 w-full bg-paper-100 rounded-full overflow-hidden">
                  <div class="h-full bg-[#7C9885] rounded-full" :style="{ width: `${(portfolio.totalProfit / maxProfitMetric) * 100}%` }"></div>
                </div>
                <div class="text-sm font-semibold tabular-nums text-ink mt-1.5">{{ formatEUR(portfolio.totalProfit) }}</div>
              </div>
            </div>

            <!-- 盈利最高的项目 -->
            <div>
              <div class="text-[11px] uppercase tracking-wide text-paper-400 mb-2">盈利最高的项目</div>
              <div v-if="profitByProject.length === 0" class="text-center py-8 text-paper-400 text-sm">
                暂无盈利数据。
              </div>
              <div v-else class="divide-y divide-paper-100">
                <div v-for="x in profitByProject" :key="x.project.id" class="flex items-center justify-between py-2.5">
                  <div class="min-w-0">
                    <div class="text-sm font-medium text-ink truncate">{{ x.project.projectNo || x.project.name }}</div>
                    <div class="text-[11px] text-paper-400 mt-0.5">
                      {{ x.project.clientName || '无客户' }} · 利润率 {{ x.sales > 0 ? ((x.profit / x.sales) * 100).toFixed(1) : '0.0' }}%
                    </div>
                  </div>
                  <div class="text-right shrink-0 ml-4">
                    <div class="text-sm font-semibold tabular-nums text-ink">{{ formatEUR(x.profit) }}</div>
                    <div class="text-[11px] text-paper-400 tabular-nums">{{ formatEUR(x.sales) }} 收益</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 最近报价 -->
        <Card class="border-paper-200">
          <CardHeader class="pb-3 pt-6 px-6">
            <CardTitle class="text-xs font-normal uppercase tracking-wide text-paper-400">最近报价</CardTitle>
          </CardHeader>
          <CardContent class="pt-0 px-6 pb-6">
            <div v-if="recentQuotations.length === 0" class="text-center py-12 text-paper-400 text-sm">
              还没有报价单。
            </div>
            <div v-else class="divide-y divide-paper-100">
              <button
                v-for="x in recentQuotations"
                :key="x.q.id"
                class="w-full flex items-center justify-between py-3.5 text-left hover:bg-paper-50/60 -mx-5 px-5 transition-colors"
                @click="goToQuotation(x.project.id)"
              >
                <div class="min-w-0">
                  <div class="text-sm font-medium text-ink truncate">{{ x.project.name }}</div>
                  <div class="text-[11px] text-paper-400 mt-0.5">
                    {{ x.project.clientName || '无客户' }} · {{ formatDate(x.q.updatedAt) }}
                  </div>
                </div>
                <div class="text-right shrink-0 ml-4">
                  <div class="text-sm font-semibold tabular-nums text-ink">{{ formatEUR(x.q.totalAmount) }}</div>
                  <div
                    class="text-[10px] mt-0.5"
                    :class="x.q.status === 'confirmed' ? 'text-paper-600' : 'text-paper-400'"
                  >
                    {{ x.q.status === 'confirmed' ? '已确认' : '草稿' }}
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>
