import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes = [
  {
    path: '/login',
    component: () => import('@/pages/login/index.vue')
  },
  {
    path: '/',
    component: () => import('@/pages/index.vue'),
    redirect: { name: 'dashboard' },
    children: [
      {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('@/pages/dashboard/index.vue')
      }
    ]
  }
] as RouteRecordRaw[]

export default createRouter({ history: createWebHistory(), routes: routes })
