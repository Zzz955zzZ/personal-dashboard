<script setup lang="ts">
/**
 * 数据备份 / 导入弹窗。
 * - 导出：下载当前 pdash_v4 快照为 JSON 文件。
 * - 导入：粘贴或上传「旧版 / 其他设备」的 pdash_v4 原文，走 store.importRaw，
 *        复用与自动加载一致的归一化逻辑，旧格式自动迁移。
 */
import { ref, watch } from 'vue';
import { useDietStore } from '@/modules/diet';
import BaseModal from '@/shared/components/BaseModal.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const store = useDietStore();
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

function doExport(): void {
  const text = store.exportJson();
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  a.href = url;
  a.download = `pdash-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  msg.value = { type: 'ok', text: '已导出当前全部数据。' };
}

async function onFile(e: Event): Promise<void> {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  raw.value = await f.text();
}

function doImport(): void {
  const text = raw.value.trim();
  if (!text) {
    msg.value = { type: 'err', text: '请先粘贴或选择备份文件。' };
    return;
  }
  const r = store.importRaw(text);
  if (r.ok) {
    msg.value = { type: 'ok', text: '导入成功，数据已写入本地。' };
    raw.value = '';
  } else {
    msg.value = { type: 'err', text: r.error ?? '导入失败。' };
  }
}
</script>

<template>
  <BaseModal :open="open" title="数据 · 备份与导入" width="md" @close="emit('close')">
    <div class="space-y-6 text-sm">
      <!-- 导出 -->
      <section>
        <h3 class="font-medium mb-2">导出当前数据</h3>
        <p class="text-paper-500 mb-3 leading-relaxed">
          下载一份 <code>pdash_v4</code> 快照（JSON）。换设备或做保险备份时，用下面的「导入」把它恢复回去。
        </p>
        <button
          class="px-4 py-2 rounded-xl bg-coral-200 hover:bg-coral-300 text-ink font-medium transition-colors"
          @click="doExport"
        >
          导出 JSON
        </button>
      </section>

      <div class="h-px bg-paper-300/60"></div>

      <!-- 导入 -->
      <section>
        <h3 class="font-medium mb-2">导入 v1 / 其他设备的数据</h3>
        <p class="text-paper-500 mb-3 leading-relaxed">
          把旧版 <code>dashboard.html</code> 或其他设备上的 <code>pdash_v4</code> 原文粘贴进来，或选择备份文件。
          旧格式会自动迁移，不会丢数据。
        </p>
        <p class="text-[12px] text-paper-500 mb-3 leading-relaxed bg-coral-100/60 rounded-lg p-3">
          怎么拿到旧数据：打开旧的 <code>dashboard.html</code> → 按 F12 打开控制台 → 输入
          <code>localStorage.getItem('pdash_v4')</code> → 复制输出的整段文字粘到这里即可。
          <br />（如果新站点与旧站点同源，打开即自动继承，无需手动导入。）
        </p>
        <textarea
          v-model="raw"
          rows="6"
          placeholder="在此粘贴 pdash_v4 的 JSON 文本…"
          class="w-full rounded-xl border border-paper-300 bg-white/70 p-3 font-mono text-xs text-ink resize-y focus:outline-none focus:ring-2 focus:ring-coral-300"
        ></textarea>
        <div class="flex items-center gap-3 mt-3">
          <label
            class="px-3 py-2 rounded-xl border border-paper-300 hover:bg-coral-100 cursor-pointer transition-colors text-paper-600"
          >
            选择文件
            <input type="file" accept="application/json,.json" class="hidden" @change="onFile" />
          </label>
          <button
            class="px-4 py-2 rounded-xl bg-ink text-coral-50 hover:opacity-90 font-medium transition-opacity disabled:opacity-40"
            :disabled="!raw.trim()"
            @click="doImport"
          >
            导入
          </button>
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
