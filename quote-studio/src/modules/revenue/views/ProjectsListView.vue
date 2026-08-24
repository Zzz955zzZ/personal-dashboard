<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
/** 项目收益列表：档案夹侧栏 + 卡片网格（总收益 / 总利润 / 状态），含新建项目。 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  useProjectsStore,
  useRevenueStore,
  projectStatusLabel,
  type ProjectStatus,
} from '@/modules/revenue';
import { useSettingsStore } from '@/modules/settings';
import { PROJECT_STATUS_OPTIONS } from '@/modules/revenue/constants';
import { formatEUR } from '@/shared/format';
import { icon } from '@/shared/icons';
import ProjectCard from '../components/ProjectCard.vue';
import CarpetaNav from '@/shared/components/CarpetaNav.vue';
import BaseModal from '@/shared/components/BaseModal.vue';

const router = useRouter();
const projectsStore = useProjectsStore();
const revenueStore = useRevenueStore();
const settings = useSettingsStore();

onMounted(() => {
  projectsStore.hydrate();
  revenueStore.hydrate();
  settings.hydrate();
});

const portfolio = computed(() => projectsStore.portfolioSummary);

const selectedCarpeta = ref<string>('all');

function isUncategorized(carpetaId: string): boolean {
  return !carpetaId || !settings.getCarpeta(carpetaId);
}

const filtered = computed(() => {
  const sel = selectedCarpeta.value;
  if (sel === 'all') return projectsStore.projects;
  if (sel === 'uncategorized') {
    return projectsStore.projects.filter((p) => isUncategorized(p.carpetaId));
  }
  return projectsStore.projects.filter((p) => p.carpetaId === sel);
});

const showForm = ref(false);
const form = reactive<{ projectNo: string; clientName: string; address: string; status: ProjectStatus; carpetaId: string }>({
  projectNo: '',
  clientName: '',
  address: '',
  status: 'active',
  carpetaId: '',
});

function openProject(id: string): void {
  void router.push({ name: 'project-detail', params: { id } });
}

function removeProject(id: string): void {
  const p = projectsStore.getProject(id);
  if (p && window.confirm(`确定删除项目「${p.projectNo || p.name}」及其收益记录？`)) {
    projectsStore.removeProject(id);
  }
}

function submit(): void {
  const no = form.projectNo.trim();
  if (!no) return;
  projectsStore.addProject({
    name: no,
    projectNo: no,
    clientName: form.clientName.trim(),
    address: form.address.trim(),
    status: form.status,
    currency: 'EUR',
    coverUrl: '',
    carpetaId: form.carpetaId,
  });
  form.projectNo = '';
  form.clientName = '';
  form.address = '';
  form.status = 'active';
  form.carpetaId = '';
  showForm.value = false;
}
</script>

<template>
  <div class="min-h-screen">
    <div class="px-6 sm:px-10 pt-8 pb-6 border-b border-paper-200/60 bg-white/50">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="text-[10px] tracking-wide uppercase text-paper-500">Lyd9 Studio</div>
          <h1 class="text-2xl font-medium text-ink mt-0.5">项目收益</h1>
        </div>
        <Button variant="default" @click="showForm = true">
          <span v-html="icon('plus')"></span> 新建项目
        </Button>
      </div>
      <div class="grid grid-cols-3 gap-4 mt-4 max-w-sm">
        <div>
          <div class="text-[10px] text-paper-500">总销售额</div>
          <div class="text-lg font-semibold tabular-nums text-ink">{{ formatEUR(portfolio.totalSales) }}</div>
        </div>
        <div>
          <div class="text-[10px] text-paper-500">总成本</div>
          <div class="text-lg font-semibold tabular-nums text-ink">{{ formatEUR(portfolio.totalCost) }}</div>
        </div>
        <div>
          <div class="text-[10px] text-paper-500">总利润</div>
          <div class="text-lg font-semibold tabular-nums text-ink">{{ formatEUR(portfolio.totalProfit) }}</div>
        </div>
      </div>
    </div>

    <div class="px-6 sm:px-10 py-8 flex flex-col lg:flex-row gap-6">
      <CarpetaNav v-model="selectedCarpeta" class="lg:w-44 lg:shrink-0" />
      <div class="flex-1 min-w-0">
        <div v-if="projectsStore.projects.length === 0" class="text-center py-20 text-paper-400">
          <span class="text-4xl mb-3 block" v-html="icon('wallet')"></span>
          <p class="text-sm">还没有项目，点击右上角「新建项目」开始。</p>
        </div>
        <div v-else-if="filtered.length === 0" class="text-center py-20 text-paper-400">
          <p class="text-sm">该档案夹暂无项目。</p>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          <ProjectCard
            v-for="p in filtered"
            :key="p.id"
            :project="p"
            :summary="projectsStore.projectRevenue(p.id)"
            @open="openProject"
            @remove="removeProject"
          />
        </div>
      </div>
    </div>

    <BaseModal :open="showForm" title="新建项目" width="md" @close="showForm = false">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div>
          <Label>项目编号 *</Label>
          <Input v-model="form.projectNo" required type="text" placeholder="例如：PRJ-2026-018 / 马德里公寓软装" class=" mt-1.5"  />
        </div>
        <div>
          <Label>客户名称</Label>
          <Input v-model="form.clientName" type="text" placeholder="例如：张女士" class=" mt-1.5"  />
        </div>
        <div>
          <Label>地址</Label>
          <Input v-model="form.address" type="text" placeholder="施工地址 / Dirección" class=" mt-1.5"  />
        </div>
        <div>
          <Label>状态</Label>
          <Select v-model="form.status">
            <SelectTrigger class="mt-1.5"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="o in PROJECT_STATUS_OPTIONS" :key="o.value" :value="o.value">
                {{ projectStatusLabel(o.value) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>档案夹</Label>
          <Select v-model="form.carpetaId">
            <SelectTrigger class="mt-1.5"><SelectValue placeholder="档案夹" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">未归类</SelectItem>
              <SelectItem v-for="c in settings.sortedCarpetas()" :key="c.id" :value="c.id">
                {{ c.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex gap-3 mt-1">
          <Button variant="default" type="button" class=" flex-1" @click="showForm = false">取消</Button>
          <Button variant="default" type="submit" class=" flex-1">创建</Button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
