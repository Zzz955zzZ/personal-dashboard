<script setup lang="ts">
/**
 * NumberInput 使用示例
 * 展示校验、范围限制、小数位数控制与数字键盘的实际效果。
 */
import { reactive, ref } from 'vue';
import NumberInput from './NumberInput.vue';

const weight = ref<number | null>(720);
const weightUnit = ref('g');

const macros = reactive({
  calories: 2491,
  carbs: 555.8,
  protein: 56.9,
  fat: 6.5,
});

const percent = ref<number | null>(null);
const negative = ref(-3);

const units = [
  { value: 'g', label: '克' },
  { value: '两', label: '两' },
  { value: '勺', label: '勺' },
];
</script>

<template>
  <div class="min-h-screen bg-[#fef5f4] p-4 text-ink">
    <h1 class="text-lg font-semibold mb-4">NumberInput 统一数字输入组件</h1>

    <section class="space-y-5 max-w-md mx-auto">
      <!-- 示例 1：食材重量（带数字键盘 + 单位切换） -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-paper-200">
        <h2 class="text-sm font-semibold mb-3">1. 重量输入（数字键盘 + 单位）</h2>
        <p class="text-xs text-paper-500 mb-3">范围 0–2000，保留 1 位小数，可切换克/两/勺</p>
        <NumberInput
          v-model="weight"
          v-model:unit="weightUnit"
          :min="0"
          :max="2000"
          :step="0.1"
          placeholder="重量"
          :units="units"
          show-pad
          size="lg"
          class="font-medium"
        />
        <div class="mt-3 text-xs text-paper-600">
          当前值：<span class="font-semibold text-ink">{{ weight ?? 'null' }}</span>
          <span class="ml-1">{{ weightUnit }}</span>
        </div>
      </div>

      <!-- 示例 2：营养成分（范围限制 + 小数位） -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-paper-200">
        <h2 class="text-sm font-semibold mb-3">2. 营养成分（范围 + 小数位）</h2>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[11px] text-paper-500 block mb-1">热量 (kcal)</label>
            <NumberInput v-model="macros.calories" :min="0" :max="9999" :step="1" unit="kcal" />
          </div>
          <div>
            <label class="text-[11px] text-paper-500 block mb-1">碳水 (g)</label>
            <NumberInput v-model="macros.carbs" :min="0" :max="999" :step="0.1" unit="g" />
          </div>
          <div>
            <label class="text-[11px] text-paper-500 block mb-1">蛋白质 (g)</label>
            <NumberInput v-model="macros.protein" :min="0" :max="999" :step="0.1" unit="g" />
          </div>
          <div>
            <label class="text-[11px] text-paper-500 block mb-1">脂肪 (g)</label>
            <NumberInput v-model="macros.fat" :min="0" :max="999" :step="0.1" unit="g" />
          </div>
        </div>
      </div>

      <!-- 示例 3：百分比 + 负值（校验过滤） -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-paper-200">
        <h2 class="text-sm font-semibold mb-3">3. 百分比与负值（非法字符过滤）</h2>
        <div class="space-y-3">
          <div>
            <label class="text-[11px] text-paper-500 block mb-1">比例（0–100，无小数）</label>
            <NumberInput v-model="percent" :min="0" :max="100" :step="1" unit="%" show-controls />
          </div>
          <div>
            <label class="text-[11px] text-paper-500 block mb-1">允许负数（-50–50）</label>
            <NumberInput v-model="negative" :min="-50" :max="50" :step="1" allow-negative show-controls />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
