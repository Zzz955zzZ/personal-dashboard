<script setup lang="ts">
/**
 * 大类集中管理（全局唯一）：增删改 + 拖拽排序。
 * 每个大类可展开/折叠，展开后直接维护一组产品模板（名称/型号/备注/默认成本/默认售价/默认单位/照片），
 * 产品模板可新增/编辑/删除/拖拽排序。仅拖拽手柄触发排序拖拽，输入区不受影响。
 */
import { ref } from 'vue';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useSettingsStore } from '@/modules/settings';
import type { CategoryGroup, ProductTemplate } from '@/modules/settings';
import { icon } from '@/shared/icons';

const store = useSettingsStore();

const newGroup = ref('');
const expanded = ref<Record<string, boolean>>({});
const dragGroup = ref<CategoryGroup | null>(null);
const dragTemplate = ref<{ groupId: string; id: string } | null>(null);
const imgTarget = ref<{ groupId: string; id: string } | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

function toggleExpand(gid: string): void {
  expanded.value[gid] = !expanded.value[gid];
}

function addGroup(): void {
  if (!newGroup.value.trim()) return;
  const g = store.addCategoryGroup({ name: newGroup.value.trim() });
  newGroup.value = '';
  expanded.value[g.id] = true;
}
function resetDefaults(): void {
  if (window.confirm('恢复默认将把大类重置为「工种」分类。已有报价行不会删除，但分类关联可能失效。确定继续？')) {
    store.resetCategoryGroupsToDefaults();
  }
}

/* ---- 大类拖拽排序（仅手柄触发）---- */
function onGroupDragStart(e: DragEvent, g: CategoryGroup): void {
  dragGroup.value = g;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', g.id);
  }
}
function onGroupDragOver(e: DragEvent): void {
  e.preventDefault();
}
function onGroupDrop(target: CategoryGroup): void {
  if (!dragGroup.value || dragGroup.value.id === target.id) return;
  reorderGroups(dragGroup.value.id, target.id);
  dragGroup.value = null;
}
function reorderGroups(sourceId: string, targetId: string): void {
  const list = store.categoryGroups.slice().sort((a, b) => a.order - b.order);
  const sIdx = list.findIndex((g) => g.id === sourceId);
  const tIdx = list.findIndex((g) => g.id === targetId);
  if (sIdx < 0 || tIdx < 0) return;
  const [moved] = list.splice(sIdx, 1);
  list.splice(tIdx, 0, moved);
  store.reorderCategoryGroups(list.map((g) => g.id));
}

/* ---- 产品模板 CRUD ---- */
function addTemplate(gid: string): void {
  store.addProductTemplate(gid, {});
  expanded.value[gid] = true;
}
function patchTemplate(gid: string, t: ProductTemplate, patch: Partial<ProductTemplate>): void {
  store.updateProductTemplate(gid, t.id, patch);
}
function removeTemplate(gid: string, tid: string): void {
  if (window.confirm('删除该产品模板？')) store.removeProductTemplate(gid, tid);
}

function onTemplateDragStart(e: DragEvent, gid: string, id: string): void {
  dragTemplate.value = { groupId: gid, id };
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }
}
function onTemplateDrop(gid: string, id: string): void {
  if (!dragTemplate.value) return;
  store.reorderProductTemplates(gid, dragTemplate.value.id, id);
  dragTemplate.value = null;
}

/* ---- 产品模板照片（多图 + 粘贴） ---- */
function pushPhoto(gid: string, tid: string, url: string): void {
  const g = store.getGroup(gid);
  const t = g?.products.find((x) => x.id === tid);
  if (!t) return;
  const urls = [...t.photoUrls, url].filter(Boolean);
  store.updateProductTemplate(gid, tid, { photoUrls: urls });
}
function triggerImg(gid: string, tid: string): void {
  imgTarget.value = { groupId: gid, id: tid };
  fileInput.value?.click();
}
function onImgFile(e: Event): void {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f || !imgTarget.value) return;
  const reader = new FileReader();
  reader.onload = () => {
    const url = String(reader.result || '');
    if (url && imgTarget.value) pushPhoto(imgTarget.value.groupId, imgTarget.value.id, url);
  };
  reader.readAsDataURL(f);
  if (fileInput.value) fileInput.value.value = '';
}
function onTemplatePaste(gid: string, tid: string, e: ClipboardEvent): void {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const it of items) {
    if (it.type.startsWith('image/')) {
      const file = it.getAsFile();
      if (file) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const url = String(reader.result || '');
          if (url) pushPhoto(gid, tid, url);
        };
        reader.readAsDataURL(file);
      }
    }
  }
}
function removeImg(gid: string, tid: string, idx: number): void {
  const g = store.getGroup(gid);
  const t = g?.products.find((x) => x.id === tid);
  if (!t) return;
  const urls = t.photoUrls.filter((_, i) => i !== idx);
  store.updateProductTemplate(gid, tid, { photoUrls: urls });
}

function unitOptionsFor(t: ProductTemplate): string[] {
  const opts = store.settings.unitOptions.slice();
  if (t.defaultUnit && !opts.includes(t.defaultUnit)) opts.push(t.defaultUnit);
  return opts;
}
</script>

<template>
  <div class="space-y-4">
    <!-- 新增大类 + 重置 -->
    <div class="qs-card p-4 flex flex-col sm:flex-row gap-3">
      <div class="flex items-center gap-2 flex-1">
        <Input
          v-model="newGroup"
          type="text"
          placeholder="新增大类名称（如 定制柜）"
          class=" flex-1"
          @keyup.enter="addGroup"
         />
        <Button variant="default" class=" whitespace-nowrap" @click="addGroup">
          <span v-html="icon('plus')"></span> 添加大类
        </Button>
      </div>
      <Button variant="default"
        class=" border-dashed whitespace-nowrap"
        title="将大类恢复为默认工种列表"
        @click="resetDefaults">
        <span v-html="icon('rotate')"></span> 恢复默认工种分类
      </Button>
    </div>

    <!-- 大类列表 -->
    <div
      v-for="g in store.categoryGroups.slice().sort((a, b) => a.order - b.order)"
      :key="g.id"
      class="qs-card overflow-hidden"
      @dragover.prevent="onGroupDragOver"
      @drop="onGroupDrop(g)"
    >
      <!-- 大类标题行 -->
      <div class="flex items-center gap-2 px-3 py-3">
        <span
          class="shrink-0 cursor-grab active:cursor-grabbing text-paper-400 hover:text-paper-600"
          title="拖动排序"
          draggable="true"
          v-html="icon('grip')"
          @dragstart="onGroupDragStart($event, g)"
        ></span>
        <button
          class="shrink-0 w-6 h-6 flex items-center justify-center rounded text-paper-500 hover:bg-paper-100"
          :title="expanded[g.id] ? '折叠' : '展开'"
          @click="toggleExpand(g.id)"
        >
          <span
            class="inline-block transition-transform"
            :class="expanded[g.id] ? 'rotate-90' : ''"
            v-html="icon('chevron-right')"
          ></span>
        </button>
        <Input
          v-focus-next
          :model-value="g.name"
          class=" flex-1"
          placeholder="大类名称"
          @update:model-value="store.updateCategoryGroup(g.id, { name: String($event) })"
         />
        <Input
          v-focus-next
          :model-value="g.nameEs"
          class=" w-56"
          placeholder="西语"
          @update:model-value="store.updateCategoryGroup(g.id, { nameEs: String($event) })"
         />
        <span class="shrink-0 text-[11px] text-paper-400 whitespace-nowrap">{{ g.products.length }} 个产品</span>
        <Button variant="default" class="-danger shrink-0" title="删除大类" @click="store.removeCategoryGroup(g.id)">
          <span v-html="icon('trash')"></span>
        </Button>
      </div>

      <!-- 产品模板面板（展开后） -->
      <div v-if="expanded[g.id]" class="border-t border-paper-200 bg-paper-50/40 px-3 py-2 space-y-1">
        <div
          v-if="g.products.length === 0"
          class="text-xs text-paper-400 py-1"
        >
          该大类还没有产品模板。点击「新增产品模板」添加，添加产品时即可直接多选插入。
        </div>

        <div
          v-for="t in g.products"
          :key="t.id"
          class="rounded-lg border border-paper-200 bg-white px-2 py-1.5"
          @dragover.prevent
          @drop="onTemplateDrop(g.id, t.id)"
        >
          <div class="flex items-center gap-2">
            <span
              class="shrink-0 cursor-grab active:cursor-grabbing text-paper-400 hover:text-paper-600"
              title="拖动排序"
              draggable="true"
              v-html="icon('grip')"
              @dragstart="onTemplateDragStart($event, g.id, t.id)"
            ></span>
            <Input
              v-focus-next
              :model-value="t.name"
              class=" flex-1 min-w-[7rem] text-sm py-1"
              placeholder="产品名称"
              @update:model-value="patchTemplate(g.id, t, { name: String($event) })"
             />
            <Input
              v-focus-next
              :model-value="t.model"
              class=" w-24 text-sm py-1"
              placeholder="型号"
              @update:model-value="patchTemplate(g.id, t, { model: String($event) })"
             />
            <Input
              v-focus-next
              :model-value="t.note"
              class=" w-28 text-sm py-1"
              placeholder="备注"
              @update:model-value="patchTemplate(g.id, t, { note: String($event) })"
             />
            <Input
              v-focus-next
              type="number"
              step="0.01"
              min="0"
              :model-value="t.defaultCost"
              class=" w-20 text-sm py-1"
              placeholder="成本"
              title="默认成本"
              @update:model-value="patchTemplate(g.id, t, { defaultCost: Number($event) })"
             />
            <Input
              v-focus-next
              type="number"
              step="0.01"
              min="0"
              :model-value="t.defaultSalePrice"
              class=" w-20 text-sm py-1"
              placeholder="售价"
              title="默认售价"
              @update:model-value="patchTemplate(g.id, t, { defaultSalePrice: Number($event) })"
             />
            <Select
              :model-value="t.defaultUnit"
              @update:model-value="patchTemplate(g.id, t, { defaultUnit: $event != null ? String($event) : '' })"
            >
              <SelectTrigger class="h-8 w-20 text-xs border-paper-200 bg-white px-2 py-1" title="默认单位">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="u in unitOptionsFor(t)"
                  :key="u"
                  :value="u"
                  class="text-xs"
                >
                  {{ u || '—' }}
                </SelectItem>
              </SelectContent>
            </Select>
            <div
              class="flex items-center gap-1 shrink-0"
              tabindex="0"
              title="点击上传或 Ctrl+V 粘贴截图"
              @paste.prevent="onTemplatePaste(g.id, t.id, $event)"
            >
              <div
                v-for="(url, idx) in t.photoUrls.slice(0, 4)"
                :key="idx"
                class="relative w-6 h-6 rounded overflow-hidden border border-paper-200 group shrink-0"
              >
                <img :src="url" class="w-full h-full object-cover" />
                <button
                  class="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/50 text-white text-[9px]"
                  title="移除"
                  @click="removeImg(g.id, t.id, idx)"
                >
                  ×
                </button>
              </div>
              <Button variant="ghost"
                class=" px-1.5 py-1 shrink-0"
                title="点击上传或粘贴截图"
                @click="triggerImg(g.id, t.id)">
                <span v-html="icon('image')"></span>
              </Button>
            </div>
            <Button variant="default"
              class="-danger shrink-0 px-2 py-1"
              title="删除产品模板"
              @click="removeTemplate(g.id, t.id)">
              <span v-html="icon('trash')"></span>
            </Button>
          </div>
        </div>

        <Button variant="default" class=" border-dashed w-full text-sm py-1.5" @click="addTemplate(g.id)">
          <span v-html="icon('plus')"></span> 新增产品模板
        </Button>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onImgFile" />
  </div>
</template>
