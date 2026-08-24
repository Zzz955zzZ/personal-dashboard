import type { RouteRecordRaw } from 'vue-router';

export const revenueRoutes: RouteRecordRaw[] = [
  {
    path: '/projects',
    name: 'projects',
    component: () => import('./views/ProjectsListView.vue'),
  },
  {
    path: '/projects/:id',
    name: 'project-detail',
    component: () => import('./views/ProjectDetailView.vue'),
  },
];
