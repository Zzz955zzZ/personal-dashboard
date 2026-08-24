<script setup lang="ts">
/**
 * 报价编辑主视图（管理态 / 客户视图）。
 * 报价单（分类产品表）为页面主体，管理态附报价信息卡与 Excel 导入导出。
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useProjectsStore } from '@/modules/revenue';
import { useSettingsStore, type CategoryGroup, type ProductTemplate } from '@/modules/settings';
import { useQuotationStore } from '@/modules/quotation';
import { formatDate } from '@/shared/format';
import { icon } from '@/shared/icons';
import CategorySection from '../components/CategorySection.vue';
import QuotationSummaryBar from '../components/QuotationSummaryBar.vue';
import QuotationPreviewModal from '../components/QuotationPreviewModal.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { exportQuotationExcel, parseQuotationExcel } from '@/modules/quotation/schema/io';

const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();
const quotationStore = useQuotationStore();
const settings = useSettingsStore();

const projectId = computed(() => String(route.params.projectId ?? ''));
const isCustomer = computed(() => route.query.view === 'customer');

onMounted(() => {
  projectsStore.hydrate();
  quotationStore.hydrate();
  settings.hydrate();
});

const project = computed(() => projectsStore.getProject(projectId.value));
const quotation = computed(() =>
  project.value ? quotationStore.getOrCreate(project.value.id) : undefined,
);

const confirmed = computed(() => quotation.value?.status === 'confirmed');

const showPreview = ref(false);

/* 报价信息卡字段 —— 项目编号/客户名/地址与 Project 双向同步；备注仅存于报价单 */
const notesModel = computed({
  get: () => quotation.value?.notes ?? '',
  set: (v: string) => patchField('notes', v),
});
const projectNoModel = computed({
  get: () => project.value?.projectNo ?? '',
  set: (v: string) => syncProjectAndQuote({ projectNo: v }),
});
const clientNameModel = computed({
  get: () => project.value?.clientName ?? '',
  set: (v: string) => syncProjectAndQuote({ clientName: v }),
});
const addressModel = computed({
  get: () => project.value?.address ?? '',
  set: (v: string) => syncProjectAndQuote({ address: v }),
});

function syncProjectAndQuote(patch: { projectNo?: string; clientName?: string; address?: string }): void {
  if (!project.value || !quotation.value) return;
  projectsStore.updateProject(project.value.id, patch);
  quotationStore.patchQuotation(quotation.value.id, patch);
}

/* 报价信息卡：Enter 跳到下一栏，焦点停留在信息区内（不进入产品表格内部字段） */
const infoCard = ref<HTMLElement | null>(null);
function onInfoKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Enter') return;
  const el = e.target as HTMLElement;
  if (el && el.tagName === 'TEXTAREA') return;
  e.preventDefault();
  const root = infoCard.value;
  if (!root) return;
  const focusables = Array.from(
    root.querySelectorAll<HTMLElement>('input,select,textarea,button'),
  );
  const idx = focusables.indexOf(el);
  const next = idx >= 0 ? focusables[idx + 1] : null;
  next?.focus();
}

const groups = computed(() => settings.categoryGroups.slice().sort((a, b) => a.order - b.order));
const groupOptions = computed(() =>
  groups.value.map((g) => ({
    value: g.id,
    label: g.nameEs ? `${g.name} / ${g.nameEs}` : g.name,
  })),
);
const includedGroups = computed(() =>
  groups.value.filter((g) => quotation.value?.includedGroupIds.includes(g.id)),
);
const displayedGroups = computed<(CategoryGroup | null)[]>(() => [...includedGroups.value, null]);
const availableGroupOptions = computed(() =>
  groupOptions.value.filter((o) => !quotation.value?.includedGroupIds.includes(o.value)),
);

function itemsForGroup(groupId: string) {
  return quotation.value ? quotation.value.items.filter((i) => i.categoryGroupId === groupId) : [];
}

function onSelectGroup(groupId: string): void {
  if (!quotation.value || !groupId) return;
  quotationStore.includeGroup(quotation.value.id, groupId);
}
function onRemoveGroup(groupId: string): void {
  if (!quotation.value) return;
  quotationStore.excludeGroup(quotation.value.id, groupId);
}

function patchField(field: keyof NonNullable<typeof quotation.value>, value: string | number): void {
  if (!quotation.value) return;
  quotationStore.patchQuotation(quotation.value.id, { [field]: value } as Partial<typeof quotation.value>);
}

function addFromTemplates(groupId: string, templates: ProductTemplate[]): void {
  if (!quotation.value) return;
  quotationStore.addItemsFromTemplates(quotation.value.id, groupId, templates);
}

function onConfirm(): void {
  if (!quotation.value) return;
  quotationStore.confirmQuotation(quotation.value.id);
  void router.push({ name: 'project-detail', params: { id: project.value!.id } });
}

/* ---- Excel 导入 / 导出（基于 Canonical Schema）---- */
const importFile = ref<HTMLInputElement | null>(null);
const importMsg = ref('');

function onExportExcel(): void {
  if (!quotation.value) return;
  exportQuotationExcel(
    quotation.value,
    settings.categoryGroups,
    settings.settings.productStatusOptions,
  );
}

function triggerImport(): void {
  importFile.value?.click();
}

async function onImportFile(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !quotation.value) {
    input.value = '';
    return;
  }
  importMsg.value = '导入中…';
  try {
    const fallbackGroupId = settings.ensureCatchAllGroup().id;
    const { items, warnings } = await parseQuotationExcel(
      file,
      settings.categoryGroups,
      settings.settings.productStatusOptions,
      fallbackGroupId,
    );
    for (const it of items) quotationStore.addItem(quotation.value.id, it);
    importMsg.value =
      `已导入 ${items.length} 行` + (warnings.length ? `；${warnings.length} 条提示（见控制台）` : '');
    if (warnings.length) console.warn('[导入]', warnings);
  } catch (e) {
    importMsg.value = '导入失败：' + (e instanceof Error ? e.message : String(e));
  } finally {
    input.value = '';
  }
}
</script>

<template>
  <div class="min-h-screen px-4 sm:px-6 lg:px-8 py-4" v-if="project && quotation">
    <!-- 返回 + 视图标签 -->
    <div class="flex items-center gap-3 mb-3">
      <Button variant="ghost" size="sm" @click="router.push({ name: 'quotation' })">
        <span v-html="icon('back')"></span> 返回
      </Button>
      <span v-if="isCustomer" class="text-[11px] px-2 py-0.5 rounded border bg-paper-50 text-paper-600 border-paper-200">客户视图</span>
    </div>

    <!-- 顶栏 -->
    <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-ink truncate">{{ project.projectNo || project.name }}</h1>
        <p v-if="project.clientName" class="text-xs text-paper-500 mt-0.5">{{ project.clientName }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <Button variant="secondary" size="sm" @click="showPreview = true">
          <span v-html="icon('eye')"></span> 预览 / 导出
        </Button>
        <Button variant="secondary" size="sm" @click="onExportExcel">导出 Excel</Button>
        <Button variant="secondary" size="sm" @click="triggerImport">导入 Excel</Button>
        <input
          ref="importFile"
          type="file"
          accept=".xlsx,.xls,.csv"
          class="hidden"
          @change="onImportFile"
        />
        <span v-if="importMsg" class="text-[11px] text-paper-500 self-center">{{ importMsg }}</span>
        <Button v-if="!isCustomer && !confirmed" variant="default" size="sm" @click="onConfirm">
          <span v-html="icon('check')"></span> 确认报价
        </Button>
        <Button v-else-if="!isCustomer" variant="secondary" size="sm" disabled>已确认</Button>
      </div>
    </div>

    <!-- 报价信息卡（仅管理态可编辑） -->
    <Card v-if="!isCustomer" class="mb-5" ref="infoCard" @keydown="onInfoKeydown">
      <CardHeader class="pb-3 pt-4 px-4">
        <div class="flex items-center gap-2">
          <CardTitle class="text-[11px] font-semibold uppercase tracking-wide text-paper-500">报价信息</CardTitle>
          <span class="text-[10px] text-paper-400">更新于 {{ formatDate(quotation.updatedAt) }}</span>
        </div>
      </CardHeader>
      <CardContent class="pt-0 px-4 pb-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
          <div class="space-y-1">
            <Label class="text-[11px] font-medium text-paper-500">项目编号 / N.º Proyecto</Label>
            <Input v-model="projectNoModel" class="text-sm py-1" placeholder="如 PRJ-2026-018" />
          </div>
          <div class="space-y-1">
            <Label class="text-[11px] font-medium text-paper-500">客户名 / Cliente</Label>
            <Input v-model="clientNameModel" class="text-sm py-1" placeholder="客户 / Cliente" />
          </div>
          <div class="space-y-1 sm:col-span-2">
            <Label class="text-[11px] font-medium text-paper-500">地址 / Dirección</Label>
            <Input v-model="addressModel" class="text-sm py-1" placeholder="施工地址" />
          </div>
          <div class="sm:col-span-2 lg:col-span-4 space-y-1">
            <Label class="text-[11px] font-medium text-paper-500">备注 / Notas（客户可见）</Label>
            <Textarea v-model="notesModel" rows="1" class="text-sm py-1" placeholder="补充说明、有效期、付款方式、交付期等" />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 报价单主体 -->
    <div class="space-y-4">
      <CategorySection
        v-for="(g, idx) in displayedGroups"
        :key="g?.id ?? `new-${idx}`"
        :group="g"
        :group-options="g ? undefined : availableGroupOptions"
        :items="g ? itemsForGroup(g.id) : []"
        :qid="quotation.id"
        :is-customer="isCustomer"
        @select-group="onSelectGroup"
        @add-templates="addFromTemplates"
        @remove-group="onRemoveGroup"
      />
      <div v-if="groups.length === 0" class="text-center py-16 text-paper-400 qs-card">
        <p class="text-sm">还没有设置分类。先去「设置中心 → 分类管理」创建大类。</p>
      </div>
      <QuotationSummaryBar :quotation="quotation" :is-customer="isCustomer" />
    </div>

    <!-- 预览 / 导出 -->
    <QuotationPreviewModal
      :open="showPreview"
      :project="project"
      :quotation="quotation"
      @close="showPreview = false"
    />
  </div>

  <!-- 找不到项目 -->
  <div v-else class="min-h-screen flex items-center justify-center text-paper-400">
    <div class="text-center">
      <p>未找到该项目。</p>
      <Button variant="secondary" class="mt-4" @click="router.push({ name: 'quotation' })">返回报价列表</Button>
    </div>
  </div>
</template>
