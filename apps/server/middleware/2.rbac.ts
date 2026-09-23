import { createError, defineEventHandler } from 'h3';
import { isFinance, requireAuth, requireRoles } from '~/utils/rbac';

const adminPrefixes = [
  '/api/system/user',
  '/api/system/role',
  '/api/system/menu',
  '/api/system/dept',
  '/api/system/position',
  '/api/system/organization',
  '/api/system/settings',
];
const financePrefixes = [
  '/api/system/contract/invoice',
  '/api/system/contract/payment',
];
const restrictedPrefixes = [
  '/api/system/customer-transfer',
  '/api/system/recycle-bin',
  '/api/system/audit-logs',
];
const hrPrefixes = ['/api/system/hr'];
const leaderReadOnlyPrefixes = ['/api/system'];

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/system/')) return;
  const path = event.path;
  if (
    adminPrefixes.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    )
  ) {
    // 业务页面会读取启用用户作为负责人/筛选项；只放行这个只读列表接口。
    const isBusinessUserList =
      path.startsWith('/api/system/user/list') && event.method === 'GET';
    if (isBusinessUserList) return;
    if (!(await requireRoles(event, ['super', 'admin'])))
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
    return;
  }
  if (
    restrictedPrefixes.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    )
  ) {
    // 回收站和审计日志仍属于系统管理；客户转移使用配置的页面/操作权限。
    if (!path.startsWith('/api/system/customer-transfer')) {
      if (!(await requireRoles(event, ['super', 'admin'])))
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
      return;
    }
  }
  if (
    hrPrefixes.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    )
  ) {
    // 员工档案由接口内的 hr:employee:* 权限控制，不再写死内置角色。
    return;
  }
  if (
    financePrefixes.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    )
  ) {
    const user = await requireAuth(event);
    const canReadBusiness =
      user?.roles.includes('leader') ||
      user?.roles.includes('sales') ||
      user?.roles.includes('sales-director') ||
      Boolean(user && isFinance(user));
    if (!user || !canReadBusiness)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
    if (user.roles.includes('leader') && event.method !== 'GET')
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
    return;
  }
  const user = await requireAuth(event);
  if (!user) return;
  if (user.roles.includes('hr') && !path.startsWith('/api/system/hr'))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  // 业务角色的增删改由各接口的菜单按钮权限控制；不再按“领导”角色全局禁止 POST/PUT/DELETE。
});
