<script setup lang="ts">
import type { Ingredient } from '../types';

withDefaults(
  defineProps<{
    ing?: Ingredient | undefined;
    size?: number;
    /** 无 emoji 时的兜底字符 */
    fallback?: string;
  }>(),
  { size: 36, fallback: '?' },
);
</script>

<template>
  <div
    class="avatar-img shrink-0"
    :style="{ width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.47) + 'px' }"
  >
    <img v-if="ing?.image" :src="ing.image" alt="" />
    <span v-else>{{ ing?.emoji || fallback }}</span>
  </div>
</template>
