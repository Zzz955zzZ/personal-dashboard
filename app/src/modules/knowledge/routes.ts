import type { RouteRecordRaw } from 'vue-router';

export const knowledgeRoutes: RouteRecordRaw[] = [
  {
    path: '/knowledge',
    name: 'knowledge',
    component: () => import('./views/KnowledgeView.vue'),
  },
];
