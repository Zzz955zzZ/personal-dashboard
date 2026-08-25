<script setup lang="ts">
/**
 * 产品行 —— 桌面端表格行。
 * 管理态：所有字段内联编辑；客户视图：只读。
 * 状态列：空态使用极简虚线加号；设置后显示紧凑色块。
 * 照片框：空态仅保留图标，无文字水印；支持悬停/聚焦行后 Ctrl+V 粘贴截图。
 * admin 字段（内部备注、成本、利润）作为同列表格列，确保水平线严格对齐。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useQuotationStore, type QuoteItem } from '@/modules/quotation';
import { useSettingsStore } from '@/modules/settings';
import { formatEUR } from '@/shared/format';
import { icon } from '@/shared/icons';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

const props = defineProps<{
  item: QuoteItem;
  qid: string;
  isCustomer: boolean;
}>();

const store = useQuotationStore();
const settings = useSettingsStore();

const fileInput = ref<HTMLInputElement | null>(null);
const pendingStatus = ref<string | null>(null);
const rowRef = ref<HTMLTableRowElement | null>(null);
const isRowHovered = ref(false);

function update(field: keyof QuoteItem, value: string | number | string[]): void {
  store.updateItem(props.qid, props.item.id, { [field]: value } as Partial<QuoteItem>);
}

/* 使用 v-model 计算属性绑定输入框，确保复制/粘贴/剪切完全可用 */
const nameModel = computed({ get: () => props.item.name, set: (v: string) => update('name', v) });
const modelModel = computed({ get: () => props.item.model, set: (v: string) => update('model', v) });
const customerNoteModel = computed({
  get: () => props.item.customerNote,
  set: (v: string) => update('customerNote', v),
});
const salePriceModel = computed({
  get: () => props.item.salePrice,
  set: (v: number) => update('salePrice', Number(v)),
});
const quantityModel = computed({
  get: () => props.item.quantity,
  set: (v: number) => update('quantity', Number(v)),
});
const unitModel = computed({ get: () => props.item.unit, set: (v: string) => update('unit', v) });
const internalNoteModel = computed({
  get: () => props.item.internalNote,
  set: (v: string) => update('internalNote', v),
});
const costModel = computed({ get: () => props.item.cost, set: (v: number) => update('cost', Number(v)) });
const dtoPctModel = computed({
  get: () => props.item.dtoPct,
  set: (v: number) => update('dtoPct', Number(v)),
});
const ivaPctModel = computed({
  get: () => props.item.ivaPct,
  set: (v: number) => update('ivaPct', Number(v)),
});

/* 售价单位（缺省回退 defaultSalePriceUnit → defaultUnit） */
const salePriceUnitModel = computed({
  get: () => props.item.salePriceUnit || settings.settings.defaultSalePriceUnit || settings.settings.defaultUnit,
  set: (v: string) => update('salePriceUnit', v),
});

/* 数量步进器 */
function stepQty(delta: number): void {
  const next = Math.max(1, (Number(props.item.quantity) || 1) + delta);
  update('quantity', next);
}

function onRemove(): void {
  if (window.confirm(`删除产品「${props.item.name}」？`)) {
    store.removeItem(props.qid, props.item.id);
  }
}

function onPhotoFile(e: Event): void {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  readPhotoFile(f);
}

function pushPhotoUrl(url: string): void {
  if (!url || props.item.photoUrls.includes(url)) return;
  update('photoUrls', [...props.item.photoUrls, url]);
}

function readPhotoFile(f: File): void {
  const reader = new FileReader();
  reader.onload = () => pushPhotoUrl(String(reader.result || ''));
  reader.readAsDataURL(f);
}

function onPhotoPaste(e: ClipboardEvent): void {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const it of items) {
    if (it.type.startsWith('image/')) {
      const file = it.getAsFile();
      if (file) readPhotoFile(file);
    }
  }
}

function removePhoto(idx: number): void {
  const urls = props.item.photoUrls.filter((_, i) => i !== idx);
  update('photoUrls', urls);
}

function onWindowPaste(e: ClipboardEvent): void {
  if (e.defaultPrevented) return;
  const items = e.clipboardData?.items;
  if (!items || !Array.from(items).some((it) => it.type.startsWith('image/'))) return;

  const active = document.activeElement;
  const activeTag = active?.tagName?.toLowerCase();
  if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

  const focusInRow = rowRef.value && active && rowRef.value.contains(active);
  if (!focusInRow && !isRowHovered.value) return;

  e.preventDefault();
  e.stopImmediatePropagation();
  onPhotoPaste(e);
}

onMounted(() => window.addEventListener('paste', onWindowPaste));
onBeforeUnmount(() => window.removeEventListener('paste', onWindowPaste));

function selectStatusOption(statusId: string): void {
  if (statusId === props.item.statusId) {
    pendingStatus.value = null;
    return;
  }
  pendingStatus.value = statusId;
}

function confirmStatusChange(): void {
  if (pendingStatus.value === null) return;
  update('statusId', pendingStatus.value);
  pendingStatus.value = null;
}

function cancelStatusChange(): void {
  pendingStatus.value = null;
}

function statusName(id: string): string {
  return settings.getProductStatus(id)?.name || id;
}

function statusColor(id: string): string {
  return settings.getProductStatus(id)?.color || '#5C4F42';
}

/** hex → rgba（用于整行背景浅色）。 */
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(60,52,43,${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const rowTint = computed<string>(() =>
  props.item.statusId ? hexToRgba(statusColor(props.item.statusId), 0.12) : '',
);
</script>

<template>
  <!-- 主表格行：admin 字段作为同列表格列 -->
  <tr
    ref="rowRef"
    class="border-b border-paper-200/60 align-middle hover:bg-paper-50/50"
    :style="{ backgroundColor: rowTint }"
    @mouseenter="isRowHovered = true"
    @mouseleave="isRowHovered = false"
  >
    <!-- 状态（最左列）-->
    <td class="px-3 py-3 w-24 align-middle">
      <DropdownMenuRoot v-if="!isCustomer">
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded w-full"
            :class="
              item.statusId
                ? 'text-white'
                : 'h-6 justify-center text-paper-400 border border-dashed border-paper-300 hover:border-paper-400 hover:text-ink'
            "
            :style="{ backgroundColor: item.statusId ? statusColor(item.statusId) : 'transparent' }"
            :title="item.statusId ? '点击修改状态' : '设置状态'"
          >
            <template v-if="item.statusId">
              <span class="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0"></span>
              <span class="truncate">{{ statusName(item.statusId) }}</span>
            </template>
            <span v-else v-html="icon('plus')"></span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>选择状态</DropdownMenuLabel>
            <DropdownMenuItem
              v-for="s in settings.settings.productStatusOptions"
              :key="s.id"
              @select="selectStatusOption(s.id)"
            >
              <span class="inline-block w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: s.color }"></span>
              <span class="truncate">{{ s.name }}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @select="selectStatusOption('')">
              <span class="inline-block w-2 h-2 rounded-full shrink-0 border border-paper-300"></span>
              <span>清除状态</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
      <div v-else-if="item.statusId" class="flex items-center">
        <span
          class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          :style="{ backgroundColor: statusColor(item.statusId) }"
          :title="statusName(item.statusId)"
        ></span>
      </div>
    </td>

    <!-- 照片：主区域预览/粘贴，右下角小按钮触发文件上传 -->
    <td class="px-4 py-3 w-14">
      <div class="relative w-11 h-11">
        <div
          class="relative w-full h-full rounded bg-paper-100 overflow-hidden flex items-center justify-center shrink-0 hover:bg-paper-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[#8c7b6b]"
          :class="item.photoUrls[0] ? '' : 'cursor-default'"
          title="悬停该行后 Ctrl+V 可粘贴截图"
          tabindex="0"
        >
          <img v-if="item.photoUrls[0]" :src="item.photoUrls[0]" :alt="item.name" class="w-full h-full object-cover" />
          <span
            v-if="item.photoUrls.length > 1"
            class="absolute bottom-0 right-0 bg-[#3d342b] text-white text-[9px] px-1 rounded-tl"
          >
            {{ item.photoUrls.length }}
          </span>
          <span v-else class="text-paper-300 scale-90" v-html="icon('catalog')"></span>
        </div>
        <button
          type="button"
          class="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border border-paper-200 shadow-sm flex items-center justify-center text-paper-500 hover:text-ink hover:border-paper-300"
          title="上传照片"
          @click.stop="fileInput?.click()"
        >
          <span class="scale-75" v-html="icon('plus')"></span>
        </button>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPhotoFile" />
      </div>
    </td>

    <!-- 产品 -->
    <td class="px-4 py-3 min-w-[140px]">
      <template v-if="!isCustomer">
        <Input
          v-focus-next
          v-model="nameModel"
          placeholder="产品名称"
          class="h-7 px-1 py-0 text-sm font-medium border-paper-200 bg-white"
        />
      </template>
      <span v-else class="text-sm font-medium text-ink">{{ item.name }}</span>
    </td>

    <!-- 型号 -->
    <td class="px-4 py-3 min-w-[120px]">
      <template v-if="!isCustomer">
        <Input
          v-focus-next
          v-model="modelModel"
          placeholder="型号"
          class="h-7 px-1 py-0 text-sm border-paper-200 bg-white"
        />
      </template>
      <span v-else class="text-sm text-paper-600">{{ item.model || '—' }}</span>
    </td>

    <!-- 备注 -->
    <td class="px-4 py-3 min-w-[160px]">
      <template v-if="!isCustomer">
        <Input
          v-focus-next
          v-model="customerNoteModel"
          placeholder="备注"
          class="h-7 px-1 py-0 text-sm border-paper-200 bg-white"
        />
      </template>
      <span v-else class="text-sm text-paper-600">{{ item.customerNote || '—' }}</span>
    </td>

    <!-- 售价 -->
    <td class="px-4 py-3 w-36 text-left">
      <template v-if="!isCustomer">
        <div class="flex items-center gap-1">
          <Input
            v-focus-next
            v-model="salePriceModel"
            type="number"
            step="0.01"
            min="0"
            class="w-20 h-7 px-1 py-0 text-sm tabular-nums text-left border-paper-200 bg-white"
          />
          <Select v-model="salePriceUnitModel">
            <SelectTrigger
              class="h-7 text-[11px] border-paper-200 bg-transparent px-1.5 py-0 min-w-[4rem] w-auto whitespace-nowrap hover:border-paper-300 focus:ring-0 focus:ring-offset-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="u in settings.settings.salePriceUnitOptions"
                :key="u"
                :value="u"
                class="text-xs"
              >
                {{ u }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </template>
      <span v-else class="text-sm tabular-nums">
        {{ formatEUR(item.salePrice) }}<span class="text-[10px] text-paper-400"> / {{ salePriceUnitModel || '—' }}</span>
      </span>
    </td>

    <!-- 数量 -->
    <td class="px-4 py-3 w-32 text-left">
      <div class="flex items-center justify-start gap-1">
        <template v-if="!isCustomer">
          <div class="inline-flex items-center rounded border border-paper-200 overflow-hidden bg-white">
            <button
              type="button"
              class="px-1.5 text-paper-500 hover:bg-paper-100 disabled:opacity-30 disabled:cursor-not-allowed"
              :disabled="item.quantity <= 1"
              title="减少数量"
              @click="stepQty(-1)"
            >−</button>
            <Input
              v-focus-next
              v-model="quantityModel"
              type="number"
              step="1"
              min="1"
              class="w-10 h-7 px-1 py-0 text-sm tabular-nums text-left border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              type="button"
              class="px-1.5 text-paper-500 hover:bg-paper-100"
              title="增加数量"
              @click="stepQty(1)"
            >+</button>
          </div>
          <Select v-model="unitModel">
            <SelectTrigger
              class="h-7 text-[11px] border-paper-200 bg-transparent px-1.5 py-0 min-w-[3.5rem] w-auto whitespace-nowrap hover:border-paper-300 focus:ring-0 focus:ring-offset-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="u in settings.settings.unitOptions"
                :key="u"
                :value="u"
                class="text-xs"
              >
                {{ u }}
              </SelectItem>
            </SelectContent>
          </Select>
        </template>
        <span v-else class="text-sm tabular-nums">{{ item.quantity }} {{ item.unit }}</span>
      </div>
    </td>

    <!-- 小计 -->
    <td class="px-4 py-3 w-24 text-right">
      <div class="text-sm font-semibold tabular-nums text-ink">{{ formatEUR(item.lineTotal) }}</div>
    </td>


    <!-- admin-only：内部备注 -->
    <td v-if="!isCustomer" class="px-4 py-3 min-w-[140px] border-l border-paper-200 bg-paper-50/30">
      <Input
        v-focus-next
        v-model="internalNoteModel"
        placeholder="内部备注"
        class="h-7 px-1 py-0 text-xs border-paper-200 bg-white"
      />
    </td>

    <!-- admin-only：进价 -->
    <td v-if="!isCustomer" class="px-4 py-3 w-20 text-left border-l border-paper-200 bg-paper-50/30">
      <Input
        v-focus-next
        v-model="costModel"
        type="number"
        step="0.01"
        min="0"
        title="进价"
        class="w-full h-7 px-1 py-0 text-xs tabular-nums text-left border-paper-200 bg-white"
      />
    </td>

    <!-- admin-only：折扣 % -->
    <td v-if="!isCustomer" class="px-4 py-3 w-20 text-left whitespace-nowrap border-l border-paper-200 bg-paper-50/30">
      <Input
        v-focus-next
        v-model="dtoPctModel"
        type="number"
        step="0.1"
        min="0"
        max="100"
        title="折扣 %"
        class="w-full h-7 px-1 py-0 text-xs tabular-nums text-left border-paper-200 bg-white"
      />
    </td>

    <!-- admin-only：税率 % -->
    <td v-if="!isCustomer" class="px-4 py-3 w-20 text-left whitespace-nowrap border-l border-paper-200 bg-paper-50/30">
      <Input
        v-focus-next
        v-model="ivaPctModel"
        type="number"
        step="0.1"
        min="0"
        max="100"
        title="税率 %（默认 21）"
        class="w-full h-7 px-1 py-0 text-xs tabular-nums text-left border-paper-200 bg-white"
      />
    </td>

    <!-- admin-only：利润 -->
    <td v-if="!isCustomer" class="relative px-4 py-3 w-20 text-right border-l border-paper-200 bg-paper-50/30">
      <div class="text-right tabular-nums text-xs text-ink">
        {{ formatEUR(item.margin * item.quantity) }}
      </div>
      <button v-if="isRowHovered" type="button"
        class="absolute top-1.5 right-1.5 text-paper-300 hover:text-red-600 hover:bg-red-50/70 rounded p-1 leading-none"
        title="删除" @click="onRemove">
        <span v-html="icon('trash')"></span>
      </button>
    </td>
  </tr>

  <!-- 照片展开行（管理态 + 有照片时显示缩略，支持删除任意一张） -->
  <tr
    v-if="!isCustomer && item.photoUrls.length > 0"
    class="border-b border-paper-200/60 bg-paper-50/30"
    :style="{ backgroundColor: rowTint }"
  >
    <td></td>
    <td :colspan="isCustomer ? 7 : 12" class="px-4 py-3">
      <div class="flex items-center gap-2 flex-wrap">
        <div
          v-for="(url, idx) in item.photoUrls"
          :key="idx"
          class="relative w-12 h-12 rounded overflow-hidden border border-paper-200 group"
        >
          <img :src="url" class="w-full h-full object-cover" />
          <button
            class="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/40 text-white text-xs"
            @click="removePhoto(idx)"
          >
            ×
          </button>
        </div>
      </div>
    </td>
  </tr>

  <!-- 状态变更二次确认 -->
  <tr v-if="pendingStatus !== null" class="border-b border-paper-100 bg-paper-50">
    <td :colspan="isCustomer ? 8 : 13" class="px-4 py-3">
      <div class="flex items-center gap-3 text-xs">
        <span class="text-paper-600">
          <template v-if="pendingStatus === ''">确定移除当前状态？</template>
          <template v-else>将状态改为 <strong>{{ statusName(pendingStatus) }}</strong>？</template>
        </span>
        <Button size="sm" class="py-1" @click="confirmStatusChange">确认</Button>
        <Button size="sm" variant="outline" class="py-1" @click="cancelStatusChange">取消</Button>
      </div>
    </td>
  </tr>
</template>
