<script setup lang="ts">
import { CAT_DEFS } from '../constants';
import { catClass, classifyTag, fmt1, healthTags, micronGroups, unitLabel } from '../engine';
import { useDietUi } from '../composables/use-diet-ui';

const { selectedIng } = useDietUi();

function close(): void {
  selectedIng.value = null;
}

function perUnit(v: number | undefined, grams: number): string {
  return fmt1(((v || 0) * grams) / 100);
}
</script>

<template>
  <transition name="slide">
    <aside v-if="selectedIng" class="fixed inset-0 z-50" @click="close()">
      <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      <div
        class="absolute right-0 top-0 h-full w-[420px] max-w-[92vw] bg-coral-50 border-l border-paper-300/60 p-7 overflow-y-auto"
        @click.stop
      >
        <button class="text-paper-400 hover:text-ink transition-colors text-sm float-right" @click="close()">✕ 关闭</button>
        <div class="clear-both pt-2">
          <div class="avatar-img mx-auto mb-3" style="width: 80px; height: 80px; font-size: 38px">
            <img v-if="selectedIng.image" :src="selectedIng.image" alt="" />
            <span v-else>{{ selectedIng.emoji || '?' }}</span>
          </div>
          <h3 class="font-display text-3xl text-center">{{ selectedIng.name }}</h3>
          <div class="text-[11px] tracking-wide2 uppercase text-paper-500 text-center mt-1">
            {{ CAT_DEFS[selectedIng.category]?.label }}
          </div>
          <div v-if="selectedIng.brand" class="text-sm text-coral-500 text-center mt-0.5">
            {{ selectedIng.brand }}
          </div>
          <div class="h-px bg-paper-300/60 my-6"></div>

          <div class="mb-6">
            <div class="text-xs uppercase tracking-wide2 text-paper-500 mb-3">营养数据 / 每 100g</div>
            <div class="grid grid-cols-2 gap-2">
              <div class="p-3 rounded-xl border border-paper-300/60 bg-white/70 text-center">
                <div class="text-[11px] text-paper-400">热量</div>
                <div class="text-lg font-semibold text-coral-500">{{ fmt1(selectedIng.nutrition?.calories) }} <span class="text-xs font-normal">kcal</span></div>
              </div>
              <div class="p-3 rounded-xl border border-paper-300/60 bg-white/70 text-center">
                <div class="text-[11px] text-paper-400">碳水</div>
                <div class="text-lg font-semibold text-yellow-500">{{ fmt1(selectedIng.nutrition?.carbs) }} <span class="text-xs font-normal">g</span></div>
              </div>
              <div class="p-3 rounded-xl border border-paper-300/60 bg-white/70 text-center">
                <div class="text-[11px] text-paper-400">蛋白质</div>
                <div class="text-lg font-semibold text-blue-500">{{ fmt1(selectedIng.nutrition?.protein) }} <span class="text-xs font-normal">g</span></div>
              </div>
              <div class="p-3 rounded-xl border border-paper-300/60 bg-white/70 text-center">
                <div class="text-[11px] text-paper-400">脂肪</div>
                <div class="text-lg font-semibold text-purple-500">{{ fmt1(selectedIng.nutrition?.fat) }} <span class="text-xs font-normal">g</span></div>
              </div>
            </div>
            <p v-if="selectedIng.unit === '个'" class="mt-3 text-[11px] text-paper-500 text-center leading-relaxed">
              每 {{ selectedIng.gramsPerUnit || 50 }}g（1{{ unitLabel(selectedIng) }}）：≈
              {{ perUnit(selectedIng.nutrition?.calories, selectedIng.gramsPerUnit || 50) }} kcal ·
              碳水 {{ perUnit(selectedIng.nutrition?.carbs, selectedIng.gramsPerUnit || 50) }}g ·
              蛋白 {{ perUnit(selectedIng.nutrition?.protein, selectedIng.gramsPerUnit || 50) }}g ·
              脂肪 {{ perUnit(selectedIng.nutrition?.fat, selectedIng.gramsPerUnit || 50) }}g
            </p>
          </div>

          <div class="mb-6">
            <div class="text-xs uppercase tracking-wide2 text-paper-500 mb-3">营养标签</div>

            <div v-if="healthTags(selectedIng).length" class="flex flex-wrap gap-1.5 mb-2.5">
              <span v-for="ht in healthTags(selectedIng)" :key="ht.text" class="px-2.5 py-1 rounded-full text-xs font-medium border" :class="ht.cls">
                {{ ht.text }}
              </span>
            </div>

            <div v-if="micronGroups(selectedIng).length">
              <div v-for="grp in micronGroups(selectedIng)" :key="grp.cat" class="mb-2">
                <div class="text-[10px] uppercase tracking-wide2 text-paper-400 mb-1">{{ grp.cat }}</div>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="n in grp.items" :key="n" class="px-2.5 py-1 rounded-full text-xs font-medium border" :class="catClass(grp.cat)">
                    {{ n }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="(selectedIng.tags || []).length" class="flex flex-wrap gap-1.5">
              <span v-for="t in selectedIng.tags" :key="t" class="px-2.5 py-1 rounded-full text-xs font-medium border" :class="catClass(classifyTag(t))">
                {{ t }}
              </span>
            </div>
          </div>

          <p v-if="selectedIng.note" class="text-sm text-paper-600 font-light leading-relaxed">{{ selectedIng.note }}</p>
        </div>
      </div>
    </aside>
  </transition>
</template>
