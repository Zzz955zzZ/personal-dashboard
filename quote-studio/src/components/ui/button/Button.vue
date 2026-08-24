<script setup lang="ts">
import { computed } from 'vue';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonVariants } from './index';

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  class?: string;
}
const props = withDefaults(defineProps<Props>(), { as: 'button' });

const delegated = computed(() => {
  const { variant: _v, size: _s, class: _c, ...rest } = props;
  return rest;
});
</script>

<template>
  <Primitive
    :class="cn(buttonVariants({ variant, size }), props.class)"
    v-bind="delegated"
  >
    <slot />
  </Primitive>
</template>
