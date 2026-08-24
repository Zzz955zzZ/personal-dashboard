<script setup lang="ts">
/**
 * 轻量折线图（纯 SVG，无第三方图表库）。
 * 用于看板「业务数据 / 折线图」视图：按月展示 收益 与 利润 趋势。
 */
import { computed } from 'vue';

interface Series {
  name: string;
  color: string;
  values: number[];
}

const props = withDefaults(
  defineProps<{
    labels: string[];
    series: Series[];
    height?: number;
  }>(),
  { height: 220 },
);

const padL = 14;
const padR = 14;
const padT = 18;
const padB = 28;

const W = computed(() => Math.max(320, props.labels.length * 72 + padL + padR));
const H = computed(() => props.height);
const plotW = computed(() => W.value - padL - padR);
const plotH = computed(() => H.value - padT - padB);

const maxVal = computed(() => {
  let m = 0;
  for (const s of props.series) for (const v of s.values) if (v > m) m = v;
  return m > 0 ? m : 1;
});

function xFor(i: number): number {
  if (props.labels.length <= 1) return padL + plotW.value / 2;
  return padL + (plotW.value * i) / (props.labels.length - 1);
}
function yForVal(v: number): number {
  return padT + plotH.value * (1 - v / maxVal.value);
}
function pointsFor(s: Series): string {
  return s.values.map((v, i) => `${xFor(i)},${yForVal(v)}`).join(' ');
}
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" :style="{ height: H + 'px' }">
    <line :x1="padL" :y1="padT + plotH" :x2="W - padR" :y2="padT + plotH" stroke="#E7E1D6" stroke-width="1" />
    <template v-for="s in series" :key="s.name">
      <polyline
        :points="pointsFor(s)"
        fill="none"
        :stroke="s.color"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <template v-for="(v, i) in s.values" :key="i">
        <circle :cx="xFor(i)" :cy="yForVal(v)" r="3" :fill="s.color" />
      </template>
    </template>
    <template v-for="(label, i) in labels" :key="'l' + label">
      <text :x="xFor(i)" :y="padT + plotH + 17" text-anchor="middle" class="chart-axis">
        {{ label }}
      </text>
    </template>
  </svg>
</template>

<style scoped>
.chart-axis {
  font-size: 10px;
  fill: #9b9183;
}
</style>
