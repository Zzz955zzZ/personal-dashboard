<script setup lang="ts">
/**
 * 大类表格 / 新增大类占位。
 * 添加产品：在表格内展开下拉选择行（类似大类选择），选中模板后立即插入一行；
 * 提供「录入新产品」选项插入空白行；同一模板可重复选择多次。
 */
import { computed, ref } from 'vue';

import type { CategoryGroup, ProductTemplate } from '@/modules/settings';
import type { QuoteItem } from '@/modules/quotation';
import { formatEUR } from '@/shared/format';
import { icon } from '@/shared/icons';
import QuoteItemRow from './QuoteItemRow.vue';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

interface Option { value: string; label: string }

const props = defineProps<{
  group: CategoryGroup | null;
  items: QuoteItem[];
  qid: string;
  isCustomer: boolean;
  groupOptions?: Option[];
}>();

const emit = defineEmits<{
  'add-templates': [groupId: string, templates: ProductTemplate[]];
  'select-group': [groupId: string];
  'remove-group': [groupId: string];
}>();

const groupTotal = computed(() => props.items.reduce((s, it) => s + it.lineTotal, 0));
const groupProfit = computed(() => props.items.reduce((s, it) => s + it.margin * it.quantity, 0));

/* ---- 新增大类选择（shadcn Select）---- */
const selectedNewGroup = ref('');
function onSelectNewGroup(val: string): void {
  if (val) emit('select-group', val);
  selectedNewGroup.value = '';
}

/* ---- 行内产品模板下拉选择 ---- */
const showProductSelect = ref(false);
const selectedProductId = ref('');
const addedHint = ref('');
let hintTimer: ReturnType<typeof setTimeout> | null = null;

function emptyTemplate(): ProductTemplate {
  return {
    id: '',
    name: '',
    nameEs: '',
    model: '',
    note: '',
    defaultCost: 0,
    defaultSalePrice: 0,
    defaultUnit: '',
    photoUrls: [],
  };
}

function onSelectProduct(val: string): void {
  if (!props.group) return;
  if (val === '__new__') {
    emit('add-templates', props.group.id, [emptyTemplate()]);
    flashHint('已添加空白产品行');
  } else if (val) {
    const t = props.group.products.find((p) => p.id === val);
    if (t) {
      emit('add-templates', props.group.id, [t]);
      flashHint(`已添加「${t.name || '未命名模板'}」`);
    }
  }
  selectedProductId.value = '';
  // 保持展开，方便连续添加同一产品；Select 关闭后用户可再次点开
}

function flashHint(text: string): void {
  addedHint.value = text;
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    addedHint.value = '';
  }, 1500);
}

function toggleProductSelect(): void {
  showProductSelect.value = !showProductSelect.value;
  selectedProductId.value = '';
}
</script>

<template>
  <section class="qs-card overflow-hidden">
    <!-- 大类标题 -->
    <div class="flex items-center justify-between gap-3 px-4 py-3 bg-paper-50/60 border-b border-paper-200/70 min-h-[46px]">
      <template v-if="group">
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-paper-200 text-paper-700 text-[11px] font-semibold shrink-0">
            {{ String(group.order).padStart(2, '0') }}
          </span>
          <h3 class="font-semibold text-sm text-ink truncate">
            {{ group.name }} <span class="text-paper-400 font-normal">/ {{ group.nameEs }}</span>
          </h3>
        </div>
        <div v-if="!isCustomer" class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            class="text-[11px] text-paper-400 hover:text-red-600 hover:bg-red-50/70 inline-flex items-center justify-center w-7 h-7 rounded transition-colors"
            title="移除此大类"
            @click="emit('remove-group', group.id)"
          >
            <span v-html="icon('x')"></span>
          </button>
        </div>
      </template>

      <!-- 新增大类占位 -->
      <template v-else>
        <div class="flex items-center gap-2 flex-1">
          <span v-html="icon('plus')" class="text-paper-400"></span>
          <Select v-model="selectedNewGroup" @update:model-value="onSelectNewGroup">
            <SelectTrigger class="border-paper-300 bg-white text-ink w-auto min-w-[220px]">
              <SelectValue placeholder="选择大类…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="o in (groupOptions ?? [])"
                :key="o.value"
                :value="o.value"
                class="data-[highlighted]:bg-paper-100"
              >
                {{ o.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </template>
    </div>

    <div v-if="group">
      <!-- 统一产品表：admin 字段作为同列表格列，确保水平线严格对齐；外层使用浏览器原生横向滚动 -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse min-w-[720px]">
          <thead>
            <tr class="bg-paper-50/80 text-paper-500 text-[11px] uppercase tracking-wide border-b border-paper-200">
              <th class="px-3 py-2.5 text-left font-medium w-24">状态</th>
              <th class="px-4 py-2.5 text-left font-medium w-14">照片</th>
              <th class="px-4 py-2.5 text-left font-medium min-w-[140px]">产品</th>
              <th class="px-4 py-2.5 text-left font-medium min-w-[120px]">型号</th>
              <th class="px-4 py-2.5 text-left font-medium min-w-[160px]">备注</th>
              <th v-if="isCustomer" class="px-4 py-2.5 text-left font-medium min-w-[160px]">链接</th>
              <th class="px-4 py-2.5 text-left font-medium w-36">售价</th>
              <th class="px-4 py-2.5 text-left font-medium w-28">数量</th>
              <th class="px-4 py-2.5 text-left font-medium w-24">小计</th>
              <th v-if="!isCustomer" class="px-4 py-2.5 text-left font-medium min-w-[140px] border-l border-paper-200 bg-paper-50/60">内部备注</th>
              <th v-if="!isCustomer" class="px-4 py-2.5 text-left font-medium w-20 border-l border-paper-200 bg-paper-50/60">进价</th>
              <th v-if="!isCustomer" class="px-4 py-2.5 text-left font-medium w-20 border-l border-paper-200 bg-paper-50/60 whitespace-nowrap">DTO%</th>
              <th v-if="!isCustomer" class="px-4 py-2.5 text-left font-medium w-20 border-l border-paper-200 bg-paper-50/60 whitespace-nowrap">IVA%</th>
              <th v-if="!isCustomer" class="px-4 py-2.5 text-left font-medium w-20 border-l border-paper-200 bg-paper-50/60">利润</th>
              <th v-if="!isCustomer" class="px-4 py-2.5 text-left font-medium min-w-[160px] border-l border-paper-200 bg-paper-50/60">链接</th>
            </tr>
          </thead>
          <tbody>
            <QuoteItemRow
              v-for="it in items"
              :key="it.id"
              :item="it"
              :qid="qid"
              :is-customer="isCustomer"
            />
            <tr v-if="items.length === 0 && !showProductSelect">
              <td :colspan="isCustomer ? 9 : 14" class="px-4 py-8 text-sm text-paper-400">
                <div class="flex items-center gap-2">
                  <span>该分类暂无产品。</span>
                  <button v-if="!isCustomer" class="text-ink underline underline-offset-2" @click="toggleProductSelect">添加一个</button>
                </div>
              </td>
            </tr>

            <!-- 展开状态：行内产品模板下拉选择 -->
            <tr v-if="!isCustomer && showProductSelect" class="bg-paper-50/60 border-b border-paper-200">
              <td :colspan="isCustomer ? 9 : 14" class="px-4 py-2.5">
                <div class="flex items-center gap-3">
                  <Select :model-value="selectedProductId" @update:model-value="onSelectProduct">
                    <SelectTrigger class="h-8 text-xs border-paper-200 bg-white hover:border-paper-300 min-w-[240px] max-w-sm">
                      <SelectValue placeholder="选择产品模板…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="t in group.products"
                        :key="t.id"
                        :value="t.id"
                        class="text-xs"
                      >
                        {{ t.name || '未命名模板' }}{{ t.model ? ' · ' + t.model : '' }} · {{ formatEUR(t.defaultSalePrice) }}{{ t.defaultUnit ? ' / ' + t.defaultUnit : '' }}
                      </SelectItem>
                      <SelectItem disabled value="__sep__" class="text-xs py-0 h-px bg-paper-200 pointer-events-none" />
                      <SelectItem value="__new__" class="text-xs font-medium text-coral-700">+ 录入空白新产品</SelectItem>
                    </SelectContent>
                  </Select>
                  <span v-if="addedHint" class="text-[11px] text-coral-700 animate-pulse">{{ addedHint }}</span>
                  <button
                    type="button"
                    class="text-[11px] text-paper-500 hover:text-ink px-2 py-1 rounded hover:bg-paper-100 transition-colors"
                    @click="showProductSelect = false"
                  >
                    取消
                  </button>
                </div>
              </td>
            </tr>

            <tr class="bg-paper-50 border-t border-paper-200 font-medium text-ink">
              <td :colspan="isCustomer ? 8 : 7" class="px-4 py-3 text-right text-xs uppercase tracking-wide text-paper-500">
                Subtotal {{ group.name }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatEUR(groupTotal) }}</td>
              <td v-if="!isCustomer" class="px-4 py-3 border-l border-paper-200"></td>
              <td v-if="!isCustomer" class="px-4 py-3 border-l border-paper-200"></td>
              <td v-if="!isCustomer" class="px-4 py-3 border-l border-paper-200"></td>
              <td v-if="!isCustomer" class="px-4 py-3 border-l border-paper-200"></td>
              <td v-if="!isCustomer" class="px-4 py-3 border-l border-paper-200 text-right tabular-nums text-xs">{{ formatEUR(groupProfit) }}</td>
              <td v-if="!isCustomer" class="px-4 py-3 border-l border-paper-200"></td>
            </tr>

            <!-- 收起状态：点击展开下拉选择 -->
            <tr v-if="!isCustomer && !showProductSelect" class="border-b border-paper-100">
              <td :colspan="isCustomer ? 9 : 14" class="px-3 py-1.5">
                <button
                  type="button"
                  class="flex items-center gap-1.5 text-[11px] text-paper-400 hover:text-ink py-1 px-2 rounded border border-paper-200 hover:border-paper-300 hover:bg-paper-50 transition-colors"
                  @click="toggleProductSelect"
                >
                  <span v-html="icon('plus')"></span> 添加产品
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
