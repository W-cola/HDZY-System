const WRITE_AUTH_PREFIXES = [
  'customer:create',
  'customer:update',
  'customer:delete',
  'customer:import',
  'customer:export',
  'customer:transfer:create',
  'customer:transfer:reverse',
  'contact:create',
  'contact:update',
  'contact:delete',
  'followup:create',
  'followup:update',
  'followup:delete',
  'opportunity:create',
  'opportunity:update',
  'opportunity:delete',
  'contract:create',
  'contract:update',
  'contract:delete',
  'invoice:create',
  'invoice:update',
  'invoice:delete',
  'payment:create',
  'payment:update',
  'payment:delete',
];

export function isWritePermission(authCode: string) {
  return WRITE_AUTH_PREFIXES.includes(authCode);
}

export function normalizeRolePermissionIds(
  dataScope: string,
  menuRows: Array<{ authCode?: string | null; id: string }>,
  requested: string[],
) {
  if (dataScope !== 'allRead') return requested;
  const writeIds = new Set(
    menuRows
      .filter((menu) => menu.authCode && isWritePermission(menu.authCode))
      .map((menu) => menu.id),
  );
  return requested.filter((id) => !writeIds.has(id));
}
