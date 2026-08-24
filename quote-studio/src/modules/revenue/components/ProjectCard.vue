<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
/** 项目收益卡片：总收益 / 总利润 / 状态 + 档案夹 + 操作入口。 */
import { computed } from 'vue';
import { formatEUR } from '@/shared/format';
import { icon } from '@/shared/icons';
import { type Project, type ProjectRevenueSummary, projectStatusLabel } from '@/modules/revenue';
import { useSettingsStore } from '@/modules/settings';
import { useProjectsStore } from '@/modules/revenue';

const props = defineProps<{ project: Project; summary: ProjectRevenueSummary }>();
const emit = defineEmits<{ open: [id: string]; remove: [id: string] }>();

const settings = useSettingsStore();
const projectsStore = useProjectsStore();

const carpeta = computed(() =>
  props.project.carpetaId ? settings.getCarpeta(props.project.carpetaId) : undefined,
);

function moveCarpeta(id: string): void {
  projectsStore.updateProject(props.project.id, { carpetaId: id });
}

function statusClass(s: Project['status']): string {
  if (s === 'completed') return 'bg-paper-100 text-paper-700';
  if (s === 'archived') return 'bg-paper-50 text-paper-400';
  return 'bg-[#F0EDE6] text-[#5C4F42]';
}
</script>

<template>
  <div class="qs-card p-5 flex flex-col h-full bg-white">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="font-medium text-lg truncate text-ink">{{ project.projectNo || project.name }}</h3>
        <p class="text-sm text-paper-500 truncate min-h-[1.25em]">
          <span v-if="project.clientName">{{ project.clientName }}</span>
          <span v-else class="invisible">.</span>
        </p>
      </div>
      <span class="text-[11px] px-2 py-0.5 rounded-full shrink-0 border border-paper-200" :class="statusClass(project.status)">
        {{ projectStatusLabel(project.status) }}
      </span>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3">
      <div class="rounded-xl bg-paper-50 p-3">
        <div class="text-[11px] text-paper-500">总收益</div>
        <div class="text-base font-semibold tabular-nums mt-0.5 text-ink">{{ formatEUR(summary.totalSales) }}</div>
      </div>
      <div class="rounded-xl bg-paper-50 p-3">
        <div class="text-[11px] text-paper-500">总利润</div>
        <div class="text-base font-semibold tabular-nums mt-0.5 text-ink">{{ formatEUR(summary.totalProfit) }}</div>
      </div>
    </div>

    <div class="mt-4 flex items-center gap-2 text-xs text-paper-500">
      <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: carpeta?.color || '#cbd5e1' }"></span>
      <span class="truncate">{{ carpeta?.name || '未归类' }}</span>
      <Select :model-value="project.carpetaId" @update:model-value="moveCarpeta">
        <SelectTrigger class="ml-auto h-7 px-2 py-0 text-xs w-[6.5rem] border-paper-200 bg-transparent hover:bg-paper-50">
          <SelectValue placeholder="未归类" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">未归类</SelectItem>
          <SelectItem v-for="c in settings.sortedCarpetas()" :key="c.id" :value="c.id">{{ c.name }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="mt-auto pt-3 flex items-center gap-2">
      <Button variant="default" class=" flex-1" @click="emit('open', project.id)">
        <span v-html="icon('wallet')"></span> 收益详情
      </Button>
      <Button variant="ghost" class="" title="删除项目" @click="emit('remove', project.id)">
        <span v-html="icon('trash')"></span>
      </Button>
    </div>
  </div>
</template>
