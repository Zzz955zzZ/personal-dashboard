import type { RouteRecordRaw } from 'vue-router';

export const financeRoutes: RouteRecordRaw[] = [
  {
    path: '/life',
    name: 'life',
    component: () => import('./views/FinanceView.vue'),
  },
];
