<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
/** 报价项目卡片：展示项目编号 / 客户 / 状态 / 档案夹 / 操作。紧凑设计，支持 4-5 列网格。 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useQuotationStore } from '@/modules/quotation';
import { useProjectsStore } from '@/modules/revenue';
import { useSettingsStore } from '@/modules/settings';
import type { Project } from '@/modules/revenue';
import { icon } from '@/shared/icons';
import QuotationPreviewModal from './QuotationPreviewModal.vue';

const props = defineProps<{
  project: Project;
  selected?: boolean;
  selectable?: boolean;
}>();
const emit = defineEmits<{
  'toggle-select': [projectId: string];
  delete: [projectId: string];
}>();
const router = useRouter();
const quotationStore = useQuotationStore();
const projectsStore = useProjectsStore();
const settings = useSettingsStore();

const showPreview = ref(false);

const quotation = computed(() => quotationStore.getQuotation(props.project.id));
const confirmed = computed(() => quotation.value?.status === 'confirmed');
const carpeta = computed(() =>
  props.project.carpetaId ? settings.getCarpeta(props.project.carpetaId) : undefined,
);

function moveCarpeta(id: string): void {
  projectsStore.updateProject(props.project.id, { carpetaId: id });
}

function openQuotation(): void {
  void router.push({ name: 'quotation-edit', params: { projectId: props.project.id } });
}
function openCustomerView(): void {
  void router.push({
    name: 'quotation-edit',
    params: { projectId: props.project.id },
    query: { view: 'customer' },
  });
}
function openRevenue(): void {
  void router.push({ name: 'project-detail', params: { id: props.project.id } });
}
</script>

<template>
  <div class="qs-card p-3 flex flex-col h-full bg-white">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex items-start gap-2">
        <input
          v-if="selectable"
          type="checkbox"
          :checked="selected"
          class="mt-0.5 shrink-0 accent-[#3d342b]"
          @change="emit('toggle-select', project.id)"
        />
        <div class="min-w-0">
          <h3 class="font-medium text-sm truncate text-ink">{{ project.projectNo || project.name }}</h3>
          <p class="text-[11px] text-paper-500 truncate min-h-[1.25em]">
            <span v-if="project.clientName">{{ project.clientName }}</span>
            <span v-else class="invisible">.</span>
          </p>
        </div>
      </div>
      <span
        class="text-[10px] px-1.5 py-0.5 rounded border shrink-0"
        :class="confirmed ? 'bg-paper-50 text-paper-700 border-paper-200' : 'bg-white text-paper-400 border-paper-200'"
      >
        {{ confirmed ? '已确认' : '草稿' }}
      </span>
    </div>

    <div class="mt-2 flex items-center gap-1.5 text-[11px] text-paper-500">
      <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: carpeta?.color || '#cbd5e1' }"></span>
      <span class="truncate">{{ carpeta?.name || '未归类' }}</span>
      <Select :model-value="project.carpetaId" @update:model-value="moveCarpeta">
        <SelectTrigger class="ml-auto h-6 px-1.5 py-0 text-[10px] w-20 border-paper-200 bg-transparent hover:bg-paper-50">
          <SelectValue placeholder="未归类" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">未归类</SelectItem>
          <SelectItem v-for="c in settings.sortedCarpetas()" :key="c.id" :value="c.id">{{ c.name }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="mt-auto pt-3 flex items-center gap-1.5">
      <Button variant="default" class="flex-1 h-7 text-xs px-2" @click="openQuotation">
        <span v-html="icon('pencil')"></span> 报价
      </Button>
      <Button variant="secondary" class="h-7 w-7 p-0 text-xs" @click="showPreview = true">
        <span v-html="icon('eye')"></span>
      </Button>
      <Button variant="ghost" class="h-7 w-7 p-0 text-xs text-paper-500 hover:text-ink" @click="openCustomerView" title="客户视图">
        <span v-html="icon('link')"></span>
      </Button>
      <Button variant="ghost" class="h-7 w-7 p-0 text-xs text-paper-500 hover:text-ink" @click="openRevenue" title="收益">
        <span v-html="icon('wallet')"></span>
      </Button>
      <Button
        variant="ghost"
        class="h-7 w-7 p-0 text-xs text-paper-500 hover:text-red-600 hover:bg-red-50"
        title="删除项目及报价"
        @click="emit('delete', project.id)"
      >
        <span v-html="icon('trash')"></span>
      </Button>
    </div>

    <QuotationPreviewModal
      v-if="quotation"
      :open="showPreview"
      :project="project"
      :quotation="quotation"
      @close="showPreview = false"
    />
  </div>
</template>
