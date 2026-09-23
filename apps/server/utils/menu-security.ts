export const PROTECTED_MENU_IDS = new Set([
  'm-audit-logs',
  'm-org',
  'm-permissions',
  'm-recycle-bin',
  'm-roles',
  'm-settings',
  'm-system',
  'm-users',
]);

export function isProtectedMenu(id: string) {
  return PROTECTED_MENU_IDS.has(id);
}

export const protectedMenuMessage =
  '该菜单属于系统核心管理入口，为防止权限自锁，不允许停用、删除或移出系统管理';
