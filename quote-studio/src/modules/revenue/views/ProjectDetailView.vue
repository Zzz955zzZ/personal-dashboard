<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
/** 项目详情 + 收益概览（按来源 / 时间）。 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  useProjectsStore,
  useRevenueStore,
  projectStatusLabel,
  type ProjectStatus,
} from '@/modules/revenue';
import { PROJECT_STATUS_OPTIONS } from '@/modules/revenue/constants';
import { formatEUR, formatDateTime } from '@/shared/format';
import { icon } from '@/shared/icons';
import RevenueSummary from '../components/RevenueSummary.vue';
import BaseModal from '@/shared/components/BaseModal.vue';

const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();
const revenueStore = useRevenueStore();

const projectId = computed(() => String(route.params.id ?? ''));

onMounted(() => {
  projectsStore.hydrate();
  revenueStore.hydrate();
});

const project = computed(() => projectsStore.getProject(projectId.value));
const summary = computed(() =>
  project.value ? projectsStore.projectRevenue(project.value.id) : null,
);
const entries = computed(() =>
  project.value ? revenueStore.byProject(project.value.id) : [],
);

const showEdit = ref(false);
const form = reactive<{ projectNo: string; clientName: string; address: string; status: ProjectStatus }>({
  projectNo: '',
  clientName: '',
  address: '',
  status: 'active',
});

function openEdit(): void {
  if (!project.value) return;
  form.projectNo = project.value.projectNo || project.value.name;
  form.clientName = project.value.clientName;
  form.address = project.value.address;
  form.status = project.value.status;
  showEdit.value = true;
}

function saveEdit(): void {
  const no = form.projectNo.trim();
  if (!project.value || !no) return;
  projectsStore.updateProject(project.value.id, {
    name: no,
    projectNo: no,
    clientName: form.clientName.trim(),
    address: form.address.trim(),
    status: form.status,
  });
  showEdit.value = false;
}

function remove(): void {
  const display = project.value ? project.value.projectNo || project.value.name : '';
  if (project.value && window.confirm(`确定删除项目「${display}」？`)) {
    projectsStore.removeProject(project.value.id);
    void router.push({ name: 'projects' });
  }
}

function goQuotation(): void {
  if (project.value) void router.push({ name: 'quotation-edit', params: { projectId: project.value.id } });
}
</script>

<template>
  <div class="min-h-screen max-w-3xl mx-auto px-4 sm:px-8 py-6">
    <Button variant="ghost" class=" mb-4" @click="router.back()">
      <span v-html="icon('back')"></span> 返回
    </Button>

    <div v-if="!project" class="text-center py-20 text-paper-400">
      <p>未找到该项目。</p>
    </div>

    <template v-else>
      <!-- 项目信息 -->
      <div class="qs-card p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h1 class="font-display text-3xl font-medium">{{ project.projectNo || project.name }}</h1>
            <p v-if="project.clientName" class="text-paper-500 mt-0.5">{{ project.clientName }}</p>
            <p v-if="project.address" class="text-sm text-paper-500 mt-0.5">{{ project.address }}</p>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-coral-100 text-coral-700 shrink-0">
            {{ projectStatusLabel(project.status) }}
          </span>
        </div>
        <div class="flex flex-wrap gap-2 mt-4">
          <Button variant="default" @click="goQuotation">
            <span v-html="icon('briefcase')"></span> 查看 / 编辑报价
          </Button>
          <Button variant="default" @click="openEdit">
            <span v-html="icon('pencil')"></span> 编辑
          </Button>
          <Button variant="default" class="-danger" @click="remove">
            <span v-html="icon('trash')"></span> 删除
          </Button>
        </div>
      </div>

      <!-- 收益汇总 -->
      <div v-if="summary" class="mt-4">
        <RevenueSummary :summary="summary" label="收益汇总" />
      </div>

      <!-- 收益明细 -->
      <div class="mt-4">
        <h2 class="qs-label mb-2">收益明细（{{ entries.length }} 条）</h2>
        <div v-if="entries.length === 0" class="text-sm text-paper-400 py-6 text-center qs-card">
          暂无收益记录。在报价页「确认」后此处会自动入账。
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="e in entries"
            :key="e.id"
            class="qs-card p-4 flex items-center justify-between"
          >
            <div>
              <div class="text-sm font-medium">销售额 {{ formatEUR(e.amount) }}</div>
              <div class="text-xs text-paper-500 mt-0.5">
                成本 {{ formatEUR(e.cost) }} · 利润
                <span class="text-coral-600">{{ formatEUR(e.margin) }}</span>
              </div>
              <div class="text-[11px] text-paper-400 mt-0.5">{{ formatDateTime(e.recordedAt) }}</div>
            </div>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              {{ e.source === 'quotation_confirmed' ? '报价确认' : e.source }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- 编辑弹窗 -->
    <BaseModal :open="showEdit" title="编辑项目" width="md" @close="showEdit = false">
      <form class="flex flex-col gap-4" @submit.prevent="saveEdit">
        <div>
          <Label>项目编号 *</Label>
          <Input v-model="form.projectNo" required type="text" class=" mt-1.5"  />
        </div>
        <div>
          <Label>客户名称</Label>
          <Input v-model="form.clientName" type="text" class=" mt-1.5"  />
        </div>
        <div>
          <Label>地址</Label>
          <Input v-model="form.address" type="text" class=" mt-1.5"  />
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
        <div class="flex gap-3 mt-1">
          <Button variant="default" type="button" class=" flex-1" @click="showEdit = false">取消</Button>
          <Button variant="default" type="submit" class=" flex-1">保存</Button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
