<script setup lang="ts">
/**
 * P1 阶段的引擎自检页。
 * 作用是把迁移后的识别/估算引擎摆到界面上肉眼验证，
 * P3 视图层迁移完成后这个页面会被真正的五个页签替换掉。
 */
import { computed, ref } from 'vue';
import { aiRecognize, catClass, healthTags, ING_DB, micronGroups } from '@/modules/diet';

const query = ref('螃蟹');
const result = computed(() => aiRecognize(query.value));
const groups = computed(() => micronGroups({ microns: result.value.micros }));
const tags = computed(() => (result.value.macros ? healthTags({ nutrition: result.value.macros }) : []));

const samples = ['螃蟹', '鸡胸肉', '鸡蛋', '海胆', '空心菜', '榴莲', 'asdfqwer'];
</script>

<template>
  <section>
    <h1 class="font-serif text-3xl text-ink">饮食 · 识别引擎自检</h1>
    <p class="mt-2 text-sm text-paper-600">知识库 {{ ING_DB.length }} 条；未收录食材走类别估算，结果会标注为参考值。</p>

    <input
      v-model="query"
      type="text"
      placeholder="输入食材名"
      class="mt-6 w-full rounded-lg border border-paper-300 bg-white px-4 py-3 text-base outline-none focus:border-coral-400"
    />

    <div class="mt-3 flex flex-wrap gap-2">
      <button
        v-for="s in samples"
        :key="s"
        type="button"
        class="rounded-full border border-paper-300 bg-white px-3 py-1.5 text-xs text-paper-700 active:bg-paper-100"
        @click="query = s"
      >
        {{ s }}
      </button>
    </div>

    <div class="mt-6 rounded-xl border border-paper-200 bg-white p-5">
      <template v-if="result.match">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-base font-medium text-ink">{{ result.category }}</span>
          <span
            v-if="result.estimated"
            class="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700"
            >参考值</span
          >
          <span v-else class="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
            >知识库核实</span
          >
        </div>

        <dl v-if="result.macros" class="mt-4 grid grid-cols-4 gap-3 text-center">
          <div v-for="m in [
            { k: '热量', v: result.macros.calories, u: 'kcal' },
            { k: '碳水', v: result.macros.carbs, u: 'g' },
            { k: '蛋白', v: result.macros.protein, u: 'g' },
            { k: '脂肪', v: result.macros.fat, u: 'g' },
          ]" :key="m.k" class="rounded-lg bg-paper-100 py-3">
            <dt class="text-[11px] text-paper-500">{{ m.k }}</dt>
            <dd class="mt-0.5 text-lg text-ink">{{ m.v }}<span class="ml-0.5 text-[11px] text-paper-500">{{ m.u }}</span></dd>
          </div>
        </dl>
        <p class="mt-2 text-[11px] text-paper-500">以上为每 100g 数值</p>

        <div v-if="tags.length" class="mt-4 flex flex-wrap gap-1.5">
          <span v-for="t in tags" :key="t.text" class="rounded border px-2 py-0.5 text-xs" :class="t.cls">{{ t.text }}</span>
        </div>

        <div v-for="g in groups" :key="g.cat" class="mt-3 flex flex-wrap items-center gap-1.5">
          <span class="text-xs text-paper-500">{{ g.cat }}</span>
          <span v-for="n in g.items" :key="n" class="rounded border px-2 py-0.5 text-xs" :class="catClass(g.cat)">{{ n }}</span>
        </div>

        <p v-if="result.note" class="mt-4 text-sm text-paper-600">{{ result.note }}</p>
        <p v-if="result.unit === '个'" class="mt-1 text-sm text-paper-600">
          建议按「个」计量，每个约 {{ result.gramsPerUnit }}g
        </p>
      </template>
      <p v-else class="text-sm text-paper-500">认不出这个名字，不猜测数据。换个说法或手动填写营养值。</p>
    </div>
  </section>
</template>
