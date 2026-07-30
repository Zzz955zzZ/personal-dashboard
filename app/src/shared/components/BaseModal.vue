<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    /** 对应 v1.0 里 max-w-sm / max-w-md / max-w-lg 三档 */
    width?: 'sm' | 'md' | 'lg';
    scrollable?: boolean;
    closable?: boolean;
  }>(),
  { width: 'md', scrollable: false, closable: true },
);

const emit = defineEmits<{ close: [] }>();

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' } as const;
</script>

<template>
  <transition name="pop">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <div class="absolute inset-0 bg-black/35 backdrop-blur-sm" @click="emit('close')"></div>
      <div
        class="relative w-full bg-coral-50 rounded-2xl border border-paper-300/60 p-7"
        :class="[WIDTHS[width], scrollable ? 'max-h-[90vh] overflow-y-auto' : '']"
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
