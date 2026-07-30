<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const crumb = computed(() => (route.name === 'diet' ? '工作台 / 饮食' : '首页'));
</script>

<template>
  <div class="min-h-screen bg-paper-50 text-ink">
    <header class="sticky top-0 z-10 border-b border-paper-200 bg-paper-50/90 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <RouterLink to="/" class="font-serif text-xl tracking-wide2 text-ink">Personal Dashboard</RouterLink>
        <span class="text-xs uppercase tracking-wide2 text-paper-500">{{ crumb }}</span>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <RouterView />
    </main>
  </div>
</template>
