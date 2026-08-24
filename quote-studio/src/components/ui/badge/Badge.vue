<script setup lang="ts">
import { cn } from '@/lib/utils';
import { badgeVariants, type BadgeVariants } from './index';

const props = withDefaults(
  defineProps<{ variant?: BadgeVariants['variant']; class?: string }>(),
  { variant: 'default' },
);
</script>

<template>
  <span :class="cn(badgeVariants({ variant }), props.class)">
    <slot />
  </span>
</template>
