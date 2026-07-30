<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ING_DB } from '@/modules/diet';

const sections = [
  { key: 'diet', to: '/diet', title: '饮食', desc: `食材知识库 ${ING_DB.length} 条 · 估算引擎已迁移`, ready: true },
  { key: 'work', to: '/', title: '工作', desc: '任务、项目与专注时钟', ready: false },
  { key: 'life', to: '/', title: '生活', desc: '习惯、日程与随手记', ready: false },
  { key: 'knowledge', to: '/', title: '知识', desc: '收藏、笔记与阅读追踪', ready: false },
];
</script>

<template>
  <section>
    <h1 class="font-serif text-3xl text-ink sm:text-4xl">工作台</h1>
    <p class="mt-2 text-sm text-paper-600">v2 工程化骨架 — Vite + Vue 3 + TypeScript</p>

    <div class="mt-8 grid gap-4 sm:grid-cols-2">
      <RouterLink
        v-for="s in sections"
        :key="s.key"
        :to="s.to"
        class="block rounded-xl border border-paper-200 bg-white p-5 transition hover:border-coral-300"
        :class="s.ready ? '' : 'pointer-events-none opacity-50'"
      >
        <div class="flex items-baseline justify-between">
          <h2 class="text-base font-medium text-ink">{{ s.title }}</h2>
          <span v-if="!s.ready" class="text-[11px] tracking-wide2 text-paper-500">开发中</span>
        </div>
        <p class="mt-1 text-sm text-paper-600">{{ s.desc }}</p>
      </RouterLink>
    </div>
  </section>
</template>
