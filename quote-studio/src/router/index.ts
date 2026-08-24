import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

import { dashboardRoutes } from '@/modules/dashboard';
import { revenueRoutes } from '@/modules/revenue';
import { quotationRoutes } from '@/modules/quotation';
import { settingsRoutes } from '@/modules/settings';
import { aiLinkRoutes } from '@/modules/ai-link';

/**
 * hash 模式：保证 file:// 双击、静态托管、单文件构建三种场景都无需服务端 fallback。
 * 路由名与 NAV_ITEMS 的 key 对应（home / projects / project-detail / quotation /
 * quotation-edit / settings），顶栏高亮直接靠 route.name 匹配。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  ...dashboardRoutes,
  ...quotationRoutes,
  ...revenueRoutes,
  ...settingsRoutes,
  ...aiLinkRoutes,
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
