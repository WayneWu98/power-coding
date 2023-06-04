import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes = [
  {
    path: '/login',
    component: () => import('@/pages/login/index.vue')
  },
  {
    path: '/dashboard',
    component: () => import('@/pages/dashboard/index.vue')
  }
] as RouteRecordRaw[]

export default createRouter({ history: createWebHistory(), routes: routes })
