<script setup lang="ts">
/**
 * 轻量分组柱状图（纯 SVG，无第三方图表库）。
 * 用于看板「业务数据 / 柱状图」视图：按月对比 收益 与 利润。
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

function groupWidth(): number {
  return props.labels.length > 0 ? plotW.value / props.labels.length : plotW.value;
}
function barW(): number {
  return Math.min(24, (groupWidth() - 12) / Math.max(1, props.series.length));
}
function centerX(i: number): number {
  return padL + groupWidth() * (i + 0.5);
}
function yForVal(v: number): number {
  return padT + plotH.value * (1 - v / maxVal.value);
}
function barX(i: number, si: number): number {
  const total = props.series.length * barW();
  return centerX(i) - total / 2 + si * barW();
}
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" :style="{ height: H + 'px' }">
    <line :x1="padL" :y1="padT + plotH" :x2="W - padR" :y2="padT + plotH" stroke="#E7E1D6" stroke-width="1" />
    <template v-for="(label, i) in labels" :key="label">
      <g v-for="(s, si) in series" :key="s.name">
        <rect
          :x="barX(i, si)"
          :y="yForVal(s.values[i] || 0)"
          :width="barW()"
          :height="Math.max(0, padT + plotH - yForVal(s.values[i] || 0))"
          :fill="s.color"
          rx="2"
        />
      </g>
      <text :x="centerX(i)" :y="padT + plotH + 17" text-anchor="middle" class="chart-axis">
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
