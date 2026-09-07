<script setup lang="ts">
/**
 * NumberInput — 统一数字输入组件
 *
 * 集中处理：
 *   - 非法字符过滤（只允许数字、小数点、负号）
 *   - 小数位数控制（根据 step 自动推断或显式 decimalPlaces）
 *   - 取值范围限制（min / max，失焦时自动 clamp）
 *   - 单位切换（可选 units + v-model:unit）
 *   - 聚焦全选（selectOnFocus）
 *   - 数字键盘抽屉（showPad，适配移动端）
 *
 * 用法示例见同目录 NumberInputDemo.vue。
 */
import { computed, nextTick, ref, watch } from 'vue';

export interface NumberUnit {
  value: string;
  label: string;
}

export interface NumberInputProps {
  modelValue: number | null | undefined;
  min?: number;
  max?: number;
  step?: number;
  decimalPlaces?: number;
  placeholder?: string;
  unit?: string;
  units?: NumberUnit[];
  modelUnit?: string;
  disabled?: boolean;
  readonly?: boolean;
  selectOnFocus?: boolean;
  allowNegative?: boolean;
  allowEmpty?: boolean;
  showControls?: boolean;
  showPad?: boolean;
  size?: 'sm' | 'md' | 'lg';
  inputClass?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<NumberInputProps>(), {
  step: 1,
  placeholder: '0',
  selectOnFocus: true,
  allowNegative: false,
  allowEmpty: false,
  showControls: false,
  showPad: false,
  size: 'md',
});

const emit = defineEmits<{
  'update:modelValue': [value: number | null];
  'update:modelUnit': [value: string];
  change: [value: number | null];
  focus: [e: FocusEvent];
  blur: [e: FocusEvent];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const displayValue = ref('');
const isFocused = ref(false);
const padOpen = ref(false);
const padDraft = ref('');
const padError = ref('');

const resolvedDecimalPlaces = computed(() => {
  if (typeof props.decimalPlaces === 'number') return Math.max(0, Math.min(15, props.decimalPlaces));
  const stepStr = String(props.step);
  if (stepStr.includes('e')) return 0;
  const idx = stepStr.indexOf('.');
  return idx === -1 ? 0 : Math.max(0, stepStr.length - idx - 1);
});

const effectiveMin = computed(() => (typeof props.min === 'number' ? props.min : undefined));
const effectiveMax = computed(() => (typeof props.max === 'number' ? props.max : undefined));

const resolvedUnit = computed({
  get: () => props.modelUnit ?? props.unit ?? '',
  set: (v: string) => emit('update:modelUnit', v),
});

const hasUnits = computed(() => (props.units?.length ?? 0) > 0);

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-2 py-1 text-xs';
    case 'lg':
      return 'px-4 py-3 text-lg';
    default:
      return 'px-3 py-2 text-sm';
  }
});

function roundToDecimalPlaces(value: number): number {
  const n = resolvedDecimalPlaces.value;
  if (n === 0) return Math.trunc(value);
  const factor = Math.pow(10, n);
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  const rounded = roundToDecimalPlaces(value);
  const fixed = rounded.toFixed(resolvedDecimalPlaces.value);
  const withoutTrailingZeros = fixed.replace(/\.?0+$/, '');
  const text = withoutTrailingZeros.replace(/^-0$/, '0');
  return text || '0';
}

function clampValue(value: number): number {
  if (Number.isNaN(value)) return effectiveMin.value ?? 0;
  let v = value;
  if (effectiveMin.value !== undefined && v < effectiveMin.value) v = effectiveMin.value;
  if (effectiveMax.value !== undefined && v > effectiveMax.value) v = effectiveMax.value;
  return v;
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '.') return props.allowEmpty ? null : 0;
  const v = Number(trimmed);
  if (Number.isNaN(v)) return props.allowEmpty ? null : 0;
  return v;
}

function sanitizeText(text: string): string {
  let out = '';
  let hasDot = false;
  let hasMinus = false;
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') {
      out += ch;
      continue;
    }
    if (ch === '.' && !hasDot) {
      hasDot = true;
      out += ch;
      continue;
    }
    if (ch === '-' && !hasMinus && out === '') {
      if (props.allowNegative) {
        hasMinus = true;
        out += ch;
      }
      continue;
    }
  }
  return out;
}

function trimToDecimalPlaces(text: string): string {
  const idx = text.indexOf('.');
  if (idx === -1) return text;
  const max = resolvedDecimalPlaces.value;
  if (max === 0) return text.slice(0, idx);
  return text.slice(0, idx + 1 + max);
}

function commitValue(raw: string, shouldClamp = true) {
  let text = sanitizeText(raw);
  if (text === '-' || text === '.') {
    displayValue.value = text;
    return;
  }
  let v = parseNumber(text);
  if (v !== null && !Number.isInteger(v) && resolvedDecimalPlaces.value >= 0) {
    v = roundToDecimalPlaces(v);
  }
  if (shouldClamp && v !== null) v = clampValue(v);
  displayValue.value = v === null ? '' : formatNumber(v);
  emit('update:modelValue', v);
  if (shouldClamp) emit('change', v);
}

function syncFromModel() {
  if (!isFocused.value) {
    displayValue.value = formatNumber(props.modelValue);
  }
}

watch(() => props.modelValue, syncFromModel, { immediate: true });

function onInput(e: Event) {
  const el = e.target as HTMLInputElement;
  const sel = el.selectionStart ?? 0;
  const before = displayValue.value;
  let text = el.value;
  let dotInserted = false;
  let minusInserted = false;

  if (text.length > before.length && text.length - before.length === 1) {
    const inserted = text.slice(0, sel).slice(-1);
    dotInserted = inserted === '.';
    minusInserted = inserted === '-';
  }

  text = sanitizeText(text);

  if (dotInserted && !text.includes('.') && resolvedDecimalPlaces.value > 0) {
    text = text + '.';
  }
  if (minusInserted && props.allowNegative && !text.startsWith('-')) {
    text = '-' + text;
  }

  if (text.startsWith('-0') && text.length > 2 && text[2] >= '0' && text[2] <= '9') {
    text = '-' + text.slice(2);
  }

  // 键盘输入时允许暂时超过小数位，失焦/保存时再统一舍入，
  // 避免中间截断导致 12.3456 → 12.34 的精度丢失。
  displayValue.value = text;
  padDraft.value = text;

  nextTick(() => {
    let pos = sel;
    if (displayValue.value.length < before.length) pos--;
    pos = Math.max(0, Math.min(pos, displayValue.value.length));
    el.setSelectionRange(pos, pos);
  });
}

function onKeyDown(e: KeyboardEvent) {
  const allowed = [
    'Backspace',
    'Delete',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
    'Tab',
    'Enter',
    'Escape',
  ];
  if (allowed.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === '-' && props.allowNegative) {
    const el = e.target as HTMLInputElement;
    const sel = el.selectionStart ?? 0;
    if (sel !== 0 || displayValue.value.includes('-')) {
      e.preventDefault();
    }
    return;
  }

  if (e.key === '.') {
    if (displayValue.value.includes('.') || resolvedDecimalPlaces.value === 0) {
      e.preventDefault();
    }
    return;
  }

  if (e.key < '0' || e.key > '9') {
    e.preventDefault();
  }
}

function onFocus(e: FocusEvent) {
  isFocused.value = true;
  if (props.selectOnFocus) {
    nextTick(() => {
      const el = e.target as HTMLInputElement | null;
      el?.select();
    });
  }
  emit('focus', e);
}

function onBlur(e: FocusEvent) {
  isFocused.value = false;
  commitValue(displayValue.value, true);
  emit('blur', e);
}

function adjust(delta: number) {
  const current = props.modelValue ?? 0;
  const newValue = clampValue(Number((current + delta).toFixed(resolvedDecimalPlaces.value)));
  emit('update:modelValue', newValue);
  emit('change', newValue);
}

/* ---------- 数字键盘 ---------- */

function openPad() {
  if (props.disabled || props.readonly || !props.showPad) return;
  padDraft.value = displayValue.value === '' ? '' : displayValue.value;
  padError.value = '';
  padOpen.value = true;
}

function closePad() {
  padOpen.value = false;
}

function padInput(key: string) {
  if (key === 'backspace') {
    padDraft.value = padDraft.value.slice(0, -1);
    padError.value = '';
    return;
  }
  if (key === 'clear') {
    padDraft.value = '';
    padError.value = '';
    return;
  }
  if (key === '.' && (padDraft.value.includes('.') || resolvedDecimalPlaces.value === 0)) return;
  if (key === '-' && (!props.allowNegative || padDraft.value !== '')) return;

  let next = padDraft.value + key;
  next = sanitizeText(next);
  next = trimToDecimalPlaces(next);
  padDraft.value = next;
  padError.value = '';
}

function padApply() {
  const v = parseNumber(padDraft.value);
  if (effectiveMin.value !== undefined && v !== null && v < effectiveMin.value) {
    padError.value = `不能小于 ${effectiveMin.value}`;
    return;
  }
  if (effectiveMax.value !== undefined && v !== null && v > effectiveMax.value) {
    padError.value = `不能大于 ${effectiveMax.value}`;
    return;
  }
  commitValue(padDraft.value, true);
  closePad();
}

function padCancel() {
  closePad();
}

const padKeys = computed(() => [
  ['1', '2', '3', 'backspace'],
  ['4', '5', '6', 'clear'],
  ['7', '8', '9', props.allowNegative ? '-' : ''],
  ['.', '0', 'save', ''],
]);
</script>

<template>
  <div class="number-input relative w-full">
    <div
      class="flex items-center rounded-xl border border-paper-300/60 bg-white transition focus-within:border-coral-300 focus-within:ring-1 focus-within:ring-coral-300/30"
      :class="[props.disabled && 'opacity-60 cursor-not-allowed', props.readonly && 'bg-paper-50']"
    >
      <button
        v-if="showControls"
        type="button"
        class="shrink-0 px-3 py-2 text-paper-500 active:text-coral-500 disabled:opacity-30"
        :disabled="disabled || readonly || (effectiveMin !== undefined && (modelValue ?? 0) <= effectiveMin)"
        @click="adjust(-step)"
        aria-label="减少"
      >
        −
      </button>

      <input
        ref="inputRef"
        type="text"
        inputmode="decimal"
        :value="displayValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :aria-label="ariaLabel ?? placeholder"
        class="min-w-0 flex-1 bg-transparent outline-none text-ink tabular-nums text-right"
        :class="[sizeClass, inputClass, showPad && !disabled && !readonly && 'cursor-pointer']"
        @input="onInput"
        @keydown="onKeyDown"
        @focus="onFocus"
        @blur="onBlur"
        @click="openPad"
      />

      <span
        v-if="unit && !hasUnits"
        class="shrink-0 pr-3 text-xs text-paper-500 select-none"
        :class="size === 'lg' ? 'text-sm' : ''"
      >
        {{ unit }}
      </span>

      <div v-if="hasUnits" class="flex shrink-0 items-center pr-1 gap-0.5">
        <button
          v-for="u in units"
          :key="u.value"
          type="button"
          class="px-2 py-1 rounded-md text-xs transition"
          :class="
            resolvedUnit === u.value
              ? 'bg-coral-100 text-coral-700 font-medium'
              : 'text-paper-500 hover:bg-paper-100'
          "
          @click="resolvedUnit = u.value"
        >
          {{ u.label }}
        </button>
      </div>

      <button
        v-if="showControls"
        type="button"
        class="shrink-0 px-3 py-2 text-paper-500 active:text-coral-500 disabled:opacity-30"
        :disabled="disabled || readonly || (effectiveMax !== undefined && (modelValue ?? 0) >= effectiveMax)"
        @click="adjust(step)"
        aria-label="增加"
      >
        +
      </button>
    </div>

    <Transition name="fade">
      <div
        v-if="padOpen"
        class="fixed inset-0 z-50 flex flex-col justify-end bg-black/30 backdrop-blur-sm"
        @click.self="padCancel"
      >
        <div
          class="w-full max-w-md mx-auto bg-white rounded-t-2xl shadow-2xl"
          style="padding-bottom: env(safe-area-inset-bottom, 0px)"
        >
          <div class="px-4 pt-4 pb-2 border-b border-paper-200">
            <div class="flex items-center justify-between">
              <span class="text-xs text-paper-500">{{ placeholder }}</span>
              <button
                type="button"
                class="text-xs text-paper-400 px-2 py-1"
                @click="padCancel"
                aria-label="取消"
              >
                取消
              </button>
            </div>
            <div class="mt-2 flex items-baseline justify-center gap-1 py-3">
              <span
                class="text-4xl font-semibold text-ink tabular-nums tracking-tight"
                :class="padDraft === '' && 'text-paper-300'"
              >
                {{ padDraft || '0' }}
              </span>
              <span v-if="resolvedUnit" class="text-sm text-paper-500">{{ resolvedUnit }}</span>
            </div>
            <div v-if="padError" class="text-center text-xs text-red-500 mb-1">{{ padError }}</div>
          </div>

          <div class="grid grid-cols-4 gap-2 p-3 bg-paper-50">
            <template v-for="(row, r) in padKeys" :key="r">
              <button
                v-for="key in row"
                :key="key"
                type="button"
                :disabled="!key"
                class="h-14 rounded-xl text-lg font-medium transition active:scale-95 flex items-center justify-center"
                :class="
                  key === 'save'
                    ? 'col-span-1 bg-coral-500 text-white shadow active:bg-coral-600'
                    : key === 'backspace' || key === 'clear'
                      ? 'bg-white text-paper-600 shadow-sm active:bg-paper-100'
                      : 'bg-white text-ink shadow-sm active:bg-paper-100'
                "
                @click="key === 'save' ? padApply() : padInput(key)"
              >
                <template v-if="key === 'backspace'">⌫</template>
                <template v-else-if="key === 'clear'">C</template>
                <template v-else-if="key === 'save'">保存</template>
                <template v-else>{{ key }}</template>
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.number-input :deep(input)::placeholder {
  color: #9e907e;
}
</style>
