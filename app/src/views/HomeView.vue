<script setup lang="ts">
import { useRouter } from 'vue-router';

import { icon } from '@/shared/icons';
import { SECTIONS } from '@/shared/sections';

const router = useRouter();

function open(key: string, dev: boolean): void {
  if (dev) return;
  void router.push({ name: key });
}
</script>

<template>
  <section class="max-w-5xl mx-auto px-6 sm:px-8 py-16 sm:py-24">
    <div class="mb-14">
      <h1 class="font-display text-5xl sm:text-7xl leading-[1.05] font-medium">工作台</h1>
      <p class="mt-5 text-lg text-paper-500 font-light max-w-xl leading-relaxed">
        一处安静、有序的空间。收纳你的饮食、工作、生活与知识 — 少即是多。
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <button
        v-for="s in SECTIONS"
        :key="s.key"
        class="group text-left rounded-2xl p-7 border border-paper-300/60 bg-white/70 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md"
        @click="open(s.key, s.dev)"
      >
        <span class="text-3xl" v-html="icon(s.icon)"></span>
        <h3 class="mt-5 text-xl font-medium">{{ s.title }}</h3>
        <p class="mt-2 text-sm text-paper-500 font-light">{{ s.desc }}</p>
        <div
          class="mt-5 flex items-center gap-2 text-sm font-medium"
          :class="s.dev ? 'text-paper-400' : 'text-ink'"
        >
          {{ s.dev ? '开发中' : '进入' }}
          <span v-if="!s.dev" class="transition-transform group-hover:translate-x-1">→</span>
        </div>
      </button>
    </div>
  </section>
</template>
