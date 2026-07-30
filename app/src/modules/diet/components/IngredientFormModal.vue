<script setup lang="ts">
/**
 * 新增 / 编辑食材
 *
 * 保留 v1.0 的「输入名称自动填充营养」行为，包括：
 * - 换成另一个已知食材时会重新填充（而不是只填一次）
 * - 自动填充过程用 _aiFillLocked 防止 watch 自触发
 * - 保存时把 detectMicrons 的结果与用户手填标签去重
 */
import { nextTick, reactive, ref, watch } from 'vue';

import BaseModal from '@/shared/components/BaseModal.vue';
import { aiRecognize, catClass, detectMicrons, fmt1 } from '../engine';
import { CAT_DEFS, EMOJI_OPTIONS } from '../constants';
import { useDietStore } from '../store/diet-store';
import type { Ingredient, IngredientCategory, IngredientUnit, Micro } from '../types';

const props = defineProps<{ open: boolean; editing: Ingredient | null }>();
const emit = defineEmits<{ close: [] }>();

const store = useDietStore();

interface IngFormState {
  name: string;
  category: IngredientCategory;
  emoji: string;
  imageData: string;
  imagePreview: string;
  unit: IngredientUnit;
  gramsPerUnit: number;
  nCalories: number;
  nCarbs: number;
  nProtein: number;
  nFat: number;
  microns: Micro[];
  tagsStr: string;
  note: string;
}

function blankForm(): IngFormState {
  return {
    name: '',
    category: 'protein',
    emoji: '🍗',
    imageData: '',
    imagePreview: '',
    unit: 'g',
    gramsPerUnit: 50,
    nCalories: 0,
    nCarbs: 0,
    nProtein: 0,
    nFat: 0,
    microns: [],
    tagsStr: '',
    note: '',
  };
}

const form = reactive<IngFormState>(blankForm());
const aiResult = ref(aiRecognize(''));

/* --- AI 自动填充 ------------------------------------------------------- */
let aiFillLocked = false;
let lastAiName = '';

watch(
  () => form.name,
  (newName) => {
    aiResult.value = aiRecognize(newName);
    if (aiFillLocked || !newName) return;
    const result = aiRecognize(newName.trim());
    if (!result.match || !result.macros) {
      lastAiName = '';
      return;
    }
    if (newName.trim() === lastAiName) return;
    lastAiName = newName.trim();
    aiFillLocked = true;
    form.nCalories = result.macros.calories;
    form.nCarbs = result.macros.carbs;
    form.nProtein = result.macros.protein;
    form.nFat = result.macros.fat;
    if (result.unit) form.unit = result.unit;
    if (result.gramsPerUnit) form.gramsPerUnit = result.gramsPerUnit;
    if (result.note) form.note = result.note;
    void nextTick(() => {
      aiFillLocked = false;
    });
  },
);

/* --- 打开时装载 -------------------------------------------------------- */
watch(
  () => [props.open, props.editing] as const,
  ([open, editing]) => {
    if (!open) return;
    aiFillLocked = true;
    if (editing) {
      lastAiName = editing.name;
      Object.assign(form, {
        name: editing.name,
        category: editing.category,
        emoji: editing.emoji || '',
        imageData: editing.image || '',
        imagePreview: editing.image || '',
        unit: editing.unit === '个' ? '个' : 'g',
        gramsPerUnit: Number(editing.gramsPerUnit) || 50,
        nCalories: editing.nutrition?.calories || 0,
        nCarbs: editing.nutrition?.carbs || 0,
        nProtein: editing.nutrition?.protein || 0,
        nFat: editing.nutrition?.fat || 0,
        microns: Array.isArray(editing.microns) ? editing.microns.map((x) => ({ ...x })) : [],
        tagsStr: (editing.tags || []).join(', '),
        note: editing.note || '',
      } satisfies IngFormState);
    } else {
      lastAiName = '';
      Object.assign(form, blankForm());
    }
    aiResult.value = aiRecognize(form.name);
    void nextTick(() => {
      aiFillLocked = false;
    });
  },
  { immediate: true },
);

function onImage(ev: Event): void {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const data = String(reader.result || '');
    form.imageData = data;
    form.imagePreview = data;
  };
  reader.readAsDataURL(file);
}

function clearImage(): void {
  form.imageData = '';
  form.imagePreview = '';
}

/** 去掉标点后比对，避免「Omega-3」与「Omega3」重复出现 */
function normalize(s: string): string {
  return s.replace(/[^a-zA-Z\u4e00-\u9fff]/g, '');
}

function submit(): void {
  const userTags = form.tagsStr
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const tagSet = new Set(userTags.map(normalize));
  const dedupedMicrons = detectMicrons(form.name.trim()).filter(
    (m) => !tagSet.has(normalize(m.name)),
  );

  store.saveIngredient(
    {
      name: form.name.trim(),
      category: form.category,
      emoji: form.emoji,
      image: form.imageData,
      unit: form.unit === '个' ? '个' : 'g',
      gramsPerUnit: Number(form.gramsPerUnit) || 50,
      tags: userTags,
      nutrition: {
        calories: Number(form.nCalories) || 0,
        carbs: Number(form.nCarbs) || 0,
        protein: Number(form.nProtein) || 0,
        fat: Number(form.nFat) || 0,
      },
      microns: dedupedMicrons,
      note: form.note.trim(),
    },
    props.editing ? props.editing.id : null,
  );
  emit('close');
}

const INPUT_CLS =
  'w-full px-4 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300';
const LABEL_CLS = 'text-[11px] uppercase tracking-wide2 text-paper-500';
</script>

<template>
  <BaseModal
    :open="open"
    :title="editing ? '编辑食材' : '新增食材'"
    width="lg"
    scrollable
    @close="emit('close')"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div>
        <label :class="LABEL_CLS">名称 *</label>
        <input v-model="form.name" required type="text" placeholder="例如：鸡胸肉" :class="['mt-1.5', INPUT_CLS]" />
      </div>

      <div>
        <label :class="LABEL_CLS">分类 *</label>
        <select v-model="form.category" required :class="['mt-1.5', INPUT_CLS]">
          <option v-for="(c, key) in CAT_DEFS" :key="key" :value="key">{{ c.emoji }} {{ c.label }}</option>
        </select>
      </div>

      <div>
        <label :class="LABEL_CLS">计量单位</label>
        <div class="mt-1.5 flex items-center gap-3 flex-wrap">
          <select
            v-model="form.unit"
            class="px-4 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
          >
            <option value="g">克 (g)</option>
            <option value="个">个 (piece)</option>
          </select>
          <div v-if="form.unit === '个'" class="flex items-center gap-2">
            <span class="text-xs text-paper-500">每个约</span>
            <input
              v-model.number="form.gramsPerUnit"
              type="number"
              min="1"
              class="w-20 px-3 py-2 rounded-xl border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
            />
            <span class="text-xs text-paper-500">g</span>
          </div>
        </div>
      </div>

      <div>
        <label :class="LABEL_CLS">图标 Emoji</label>
        <div class="mt-1.5 emoji-grid p-2 rounded-xl border border-paper-300/60 bg-white">
          <button
            v-for="e in EMOJI_OPTIONS"
            :key="e"
            type="button"
            class="emoji-btn"
            :class="form.emoji === e ? 'ring-2 ring-coral-400 rounded-lg' : ''"
            @click="form.emoji = e"
          >
            {{ e }}
          </button>
        </div>
        <input
          v-model="form.emoji"
          class="mt-2 w-full px-4 py-2 rounded-lg border border-paper-300/60 bg-white text-sm"
          placeholder="或输入自定义 emoji"
        />
      </div>

      <div>
        <label :class="LABEL_CLS">产品照片（可选）</label>
        <div class="mt-1.5 flex items-center gap-3">
          <div class="avatar-img shrink-0" style="width: 56px; height: 56px; font-size: 26px">
            <img v-if="form.imagePreview" :src="form.imagePreview" alt="" />
            <span v-else>{{ form.emoji || '📷' }}</span>
          </div>
          <label
            class="px-4 py-2 rounded-xl border border-paper-300/60 text-sm cursor-pointer hover:bg-coral-50 transition-colors"
          >
            上传图片
            <input type="file" accept="image/*" class="hidden" @change="onImage" />
          </label>
          <button
            v-if="form.imageData"
            type="button"
            class="text-red-400 text-sm hover:underline"
            @click="clearImage"
          >
            清除图片
          </button>
        </div>
      </div>

      <div>
        <label :class="LABEL_CLS">营养数据 / 每 100g</label>
        <div class="mt-1.5 grid grid-cols-4 gap-2">
          <input
            v-model.number="form.nCalories"
            type="number"
            step="0.1"
            placeholder="热量(kcal)"
            class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
          />
          <input
            v-model.number="form.nCarbs"
            type="number"
            step="0.1"
            placeholder="碳水(g)"
            class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
          />
          <input
            v-model.number="form.nProtein"
            type="number"
            step="0.1"
            placeholder="蛋白(g)"
            class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
          />
          <input
            v-model.number="form.nFat"
            type="number"
            step="0.1"
            placeholder="脂肪(g)"
            class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
          />
        </div>
      </div>

      <div>
        <label :class="LABEL_CLS">标签（逗号分隔，自定义描述）</label>
        <input
          v-model="form.tagsStr"
          type="text"
          placeholder="高蛋白, 饱腹, 低GI"
          :class="['mt-1.5', INPUT_CLS]"
        />
        <div class="mt-2 flex items-start gap-2">
          <span class="text-[10px] text-paper-400 mt-1 shrink-0">🧬 AI 识别</span>
          <div class="flex-1">
            <template v-if="aiResult.match">
              <div
                v-if="aiResult.macros && form.nCalories"
                class="mb-1.5 px-2.5 py-1.5 rounded-lg border"
                :class="aiResult.estimated ? 'bg-amber-50 border-amber-200/60' : 'bg-green-50 border-green-200/60'"
              >
                <span
                  class="text-[11px] font-medium"
                  :class="aiResult.estimated ? 'text-amber-700' : 'text-green-700'"
                >
                  {{ aiResult.estimated ? '⚡ 已智能估算营养（参考值）' : '✓ 营养数据已自动填充' }}
                </span>
                <span
                  class="text-[10px] ml-1.5"
                  :class="aiResult.estimated ? 'text-amber-600' : 'text-green-600'"
                >
                  {{ fmt1(aiResult.macros.calories) }}kcal · 蛋白{{ fmt1(aiResult.macros.protein) }}g · 碳水{{
                    fmt1(aiResult.macros.carbs)
                  }}g · 脂肪{{ fmt1(aiResult.macros.fat) }}g /100g
                  <template v-if="aiResult.estimated"> · 类别：{{ aiResult.category }}</template>
                </span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="mt in aiResult.micros"
                  :key="mt.name"
                  class="px-2 py-0.5 rounded-full text-[11px] font-medium border"
                  :class="catClass(mt.cat)"
                >
                  {{ mt.name }}
                </span>
              </div>
            </template>
            <span v-else class="text-[11px] text-paper-400">
              输入食材名称（如鸡蛋/螃蟹/三文鱼）自动识别或估算营养数据
            </span>
          </div>
        </div>
      </div>

      <div>
        <label :class="LABEL_CLS">备注</label>
        <textarea
          v-model="form.note"
          rows="2"
          placeholder="简短描述…"
          :class="['mt-1.5 resize-none', INPUT_CLS]"
        ></textarea>
      </div>

      <div class="flex gap-3 mt-1">
        <button
          type="button"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-paper-300 hover:bg-coral-50 transition-colors"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          type="submit"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-coral-400 text-white hover:opacity-90 transition-opacity"
        >
          保存
        </button>
      </div>
    </form>
  </BaseModal>
</template>
