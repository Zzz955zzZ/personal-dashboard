<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    /** 对应 v1.0 里 max-w-sm / max-w-md / max-w-lg 三档；full 为全屏页模式 */
    width?: 'sm' | 'md' | 'lg' | 'full';
    scrollable?: boolean;
    closable?: boolean;
  }>(),
  { width: 'md', scrollable: false, closable: true },
);

const emit = defineEmits<{ close: [] }>();

const WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'w-full h-full rounded-none sm:max-w-4xl sm:h-auto sm:rounded-2xl',
} as const;
const isFull = computed(() => props.width === 'full');
</script>

<template>
  <transition name="pop">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center"
      :class="isFull ? '' : 'p-4'"
      @click.self="emit('close')"
    >
      <div class="absolute inset-0 bg-black/35 backdrop-blur-sm" @click="emit('close')"></div>
      <div
        class="relative bg-coral-50 border border-paper-300/60"
        :class="[WIDTHS[width], isFull ? 'p-4 overflow-y-auto' : 'rounded-2xl p-7', scrollable && !isFull ? 'max-h-[90vh] overflow-y-auto' : '']"
        @click.stop
      >
        <div v-if="title" class="flex items-center justify-between mb-5">
          <h3 class="font-display text-2xl">{{ title }}</h3>
          <button
            v-if="closable"
            type="button"
            class="text-paper-400 hover:text-ink text-sm"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>
        <slot />
      </div>
    </div>
  </transition>
</template>
