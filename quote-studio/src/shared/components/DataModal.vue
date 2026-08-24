<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
/**
 * 数据备份 / 导入弹窗（跨模块，挂在 App 外壳）。
 *
 * - JSON：导出 / 导入整库快照（项目、报价、收益、设置、分类、公司资料）。
 * - Excel：导出全部报价行为表格；导入按 id / 名称 upsert（缺字段由 normalize 兜底）。
 */
import { ref, watch } from 'vue';
import {
  useProjectsStore,
  useRevenueStore,
  useQuotationStore,
  useSettingsStore,
} from '@/modules';
import BaseModal from './BaseModal.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const raw = ref('');
const msg = ref<{ type: 'ok' | 'err'; text: string } | null>(null);

watch(
  () => props.open,
  (v) => {
    if (v) {
      raw.value = '';
      msg.value = null;
    }
  },
);

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function download(text: string, filename: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---- JSON ---- */
function snapshot() {
  const projects = useProjectsStore();
  const revenue = useRevenueStore();
  const quotation = useQuotationStore();
  const settings = useSettingsStore();
  return {
    version: 1,
    app: 'quote-studio',
    exportedAt: new Date().toISOString(),
    projects: projects.exportState(),
    quotations: quotation.exportState(),
    revenue: revenue.exportState(),
    settings: settings.exportState(),
  };
}

function doExportJson(): void {
  download(JSON.stringify(snapshot(), null, 2), `quote-studio-${stamp()}.json`, 'application/json');
  msg.value = { type: 'ok', text: '已导出全部数据（JSON）。' };
}

function doImportJson(): void {
  const text = raw.value.trim();
  if (!text) {
    msg.value = { type: 'err', text: '请先粘贴或选择备份文件。' };
    return;
  }
  try {
    const snap = JSON.parse(text);
    const projects = useProjectsStore();
    const revenue = useRevenueStore();
    const quotation = useQuotationStore();
    const settings = useSettingsStore();
    if (snap?.projects) projects.importState(snap.projects);
    if (snap?.quotations) quotation.importState(snap.quotations);
    if (snap?.revenue) revenue.importState(snap.revenue);
    if (snap?.settings) settings.importState(snap.settings);
    msg.value = { type: 'ok', text: '导入成功，数据已写入本地。' };
    raw.value = '';
  } catch (e) {
    msg.value = { type: 'err', text: '解析失败：' + (e instanceof Error ? e.message : String(e)) };
  }
}

  async function onJsonFile(e: Event): Promise<void> {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    raw.value = await f.text();
  }
</script>

<template>
  <BaseModal :open="open" title="数据 · 备份与导入" width="lg" @close="emit('close')">
    <div class="space-y-6 text-sm">
      <!-- JSON -->
      <section>
        <h3 class="font-medium mb-2">JSON 整库备份</h3>
        <p class="text-paper-500 mb-3 leading-relaxed">
          下载一份完整快照（项目 / 报价 / 收益 / 设置 / 分类 / 公司资料）；换设备或做保险备份时再粘贴或上传恢复。
        </p>
        <div class="flex flex-wrap gap-3">
          <Button variant="default" class="" @click="doExportJson">导出 JSON</Button>
        </div>
        <Textarea
          v-model="raw"
          rows="5"
          placeholder="在此粘贴 JSON 备份文本，或选择文件…"
          class=" mt-3 font-mono text-xs"
        ></Textarea>
        <div class="flex items-center gap-3 mt-2">
          <label class="qs-btn cursor-pointer">
            选择文件
            <input type="file" accept="application/json,.json" class="hidden" @change="onJsonFile" />
          </label>
          <Button variant="default" class="" :disabled="!raw.trim()" @click="doImportJson">导入</Button>
        </div>
      </section>

      <transition name="fade">
        <p
          v-if="msg"
          class="text-center rounded-lg py-2"
          :class="msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
        >
          {{ msg.text }}
        </p>
      </transition>
    </div>
  </BaseModal>
</template>
