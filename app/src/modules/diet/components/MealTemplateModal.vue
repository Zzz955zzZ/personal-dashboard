<script setup lang="ts">
/** 套餐模板管理：新建 / 编辑 / 列表 */
import { computed, reactive, ref, watch } from 'vue';

import BaseModal from '@/shared/components/BaseModal.vue';
import IngredientChipPicker from './IngredientChipPicker.vue';
import { MEAL_TYPES, mealTypeLabel } from '../constants';
import { useDietStore } from '../store/diet-store';
import type { IngredientCategory, MealTemplate, MealType } from '../types';

const props = defineProps<{ open: boolean; editing: MealTemplate | null }>();
const emit = defineEmits<{ close: []; edit: [tmpl: MealTemplate | null] }>();

const store = useDietStore();

const form = reactive<{
  name: string;
  emoji: string;
  isDefault: boolean;
  defaultMealType: MealType;
  items: Array<{ ingredientId: number; amount: number }>;
}>({ name: '', emoji: '🍽️', isDefault: false, defaultMealType: 'breakfast', items: [] });

const search = ref('');

watch(
  () => [props.open, props.editing] as const,
  ([open, editing]) => {
    if (!open) return;
    search.value = '';
    if (editing) {
      Object.assign(form, {
        name: editing.name,
        emoji: editing.emoji || '🍽️',
        isDefault: !!editing.isDefault,
        defaultMealType: editing.defaultMealType || 'breakfast',
        items: (editing.items || []).map((i) => ({ ...i })),
      });
    } else {
      Object.assign(form, {
        name: '',
        emoji: '🍽️',
        isDefault: false,
        defaultMealType: 'breakfast',
        items: [],
      });
    }
  },
  { immediate: true },
);

/** 已加入的食材不再出现在选择器里 */
const pickerSource = computed(() => {
  const added = form.items.map((x) => x.ingredientId);
  return store.ingredients.filter((i) => !added.includes(i.id));
});

/** 按类别给个合理默认克重，省得每条都手填 */
const DEFAULT_AMOUNT: Record<IngredientCategory, number> = {
  protein: 100,
  carbs: 150,
  fat: 20,
  veg: 100,
};

function addItem(id: number): void {
  const ing = store.findIng(id);
  if (!ing) return;
  form.items.push({ ingredientId: id, amount: DEFAULT_AMOUNT[ing.category] ?? 100 });
}

function removeItem(idx: number): void {
  form.items.splice(idx, 1);
}

function submit(): void {
  store.saveTemplate(
    {
      name: form.name.trim(),
      emoji: form.emoji || '🍽️',
      isDefault: form.isDefault,
      defaultMealType: form.defaultMealType,
      items: form.items.map((i) => ({ ingredientId: i.ingredientId, amount: i.amount })),
    },
    props.editing ? props.editing.id : null,
  );
  emit('close');
}

function removeTemplate(id: number): void {
  if (!window.confirm('确定删除此套餐模板？')) return;
  store.deleteTemplate(id);
}

const INPUT_CLS =
  'w-full px-4 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300';
const LABEL_CLS = 'text-[11px] uppercase tracking-wide2 text-paper-500';
</script>

<template>
  <BaseModal
    :open="open"
    :title="editing ? '编辑套餐模板' : '新建套餐模板'"
    width="lg"
    scrollable
    @close="emit('close')"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div>
        <label :class="LABEL_CLS">模板名称 *</label>
        <input
          v-model="form.name"
          required
          type="text"
          placeholder="例如：我的标准早餐"
          :class="['mt-1.5', INPUT_CLS]"
        />
      </div>

      <div class="flex gap-3">
        <div class="flex-1">
          <label :class="LABEL_CLS">图标</label>
          <input
            v-model="form.emoji"
            class="mt-1.5 w-full px-4 py-2 rounded-lg border border-paper-300/60 bg-white text-sm"
            placeholder="🍽️"
          />
        </div>
        <div class="flex-1">
          <label :class="LABEL_CLS">默认餐次</label>
          <select
            v-model="form.defaultMealType"
            class="mt-1.5 w-full px-4 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
          >
            <option v-for="m in MEAL_TYPES" :key="m.key" :value="m.key">{{ m.icon }} {{ m.label }}</option>
          </select>
        </div>
      </div>

      <div>
        <label :class="LABEL_CLS">食材列表</label>

        <div class="space-y-2 my-2 max-h-48 overflow-y-auto">
          <div
            v-for="(item, idx) in form.items"
            :key="`${item.ingredientId}-${idx}`"
            class="flex items-center gap-2 p-2 rounded-lg border border-paper-300/60 bg-white"
          >
            <span class="text-sm">{{ store.findIng(item.ingredientId)?.emoji || '?' }}</span>
            <span class="text-sm flex-1 truncate">
              {{ store.findIng(item.ingredientId)?.name || item.ingredientId }}
            </span>
            <input
              v-model.number="item.amount"
              type="number"
              min="1"
              class="w-20 px-2 py-1 rounded border border-paper-300/60 bg-white text-xs text-right"
            />
            <span class="text-[11px] text-paper-400">g</span>
            <button type="button" class="text-red-400 text-xs hover:font-bold" @click="removeItem(idx)">
              ×
            </button>
          </div>
          <div v-if="!form.items.length" class="text-center text-paper-400 py-4 text-xs">
            从下方选择食材加入模板
          </div>
        </div>

        <IngredientChipPicker
          v-model:search="search"
          :source="pickerSource"
          :last-selected="store.ingLastSelected"
          placeholder="搜索食材…"
          always-open
          max-height="max-h-32"
          empty-text="没有可添加的食材"
          @pick="addItem"
        />
      </div>

      <div>
        <label class="flex items-center gap-2 cursor-pointer select-none text-xs text-paper-600">
          <input v-model="form.isDefault" type="checkbox" class="accent-coral-400 rounded" />
          设为默认早餐模板（新日期自动填充）
        </label>
      </div>

      <div class="flex gap-3 mt-1">
        <button
          type="button"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-paper-300 hover:bg-coral-50"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          type="submit"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-coral-400 text-white hover:opacity-90"
        >
          保存模板
        </button>
      </div>
    </form>

    <div v-if="store.mealTemplates.length && !editing" class="mt-6 pt-5 border-t border-paper-300/60">
      <div class="text-[11px] uppercase tracking-wide2 text-paper-500 mb-3">已保存的模板</div>
      <div class="space-y-2">
        <div
          v-for="tmpl in store.mealTemplates"
          :key="tmpl.id"
          class="flex items-center gap-3 p-3 rounded-xl border border-paper-300/60 bg-white/70 group"
        >
          <span class="text-lg">{{ tmpl.emoji || '🍽️' }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ tmpl.name }}</div>
            <div class="text-[11px] text-paper-400">
              {{ tmpl.items.length }} 种 · {{ mealTypeLabel(tmpl.defaultMealType) }}
              <span v-if="tmpl.isDefault" class="text-coral-500">· 默认</span>
            </div>
          </div>
          <div class="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              class="text-paper-400 hover:text-coral-500 text-xs px-2"
              @click="emit('edit', tmpl)"
            >
              编辑
            </button>
            <button
              type="button"
              class="text-paper-400 hover:text-red-500 text-xs px-2"
              @click="removeTemplate(tmpl.id)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>
