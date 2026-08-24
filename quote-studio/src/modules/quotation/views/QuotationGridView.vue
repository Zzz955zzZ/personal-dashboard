<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
/** 报价项目卡片网格：档案夹侧栏 + 搜索 + 进入报价 + 导入 Excel。 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useProjectsStore } from '@/modules/revenue';
import { useQuotationStore } from '@/modules/quotation';
import { useSettingsStore } from '@/modules/settings';
import { icon } from '@/shared/icons';
import { parseQuotationExcel } from '@/shared/excel';
import ProjectCard from '../components/ProjectCard.vue';
import SearchInput from '@/shared/components/SearchInput.vue';
import CarpetaNav from '@/shared/components/CarpetaNav.vue';
import BaseModal from '@/shared/components/BaseModal.vue';

const router = useRouter();
const projectsStore = useProjectsStore();
const quotationStore = useQuotationStore();
const settingsStore = useSettingsStore();

onMounted(() => {
  projectsStore.hydrate();
  quotationStore.hydrate();
  settingsStore.hydrate();
});

const query = ref('');
const selectedCarpeta = ref<string>('all');
const selecting = ref(false);
const selectedIds = ref<Set<string>>(new Set());

function isUncategorized(carpetaId: string): boolean {
  return !carpetaId || !settingsStore.getCarpeta(carpetaId);
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  const sel = selectedCarpeta.value;
  return projectsStore.projects.filter((p) => {
    if (sel === 'uncategorized') {
      if (!isUncategorized(p.carpetaId)) return false;
    } else if (sel !== 'all' && p.carpetaId !== sel) {
      return false;
    }
    if (q && !((p.projectNo || p.name).toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q))) return false;
    return true;
  });
});

const showForm = ref(false);
const form = reactive<{ projectNo: string; clientName: string; address: string; carpetaId: string }>({
  projectNo: '',
  clientName: '',
  address: '',
  carpetaId: '',
});

function createProject(): void {
  const no = form.projectNo.trim();
  if (!no) return;
  const p = projectsStore.addProject({
    name: no,
    projectNo: no,
    clientName: form.clientName.trim(),
    address: form.address.trim(),
    status: 'active',
    currency: 'EUR',
    coverUrl: '',
    carpetaId: form.carpetaId,
  });
  form.projectNo = '';
  form.clientName = '';
  form.address = '';
  form.carpetaId = '';
  showForm.value = false;
  void router.push({ name: 'quotation-edit', params: { projectId: p.id } });
}

function toggleSelect(id: string): void {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id);
  else selectedIds.value.add(id);
}

function deleteProject(id: string): void {
  const p = projectsStore.getProject(id);
  if (!p) return;
  if (!window.confirm(`删除项目「${p.projectNo || p.name}」及其报价？此操作不可撤销。`)) return;
  quotationStore.removeByProjectId(id);
  projectsStore.removeProject(id);
  selectedIds.value.delete(id);
}

function batchDelete(): void {
  const ids = Array.from(selectedIds.value);
  if (ids.length === 0) return;
  if (!window.confirm(`确定删除选中的 ${ids.length} 个项目及其报价？此操作不可撤销。`)) return;
  for (const id of ids) {
    quotationStore.removeByProjectId(id);
    projectsStore.removeProject(id);
  }
  selectedIds.value.clear();
  selecting.value = false;
}

function toggleSelecting(): void {
  selecting.value = !selecting.value;
  if (!selecting.value) selectedIds.value.clear();
}

function selectAllVisible(): void {
  for (const p of filtered.value) selectedIds.value.add(p.id);
}

function clearSelection(): void {
  selectedIds.value.clear();
}

const importInput = ref<HTMLInputElement | null>(null);
const importing = ref(false);

async function onImportExcel(e: Event): Promise<void> {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  importing.value = true;
  try {
    const rows = await parseQuotationExcel(f);
    const importedNo = f.name.replace(/\.xlsx?$/i, '').slice(0, 60) || 'Excel 导入项目';
    const p = projectsStore.addProject({
      name: importedNo,
      projectNo: importedNo,
      clientName: '',
      address: '',
      status: 'active',
      currency: 'EUR',
      coverUrl: '',
      carpetaId: '',
    });
    const q = quotationStore.getOrCreate(p.id);

    for (const row of rows) {
      let group = settingsStore.findGroupByName(row.categoryGroupName);
      if (!group && row.categoryGroupName) {
        group = settingsStore.addCategoryGroup({ name: row.categoryGroupName });
      }
      if (!group) {
        group = settingsStore.categoryGroups[0];
      }
      quotationStore.addItem(q.id, {
        categoryGroupId: group?.id || '',
        name: row.name,
        nameEs: row.nameEs,
        model: row.model,
        photoUrls: row.photoUrl ? [row.photoUrl] : [],
        customerNote: row.customerNote,
        internalNote: row.internalNote,
        cost: row.cost,
        margin: 0,
        salePrice: row.salePrice ?? 0,
        quantity: row.quantity,
        unit: row.unit,
        dtoPct: 0,
        ivaPct: 21,
        statusId: '',
      });
    }

    void router.push({ name: 'quotation-edit', params: { projectId: p.id } });
  } finally {
    importing.value = false;
    if (importInput.value) importInput.value.value = '';
  }
}
</script>

<template>
  <div class="min-h-screen">
    <div class="px-6 sm:px-10 pt-8 pb-6 border-b border-paper-200/60 bg-white/50">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="text-[10px] tracking-wide uppercase text-paper-500">Lyd9 Studio</div>
          <h1 class="text-2xl font-medium text-ink mt-0.5">报价系统</h1>
        </div>
        <div class="flex items-center gap-2">
          <Button
            :variant="selecting ? 'secondary' : 'default'"
            @click="toggleSelecting"
          >
            <span v-html="icon(selecting ? 'x' : 'check')"></span>
            {{ selecting ? '取消选择' : '批量选择' }}
          </Button>
          <Button variant="default" @click="importInput?.click()">
            <span v-html="icon('upload')"></span> 导入 Excel
          </Button>
          <input
            ref="importInput"
            type="file"
            accept=".xlsx,.xls"
            class="hidden"
            @change="onImportExcel"
          />
          <Button variant="default" @click="showForm = true">
            <span v-html="icon('plus')"></span> 新建项目
          </Button>
        </div>
      </div>
      <div class="mt-3 max-w-sm">
        <SearchInput v-model="query" placeholder="搜索项目编号 / 客户…" />
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div
      v-if="selecting"
      class="px-4 sm:px-6 py-2 border-b border-paper-200 bg-paper-50/80 flex items-center justify-between gap-3"
    >
      <div class="text-sm text-ink">
        已选 <strong>{{ selectedIds.size }}</strong> 项
        <button
          v-if="selectedIds.size < filtered.length"
          class="text-[11px] text-paper-500 hover:text-ink ml-2 underline underline-offset-2"
          @click="selectAllVisible"
        >
          全选本页
        </button>
        <button
          v-if="selectedIds.size > 0"
          class="text-[11px] text-paper-500 hover:text-ink ml-2 underline underline-offset-2"
          @click="clearSelection"
        >
          清空
        </button>
      </div>
      <Button
        variant="default"
        class="text-xs h-8"
        :disabled="selectedIds.size === 0"
        @click="batchDelete"
      >
        <span v-html="icon('trash')"></span> 批量删除
      </Button>
    </div>

    <div class="px-6 sm:px-10 py-8 flex flex-col lg:flex-row gap-6">
      <CarpetaNav v-model="selectedCarpeta" class="lg:w-44 lg:shrink-0" />
      <div class="flex-1 min-w-0">
        <div v-if="projectsStore.projects.length === 0" class="text-center py-20 text-paper-400">
          <span class="text-4xl mb-3 block" v-html="icon('briefcase')"></span>
          <p class="text-sm">还没有项目，点击右上角「新建项目」开始编制报价。</p>
        </div>
        <div v-else-if="filtered.length === 0" class="text-center py-20 text-paper-400">
          <p class="text-sm">该档案夹暂无项目。</p>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          <ProjectCard
            v-for="p in filtered"
            :key="p.id"
            :project="p"
            :selectable="selecting"
            :selected="selectedIds.has(p.id)"
            @toggle-select="toggleSelect"
            @delete="deleteProject"
          />
        </div>
      </div>
    </div>

    <BaseModal :open="showForm" title="新建项目" width="md" @close="showForm = false">
      <form class="flex flex-col gap-4" @submit.prevent="createProject">
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
          <Label>档案夹</Label>
          <Select v-model="form.carpetaId">
            <SelectTrigger class="mt-1.5"><SelectValue placeholder="档案夹" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">未归类</SelectItem>
              <SelectItem v-for="c in settingsStore.sortedCarpetas()" :key="c.id" :value="c.id">
                {{ c.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex gap-3 mt-1">
          <Button variant="default" type="button" class=" flex-1" @click="showForm = false">取消</Button>
          <Button variant="default" type="submit" class=" flex-1">创建并报价</Button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
