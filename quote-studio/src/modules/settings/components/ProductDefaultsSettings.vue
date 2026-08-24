<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
/**
 * 产品默认设置：单位选项 + 默认单位 + 产品状态/阶段选项。
 */
import { ref } from 'vue';

import { useSettingsStore } from '@/modules/settings';
import { icon } from '@/shared/icons';

const settings = useSettingsStore();

const newUnit = ref('');
const newStatusName = ref('');
const newStatusColor = ref('#5C4F42');
const newSalePriceUnit = ref('');

function addUnit(): void {
  if (!newUnit.value.trim()) return;
  settings.addUnitOption(newUnit.value.trim());
  newUnit.value = '';
}

function removeUnit(u: string): void {
  if (window.confirm(`删除单位「${u}」？`)) {
    settings.removeUnitOption(u);
  }
}

function addSalePriceUnit(): void {
  if (!newSalePriceUnit.value.trim()) return;
  settings.addSalePriceUnitOption(newSalePriceUnit.value.trim());
  newSalePriceUnit.value = '';
}

function removeSalePriceUnit(u: string): void {
  if (window.confirm(`删除售价单位「${u}」？`)) {
    settings.removeSalePriceUnitOption(u);
  }
}

function addStatus(): void {
  const name = newStatusName.value.trim();
  if (!name) return;
  settings.addProductStatusOption({ name, color: newStatusColor.value });
  newStatusName.value = '';
  newStatusColor.value = '#5C4F42';
}

function removeStatus(id: string, name: string): void {
  if (window.confirm(`删除状态「${name}」？已应用该状态的产品将变为无状态。`)) {
    settings.removeProductStatusOption(id);
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- 单位 -->
    <div>
      <h2 class="font-medium text-lg text-ink">单位选项</h2>
      <p class="text-sm text-paper-500 mt-1">报价单数量列可选择的单位，以及新建产品时的默认单位。</p>

      <div class="qs-card p-4 mt-4 space-y-4">
        <div>
          <Label class="">默认单位</Label>
          <Select
            :model-value="settings.settings.defaultUnit"
            @update:model-value="settings.setDefaultUnit"
            class="max-w-xs"
          >
            <SelectTrigger class="mt-1.5"><SelectValue placeholder="默认单位" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="u in settings.settings.unitOptions" :key="u" :value="u">{{ u }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label class="">可选单位</Label>
          <div class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="u in settings.settings.unitOptions"
              :key="u"
              class="inline-flex items-center gap-1 px-2 py-1 rounded border border-paper-200 bg-paper-50 text-sm"
            >
              {{ u }}
              <button class="text-paper-400 hover:text-red-600" @click="removeUnit(u)">
                <span v-html="icon('x')"></span>
              </button>
            </span>
          </div>
          <div class="flex items-center gap-2 mt-3 max-w-md">
            <Input
              v-model="newUnit"
              type="text"
              placeholder="新增单位（如：盒、卷、吨）"
              class=" flex-1"
              @keyup.enter="addUnit"
             />
            <Button variant="default" class="" @click="addUnit">
              <span v-html="icon('plus')"></span> 添加
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- 售价单位 -->
    <div>
      <h2 class="font-medium text-lg text-ink">售价单位</h2>
      <p class="text-sm text-paper-500 mt-1">报价单售价列可选择的单位，以及新建/默认售价单位（可与数量单位不同）。</p>

      <div class="qs-card p-4 mt-4 space-y-4">
        <div>
          <Label class="">默认售价单位</Label>
          <Select
            :model-value="settings.settings.defaultSalePriceUnit"
            @update:model-value="settings.setDefaultSalePriceUnit"
            class="max-w-xs"
          >
            <SelectTrigger class="mt-1.5"><SelectValue placeholder="默认售价单位" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="u in settings.settings.salePriceUnitOptions" :key="u" :value="u">{{ u }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label class="">可选售价单位</Label>
          <div class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="u in settings.settings.salePriceUnitOptions"
              :key="u"
              class="inline-flex items-center gap-1 px-2 py-1 rounded border border-paper-200 bg-paper-50 text-sm"
            >
              {{ u }}
              <button class="text-paper-400 hover:text-red-600" @click="removeSalePriceUnit(u)">
                <span v-html="icon('x')"></span>
              </button>
            </span>
          </div>
          <div class="flex items-center gap-2 mt-3 max-w-md">
            <Input
              v-model="newSalePriceUnit"
              type="text"
              placeholder="新增售价单位（如：件、m2、h、天）"
              class=" flex-1"
              @keyup.enter="addSalePriceUnit"
             />
            <Button variant="default" class="" @click="addSalePriceUnit">
              <span v-html="icon('plus')"></span> 添加
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态 -->
    <div>
      <h2 class="font-medium text-lg text-ink">产品状态 / 阶段</h2>
      <p class="text-sm text-paper-500 mt-1">每个产品可标记状态（如叫货、到货、已付），按颜色分类。修改或移除状态需二次确认。</p>

      <div class="qs-card p-4 mt-4 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label class="">状态名称</Label>
            <Input
              v-model="newStatusName"
              type="text"
              placeholder="例如：叫货"
              class=" mt-1.5"
              @keyup.enter="addStatus"
             />
          </div>
          <div>
            <Label class="">颜色</Label>
            <div class="flex items-center gap-2 mt-1.5">
              <input v-model="newStatusColor" type="color" class="w-10 h-10 rounded border border-paper-200 p-0.5" />
              <Button variant="default" class="" @click="addStatus">
                <span v-html="icon('plus')"></span> 添加状态
              </Button>
            </div>
          </div>
        </div>

        <div class="divide-y divide-paper-200/70">
          <div
            v-for="s in settings.settings.productStatusOptions"
            :key="s.id"
            class="flex items-center justify-between py-3"
          >
            <div class="flex items-center gap-3">
              <input
                type="color"
                :value="s.color"
                class="w-8 h-8 rounded border border-paper-200 p-0.5"
                @input="settings.updateProductStatusOption(s.id, { color: ($event.target as HTMLInputElement).value })"
              />
              <input
                :value="s.name"
                class="bg-transparent text-sm text-ink outline-none border-b border-transparent focus:border-paper-300 py-0.5"
                @input="settings.updateProductStatusOption(s.id, { name: ($event.target as HTMLInputElement).value })"
              />
            </div>
            <button class="text-paper-400 hover:text-red-600" @click="removeStatus(s.id, s.name)">
              <span v-html="icon('trash')"></span>
            </button>
          </div>
          <div v-if="settings.settings.productStatusOptions.length === 0" class="py-6 text-center text-sm text-paper-400">
            还没有自定义状态。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
