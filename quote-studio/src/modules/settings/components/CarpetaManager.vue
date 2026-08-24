<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
/**
 * 档案夹管理：增 / 删 / 改名 / 改色 / 拖拽排序 / 恢复默认。
 * 风格与 CategoryManager 一致；无 emoji，棕调色板。
 */
import { onMounted, ref } from 'vue';

import { useSettingsStore } from '@/modules/settings';
import { icon } from '@/shared/icons';

const settings = useSettingsStore();
onMounted(() => settings.hydrate());

const newName = ref('');

function add(): void {
  const n = newName.value.trim();
  if (!n) return;
  settings.addCarpeta({ name: n });
  newName.value = '';
}

const dragId = ref<string | null>(null);
function onDragStart(e: DragEvent, id: string): void {
  dragId.value = id;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }
}
function onDragOver(e: DragEvent): void {
  e.preventDefault();
}
function onDrop(targetId: string): void {
  const from = dragId.value;
  dragId.value = null;
  if (!from || from === targetId) return;
  const list = settings.sortedCarpetas();
  const without = list.filter((c) => c.id !== from);
  const ti = without.findIndex((c) => c.id === targetId);
  const moved = list.find((c) => c.id === from);
  if (ti < 0 || !moved) return;
  without.splice(ti, 0, moved);
  without.forEach((c, i) => settings.updateCarpeta(c.id, { order: i + 1 }));
}

function remove(id: string, name: string): void {
  if (window.confirm(`删除档案夹「${name}」？其中的项目会自动变为「未归类」。`)) {
    settings.removeCarpeta(id);
  }
}

function resetDefaults(): void {
    if (window.confirm('恢复为默认档案夹（当前自定义档案夹将被覆盖）？')) {
      settings.resetCarpetasToDefaults();
    }
  }
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-medium text-lg text-ink">档案夹（报价单归类）</h2>
      <p class="text-sm text-paper-500 mt-1 leading-relaxed">
        用档案夹把报价单 / 项目归类归档，长期积累也不会变成一堆平铺的列表。报价与收益共用同一套归类。
      </p>
    </div>

    <!-- 新建 -->
    <div class="qs-card p-4 flex items-center gap-2">
      <Input
        v-model="newName"
        type="text"
        placeholder="新建档案夹名称（如：2026 客户 / Usera 区）"
        class=" flex-1"
        @keyup.enter="add"
       />
      <Button variant="default" class="" @click="add">
        <span v-html="icon('plus')"></span> 添加
      </Button>
    </div>

    <!-- 列表 -->
    <div class="qs-card divide-y divide-paper-200/70">
      <div
        v-for="c in settings.sortedCarpetas()"
        :key="c.id"
        class="flex items-center gap-3 px-4 py-3"
        @dragover="onDragOver"
        @drop="onDrop(c.id)"
      >
        <span
          class="text-paper-300 cursor-grab active:cursor-grabbing"
          draggable="true"
          v-html="icon('grip')"
          @dragstart="onDragStart($event, c.id)"
        ></span>
        <input
          type="color"
          :value="c.color"
          class="w-6 h-6 rounded border border-paper-200 bg-white p-0.5 cursor-pointer shrink-0"
          @input="settings.updateCarpeta(c.id, { color: ($event.target as HTMLInputElement).value })"
        />
        <input
          :value="c.name"
          class="flex-1 bg-transparent text-sm text-ink outline-none border-b border-transparent focus:border-paper-300 py-1"
          @input="settings.updateCarpeta(c.id, { name: ($event.target as HTMLInputElement).value })"
        />
        <button
          class="text-paper-400 hover:text-red-600 transition-colors p-1"
          title="删除"
          @click="remove(c.id, c.name)"
        >
          <span v-html="icon('trash')"></span>
        </button>
      </div>
      <div v-if="settings.sortedCarpetas().length === 0" class="px-4 py-6 text-center text-sm text-paper-400">
        还没有档案夹，先在上方添加一个。
      </div>
    </div>

    <div class="flex justify-end">
      <Button variant="default" class=" text-paper-500" @click="resetDefaults">
        <span v-html="icon('rotate')"></span> 恢复默认档案夹
      </Button>
    </div>
  </div>
</template>
