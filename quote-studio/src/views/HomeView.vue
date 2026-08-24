<script setup lang="ts">
/** 首页：居中 2×2 模块入口。 */
import { RouterLink } from 'vue-router';

import { icon } from '@/shared/icons';

interface ModuleEntry {
  to: string;
  icon: string;
  title: string;
  es: string;
  desc: string;
  tint: string;
  fg: string;
}

const modules: ModuleEntry[] = [
  { to: '/dashboard', icon: 'dashboard', title: '看板', es: 'Dashboard', desc: '业务全景与盈利一览', tint: '#f3ece1', fg: '#8a6d4b' },
  { to: '/quotation', icon: 'briefcase', title: '报价', es: 'Presupuesto', desc: '编制并导出报价单', tint: '#f6e7e1', fg: '#a8654a' },
  { to: '/projects', icon: 'wallet', title: '盈利', es: 'Rentabilidad', desc: '项目收益与利润分析', tint: '#e7efe6', fg: '#5a7a55' },
  { to: '/settings', icon: 'settings', title: '设置', es: 'Ajustes', desc: '公司、分类与数据备份', tint: '#ece9e4', fg: '#6b6358' },
];
</script>

<template>
  <div class="flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-6 py-12 sm:px-10">
    <div class="w-full max-w-4xl">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <RouterLink
          v-for="m in modules"
          :key="m.to"
          :to="m.to"
          class="group relative flex min-h-[15rem] flex-col rounded-3xl border border-paper-200 bg-white/90 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-paper-300 hover:shadow-[0_22px_48px_-22px_rgba(61,52,43,0.4)] sm:min-h-[17rem]"
        >
          <div
            class="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-transform duration-300 group-hover:scale-105"
            :style="{ backgroundColor: m.tint, color: m.fg }"
            v-html="icon(m.icon)"
          ></div>

          <div class="mt-auto">
            <div class="flex items-baseline gap-2">
              <span class="text-xl font-semibold text-ink">{{ m.title }}</span>
              <span class="text-xs tracking-wide text-paper-400">{{ m.es }}</span>
            </div>
            <p class="mt-1.5 text-sm leading-relaxed text-paper-500">{{ m.desc }}</p>
          </div>

          <span
            class="absolute right-6 top-7 text-paper-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-paper-500"
            v-html="icon('chevron-right')"
          ></span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
