<script setup lang="ts">
/**
 * 报价单预览 + 导出菜单。
 * 参考 Nicolas Fuster 格式：公司抬头、项目信息条、分类表格、小计、合计黑底、页脚。
 * 产品照片在对应项目下方大图展示。
 */
import { computed, ref, watch } from 'vue';

import type { Quotation, QuoteItem } from '@/modules/quotation';
import type { Project } from '@/modules/revenue';
import { useSettingsStore } from '@/modules/settings';
import { computeQuoteTotals } from '@/modules/quotation/totals';
import { formatEUR, formatDate } from '@/shared/format';
import { icon } from '@/shared/icons';
import { exportQuotationToExcel } from '@/shared/excel';
import BaseModal from '@/shared/components/BaseModal.vue';
import { Button } from '@/components/ui/button';

const props = defineProps<{
  open: boolean;
  project: Project;
  quotation: Quotation;
}>();
const emit = defineEmits<{ close: [] }>();

const settings = useSettingsStore();

const selectedGroupIds = ref<string[]>([]);
const filterOpen = ref(false);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      // 默认全选所有大类
      selectedGroupIds.value = groups.value.map((g) => g.id);
      filterOpen.value = false;
    }
  },
);

const groups = computed(() =>
  settings.categoryGroups.slice().sort((a, b) => a.order - b.order),
);

const groupOptions = computed(() =>
  groups.value.map((g) => ({
    value: g.id,
    label: g.nameEs ? `${g.name} / ${g.nameEs}` : g.name,
  })),
);

const filteredItems = computed(() => {
  const groupSet = new Set(selectedGroupIds.value);
  if (groupSet.size === 0) return [];
  return props.quotation.items.filter((it) => groupSet.has(it.categoryGroupId));
});

const allSelected = computed(
  () => groups.value.length > 0 && selectedGroupIds.value.length === groups.value.length,
);
const hasSelection = computed(() => selectedGroupIds.value.length > 0);

function selectAll(): void {
  selectedGroupIds.value = groups.value.map((g) => g.id);
}
function clearAll(): void {
  selectedGroupIds.value = [];
}

const visibleGroups = computed(() => {
  const byGroup = new Map<string, QuoteItem[]>();
  for (const it of filteredItems.value) {
    if (!byGroup.has(it.categoryGroupId)) byGroup.set(it.categoryGroupId, []);
    byGroup.get(it.categoryGroupId)!.push(it);
  }
  return groups.value
    .filter((g) => byGroup.has(g.id))
    .map((g) => ({ group: g, items: byGroup.get(g.id)! }));
});

const filteredQuotation = computed<Quotation>(() => {
  const items = filteredItems.value;
  const totalAmount = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const totalCost = items.reduce((sum, it) => sum + it.cost * it.quantity, 0);
  const totalMargin = items.reduce((sum, it) => sum + it.margin * it.quantity, 0);
  return { ...props.quotation, items, totalAmount, totalCost, totalMargin };
});

/* 含折扣/逐行税率的整单汇总 */
const totals = computed(() => computeQuoteTotals(filteredItems.value));
const blendedIva = computed(() => {
  const base = totals.value.base;
  return base > 0 ? (totals.value.iva / base) * 100 : filteredQuotation.value.vatRate;
});
const dtoPct = computed(() =>
  totals.value.neto > 0 ? (totals.value.dto / totals.value.neto) * 100 : 0,
);

const accentBg = computed(() =>
  settings.settings.pdfTemplate.accentColor === 'brown' ? 'bg-[#5C4F42]' : 'bg-[#1A1A1A]',
);
const accentBorder = computed(() =>
  settings.settings.pdfTemplate.accentColor === 'brown' ? 'border-[#5C4F42]' : 'border-[#1A1A1A]',
);
const accentText = computed(() =>
  settings.settings.pdfTemplate.accentColor === 'brown' ? 'text-[#5C4F42]' : 'text-[#1A1A1A]',
);

function exportExcel(): void {
  exportQuotationToExcel({
    quotation: filteredQuotation.value,
    project: props.project,
    company: settings.companyProfile,
    groups: settings.categoryGroups,
  });
}

function printPdf(): void {
  requestAnimationFrame(() => window.print());
}

function downloadPdf(): void {
  const printArea = document.querySelector('.print-area');
  if (!printArea) return;

  const styles: string[] = [];
  for (const tag of document.querySelectorAll('style')) styles.push(tag.outerHTML);
  for (const tag of document.querySelectorAll('link[rel="stylesheet"]')) styles.push(tag.outerHTML);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>报价单 ${props.quotation.quoteNumber || ''}</title>
  ${styles.join('\n')}
</head>
<body>
  ${printArea.outerHTML}
  <script>
    window.onload = function () { setTimeout(function () { window.print(); }, 200); };
    window.onafterprint = function () { window.close(); };
  <\/script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
}

function groupSubtotal(items: QuoteItem[]): number {
  return items.reduce((sum, it) => sum + it.lineTotal, 0);
}

function toggleGroup(groupId: string): void {
  const set = new Set(selectedGroupIds.value);
  if (set.has(groupId)) set.delete(groupId);
  else set.add(groupId);
  selectedGroupIds.value = Array.from(set);
}
</script>

<template>
  <BaseModal :open="open" title="报价单预览" width="full" scrollable @close="emit('close')">
    <div class="space-y-4">
      <!-- 导出菜单 -->
      <div class="no-print flex flex-wrap items-center gap-2 pb-4 border-b border-paper-200">
        <Button variant="secondary" size="sm" @click="exportExcel">
          <span v-html="icon('download')"></span> 导出 Excel
        </Button>
        <Button variant="secondary" size="sm" @click="printPdf">
          <span v-html="icon('printer')"></span> 打印
        </Button>
        <Button variant="secondary" size="sm" @click="downloadPdf">
          <span v-html="icon('doc')"></span> 下载 PDF
        </Button>
      </div>

      <!-- 分类筛选（可延展下拉栏） -->
      <div class="no-print">
        <button
          type="button"
          class="flex items-center gap-2 text-sm px-3.5 py-2 rounded-lg border border-paper-200 bg-white hover:border-paper-300 transition-colors"
          @click="filterOpen = !filterOpen"
        >
          <span v-html="icon('filter')" class="text-paper-500"></span>
          <span class="text-ink font-medium">
            {{ allSelected ? '全部大类' : (hasSelection ? '已筛选 ' + selectedGroupIds.length + ' 项' : '未选择') }}
          </span>
          <span
            v-html="icon('chevron-right')"
            class="text-paper-400 transition-transform duration-200"
            :class="filterOpen ? 'rotate-90' : ''"
          ></span>
        </button>

        <div v-if="filterOpen" class="mt-2 p-3 border border-paper-200 rounded-lg bg-paper-50/50">
          <div class="flex items-center justify-between mb-2.5">
            <span class="text-[11px] uppercase tracking-wide text-paper-400">选择大类</span>
            <div class="flex gap-1.5">
              <button
                type="button"
                class="text-[11px] px-2 py-0.5 rounded border border-paper-200 hover:bg-white text-paper-500 transition-colors"
                @click="selectAll"
              >全选</button>
              <button
                type="button"
                class="text-[11px] px-2 py-0.5 rounded border border-paper-200 hover:bg-white text-paper-500 transition-colors"
                @click="clearAll"
              >清空</button>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="o in groupOptions"
              :key="o.value"
              type="button"
              class="text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5"
              :class="selectedGroupIds.includes(o.value)
                ? 'bg-ink text-white border-ink'
                : 'bg-white text-paper-500 border-paper-200 hover:border-paper-300'"
              @click="toggleGroup(o.value)"
            >
              <span v-if="selectedGroupIds.includes(o.value)" v-html="icon('check')" class="text-white"></span>
              {{ o.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- 打印区域 -->
      <div class="print-area bg-white text-ink p-6 sm:p-8">
        <!-- 页眉：品牌信息 + 报价单信息 -->
        <header class="flex flex-col gap-4 pb-5 border-b-2" :class="accentBorder">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-4 min-w-0">
              <img
                v-if="settings.settings.pdfTemplate.showLogo && settings.companyProfile.logoUrl"
                :src="settings.companyProfile.logoUrl"
                alt="logo"
                class="h-20 w-auto object-contain shrink-0"
              />
              <div class="min-w-0">
                <div class="text-2xl font-bold tracking-wide text-ink">{{ settings.companyProfile.name || '工作室' }}</div>
                <div v-if="settings.companyProfile.slogan" class="text-sm text-paper-500 mt-1">
                  {{ settings.companyProfile.slogan }}
                </div>
              </div>
            </div>
            <div class="text-right text-xs text-paper-600 leading-relaxed max-w-xs shrink-0">
              <div v-if="settings.companyProfile.address">{{ settings.companyProfile.address }}</div>
              <div v-if="settings.companyProfile.phone || settings.companyProfile.email">
                {{ [settings.companyProfile.phone, settings.companyProfile.email].filter(Boolean).join(' · ') }}
              </div>
              <div v-if="settings.companyProfile.taxId">NIF/CIF: {{ settings.companyProfile.taxId }}</div>
            </div>
          </div>

          <!-- 报价单信息卡 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="p-3 rounded bg-paper-50 border border-paper-200">
              <div class="text-[10px] uppercase tracking-wide text-paper-400 mb-1">Presupuesto / 报价单</div>
              <div class="text-lg font-bold tabular-nums" :class="accentText">{{ filteredQuotation.quoteNumber || '—' }}</div>
              <div class="text-xs text-paper-500 mt-1">Fecha / 日期：{{ formatDate(filteredQuotation.updatedAt) }}</div>
            </div>
            <div class="p-3 rounded bg-paper-50 border border-paper-200 space-y-1">
              <div v-if="filteredQuotation.projectNo || project.projectNo" class="text-xs">
                <span class="text-paper-400">Proyecto / 项目：</span>
                <span class="font-medium">{{ filteredQuotation.projectNo || project.projectNo }}</span>
              </div>
              <div class="text-xs">
                <span class="text-paper-400">Cliente / 客户：</span>
                <span class="font-medium">{{ filteredQuotation.clientName || project.clientName || '—' }}</span>
              </div>
              <div v-if="filteredQuotation.address || project.address" class="text-xs">
                <span class="text-paper-400">Dirección / 地址：</span>
                <span class="font-medium">{{ filteredQuotation.address || project.address }}</span>
              </div>
            </div>
          </div>
        </header>

        <!-- 分类表格 -->
        <div class="mt-6 space-y-5">
          <section v-for="(pg, gi) in visibleGroups" :key="pg.group.id">
            <h3 class="text-sm font-bold border-b border-paper-300 pb-1 mb-2 flex justify-between">
              <span>{{ String(gi + 1).padStart(2, '0') }} · {{ pg.group.name }} / {{ pg.group.nameEs }}</span>
            </h3>
            <table class="w-full text-[11pt] border-collapse">
              <thead>
                <tr class="text-white text-left" :class="accentBg">
                  <th class="px-2 py-1.5 font-semibold w-[3%]">#</th>
                  <th class="px-2 py-1.5 font-semibold w-[8%]">Foto</th>
                  <th class="px-2 py-1.5 font-semibold w-[18%]">Concepto / 项目</th>
                  <th class="px-2 py-1.5 font-semibold w-[12%]">Modelo / 型号</th>
                  <th class="px-2 py-1.5 font-semibold w-[16%]">Descripción / 描述</th>
                  <th class="px-2 py-1.5 font-semibold w-[10%]">Link(s) / 链接</th>
                  <th class="px-2 py-1.5 font-semibold w-[11%] text-right">Precio / 售价</th>
                  <th class="px-2 py-1.5 font-semibold w-[10%] text-right">Cant. / 数量</th>
                  <th class="px-2 py-1.5 font-semibold w-[10%] text-right">Total / 小计</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(it, ii) in pg.items" :key="it.id" class="border-b border-paper-100 align-top">
                  <td class="px-2 py-2">{{ String(gi + 1) }}.{{ String(ii + 1) }}</td>
                  <td class="px-2 py-2">
                    <img
                      v-if="it.photoUrls[0]"
                      :src="it.photoUrls[0]"
                      class="h-16 w-16 object-cover rounded border border-paper-200"
                      :alt="`${it.name} 照片`"
                    />
                    <span v-else class="text-paper-300 text-xs">—</span>
                  </td>
                  <td class="px-2 py-2">
                    <div class="font-medium">{{ it.name }}</div>
                    <div v-if="it.nameEs" class="text-[9pt] text-paper-500">{{ it.nameEs }}</div>
                  </td>
                  <td class="px-2 py-2 text-paper-600">{{ it.model || '—' }}</td>
                  <td class="px-2 py-2 text-paper-600">{{ it.customerNote || '—' }}</td>
                  <td class="px-2 py-2">
                    <div v-if="it.links.length === 0" class="text-paper-300 text-xs">—</div>
                    <div v-else class="flex flex-col gap-0.5">
                      <a
                        v-for="(url, idx) in it.links"
                        :key="idx"
                        :href="url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-[9pt] text-coral-700 hover:underline truncate max-w-[120px]"
                        :title="url"
                      >🔗 {{ url }}</a>
                    </div>
                  </td>
                  <td class="px-2 py-2 text-right tabular-nums">
                    <div>{{ formatEUR(it.salePrice) }}</div>
                    <div class="text-[9pt] text-paper-500">/ {{ it.salePriceUnit || it.unit || '—' }}</div>
                  </td>
                  <td class="px-2 py-2 text-right tabular-nums">
                    <div>{{ it.quantity }}</div>
                    <div class="text-[9pt] text-paper-500">{{ it.unit }}</div>
                  </td>
                  <td class="px-2 py-2 text-right font-semibold tabular-nums">{{ formatEUR(it.lineTotal) }}</td>
                </tr>
                <tr class="bg-[#F0EDE6] font-bold">
                  <td colspan="8" class="px-2 py-2 text-right">Subtotal {{ pg.group.name }}</td>
                  <td class="px-2 py-2 text-right tabular-nums">{{ formatEUR(groupSubtotal(pg.items)) }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <div v-if="visibleGroups.length === 0" class="text-center text-sm text-paper-500 py-10 border border-dashed border-paper-300 rounded">
            未选择任何大类，请展开上方筛选栏并勾选要显示的分类。
          </div>
        </div>

        <!-- 合计 -->
        <div
          v-if="visibleGroups.length > 0"
          class="mt-6 rounded-lg p-4 text-white"
          :class="accentBg"
        >
          <div class="flex justify-between py-1 text-sm">
            <span class="text-white/70">Neto / 税前小计</span>
            <span class="font-semibold tabular-nums">{{ formatEUR(totals.neto) }}</span>
          </div>
          <div class="flex justify-between py-1 text-sm">
            <span class="text-white/70">Dto {{ dtoPct.toFixed(1) }}% / 折扣</span>
            <span class="font-semibold tabular-nums">- {{ formatEUR(totals.dto) }}</span>
          </div>
          <div class="flex justify-between py-1 text-sm">
            <span class="text-white/70">Base Imponible / 折后税前</span>
            <span class="font-semibold tabular-nums">{{ formatEUR(totals.base) }}</span>
          </div>
          <div class="flex justify-between py-1 text-sm">
            <span class="text-white/70">IVA {{ blendedIva.toFixed(1) }}% / 增值税</span>
            <span class="font-semibold tabular-nums">{{ formatEUR(totals.iva) }}</span>
          </div>
          <div class="flex justify-between pt-2 mt-1 border-t border-dashed border-white/30 text-lg font-bold">
            <span>TOTAL CON IVA / 含税总价</span>
            <span class="tabular-nums">{{ formatEUR(totals.total) }}</span>
          </div>
        </div>

        <!-- 备注 -->
        <div v-if="quotation.notes" class="mt-4 p-3 bg-paper-50 border-l-4 border-[#3d342b] text-xs text-paper-600">
          <strong>Notas / 说明：</strong><br />
          {{ quotation.notes }}
        </div>

        <!-- 页脚 -->
        <footer v-if="settings.settings.pdfTemplate.showFooter" class="mt-8 pt-4 border-t border-paper-200 text-[9pt] text-paper-500 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div class="text-[10px] uppercase tracking-wide text-paper-400 mb-0.5">Validez / 有效期</div>
            <div>本报价单自开具之日起 {{ quotation.validityDays }} 个自然日内有效。</div>
          </div>
          <div>
            <div class="text-[10px] uppercase tracking-wide text-paper-400 mb-0.5">Condiciones / 条款</div>
            <div v-if="settings.companyProfile.footerNote">{{ settings.companyProfile.footerNote }}</div>
            <div v-else>付款方式与交付期以双方约定为准。</div>
          </div>
          <div>
            <div class="text-[10px] uppercase tracking-wide text-paper-400 mb-0.5">Contacto / 联系</div>
            <div>
              {{ settings.companyProfile.name }}<br />
              <span v-if="settings.companyProfile.phone">{{ settings.companyProfile.phone }}</span>
              <span v-if="settings.companyProfile.email"> · {{ settings.companyProfile.email }}</span>
              <span v-if="settings.companyProfile.website"> · {{ settings.companyProfile.website }}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
@media print {
  .print-area {
    padding: 12mm !important;
  }
}
</style>
