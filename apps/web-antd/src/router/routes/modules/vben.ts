import type { RouteRecordRaw } from 'vue-router';

// Vben 模板项目入口已移除，保留个人资料页作为隐藏路由供账户菜单使用。
const routes: RouteRecordRaw[] = [
  {
    name: 'Profile',
    path: '/profile',
    component: () => import('#/views/_core/profile/index.vue'),
    meta: {
      hideInMenu: true,
      icon: 'lucide:user',
      title: '个人资料',
    },
  },
];

export default routes;
