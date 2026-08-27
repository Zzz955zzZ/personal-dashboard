<script setup lang="ts">
/** 新增采购项（全屏页式表单，与库存/菜谱新增保持一致） */
import { computed, ref, watch } from 'vue';

import BaseModal from '@/shared/components/BaseModal.vue';
import IngredientChipPicker from './IngredientChipPicker.vue';
import { unitLabel } from '../engine';
import { useDietStore } from '../store/diet-store';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const store = useDietStore();

const form = ref<{ ingredientId: number | null; qty: number | null }>({ ingredientId: null, qty: null });
const search = ref('');
const pickerOpen = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    form.value = { ingredientId: null, qty: null };
    search.value = '';
    pickerOpen.value = true;
  },
  { immediate: true },
);

const selected = computed(() => (form.value.ingredientId === null ? undefined : store.findIng(form.value.ingredientId)));
const qtyUnitLabel = computed(() => unitLabel(selected.value));
const qtyPlaceholder = computed(() => (qtyUnitLabel.value === '个' ? '1' : '500'));
const canSubmit = computed(() => form.value.ingredientId !== null && form.value.qty !== null && form.value.qty > 0);

function pick(id: number): void {
  form.value.ingredientId = id;
  store.touchIngredient(id);
  if (form.value.qty === null) form.value.qty = store.findIng(id)?.unit === '个' ? 1 : 500;
  pickerOpen.value = false;
}

function clearPick(): void {
  form.value.ingredientId = null;
  search.value = '';
  pickerOpen.value = true;
}

function submit(): void {
  if (!canSubmit.value) return;
  store.addShoppingItem(form.value.ingredientId as number, form.value.qty as number);
  emit('close');
}
</script>

<template>
  <BaseModal :open="open" title="添加采购项" width="full" @close="emit('close')">
    <div class="flex flex-col min-h-0 flex-1">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <IngredientChipPicker
          v-model:search="search"
          v-model:open="pickerOpen"
          :source="store.ingredients"
          :last-selected="store.ingLastSelected"
          :selected-id="form.ingredientId"
          placeholder="搜索并选择食材…"
          @pick="pick"
        />

        <div v-if="selected" class="flex items-center gap-2">
          <span class="text-sm font-medium truncate">{{ selected.emoji }} {{ selected.name }}</span>
          <button type="button" class="text-paper-400 hover:text-red-500 text-xs" @click="clearPick">×</button>
        </div>
        <div v-else class="text-xs text-paper-400">↑ 搜索或点击上方食材进行选择</div>

        <div>
          <label class="text-[11px] uppercase tracking-wide2 text-paper-500">数量（{{ qtyUnitLabel }}）</label>
          <input
            v-model.number="form.qty"
            type="number"
            :placeholder="qtyPlaceholder"
            min="0.1"
            step="0.1"
            class="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
          />
        </div>
      </form>

      <div class="flex gap-3 mt-6 pt-4 border-t border-paper-200/60">
        <button
          type="button"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-paper-300 hover:bg-coral-50"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          type="submit"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-coral-400 text-white hover:opacity-90 disabled:opacity-40"
          :disabled="!canSubmit"
          @click="submit"
        >
          添加
        </button>
      </div>
    </div>
  </BaseModal>
</template>
