import { eventHandler } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, useResponseSuccess } from '~/utils/response';
const MODULE_CHILDREN: Record<
  string,
  Array<[string, string, string, string?]>
> = {
  Hr: [['Employees', 'employees', '员工档案']],
  Customer: [
    ['CustomerList', 'list', '客户列表'],
    ['Contacts', 'contacts', '联系人'],
    ['FollowUps', 'follow-ups', '跟进记录'],
    ['Opportunities', 'opportunities', '销售机会'],
    ['CustomerTransfer', 'transfer', '客户移交'],
  ],
  Analytics: [['SalesAnalytics', 'sales', '销售分析']],
  Contract: [
    ['ContractList', 'list', '合同列表'],
    ['Invoices', 'invoices', '发票管理'],
    ['ContractPayments', 'payments', '回款管理'],
  ],

  System: [['RecycleBin', 'recycle-bin', '回收站', 'carbon:trash-can']],
};
export default eventHandler(async (event) => {
  const user = verifyAccessToken(event);
  if (!user) return unAuthorizedResponse(event);
  const menus = await query<any>(
    "SELECT id,pid,name,title,type,path,component,icon,status,sort FROM sys_menu WHERE status=1 AND type <> 'button' AND id NOT IN ('m-overview','m-workspace','m-project','m-analytics') AND COALESCE(pid,'') NOT IN ('m-overview','m-workspace','m-project','m-analytics') ORDER BY sort",
  );
  const systemMenuIds = new Set(
    menus.rows.filter((x: any) => x.pid === 'm-system').map((x: any) => x.name),
  );
  const fallbackSystemMenus = (MODULE_CHILDREN.System ?? [])
    .filter((x) => !systemMenuIds.has(x[0]))
    .map((x, i) => ({
      id: `fallback-${x[0]}`,
      pid: 'm-system',
      name: x[0],
      title: x[2],
      type: 'menu',
      path: x[1],
      component: `system/recycle-bin/index`,
      icon: x[3],
      status: 1,
      sort: 7 + i,
    }));
  menus.rows.push(...fallbackSystemMenus);
  const roles = await query<any>(
    'SELECT r.code,r.status,rm.menu_id AS "menuId" FROM sys_role r LEFT JOIN sys_user_role ur ON ur.role_id=r.id LEFT JOIN sys_role_menu rm ON rm.role_id=r.id WHERE ur.user_id=$1 AND r.status=1',
    [String(user.id)],
  );
  const allowed = new Set(roles.rows.map((x) => x.menuId).filter(Boolean));
  const isAllowed = (id: string) =>
    user.roles?.includes('super') || allowed.has(id);
  const route = (item: any) => ({
    name: `Operations${item.name}`,
    path: item.path,
    component:
      item.name === 'Invoices'
        ? '/operations/contract-invoices'
        : item.name === 'CustomerList'
          ? '/operations/customer-units'
          : item.name === 'Contacts'
            ? '/operations/contacts'
            : item.name === 'FollowUps'
              ? '/operations/follow-ups'
              : item.name === 'Opportunities'
                ? '/operations/opportunities'
                : item.name === 'CustomerTransfer'
                  ? '/operations/customer-transfer'
                  : item.name === 'ContractList'
                    ? '/operations/contracts'
                    : item.name === 'ContractEditor'
                      ? '/operations/contract-editor'
                      : item.name === 'ContractPayments'
                        ? '/operations/contract-payments'
                        : item.name === 'SalesAnalytics'
                          ? '/operations/sales-analytics'
                          : `/${item.component}`,
    meta: {
      title: item.title,
      icon: item.pid
        ? 'carbon:chevron-right'
        : item.icon || 'carbon:chevron-right',
      order: item.sort,
    },
  });
  const invoiceMenu = menus.rows.find(
    (item: any) =>
      item.name === 'Invoices' ||
      (item.pid === 'm-contract' && item.path === 'invoices'),
  );
  if (invoiceMenu) {
    invoiceMenu.name = 'Invoices';
    invoiceMenu.path = 'invoices';
    invoiceMenu.component = 'operations/contract-invoices';
  }
  const roots = menus.rows
    .filter((x) => x.pid === null && x.type !== 'button' && isAllowed(x.id))
    .map((root: any) => {
      const managed = menus.rows
        .filter(
          (x) => x.pid === root.id && x.type === 'menu' && isAllowed(x.id),
        )
        .map(route);
      if (root.name === 'System') {
        managed.push(
          ...fallbackSystemMenus.filter((x: any) => isAllowed(x.id)).map(route),
        );
      }
      const configured = (MODULE_CHILDREN[root.name] ?? []).map((x, i) => ({
        name: `Operations${x[0]}`,
        path: x[1],
        component:
          x[0] === 'CustomerList'
            ? '/operations/customer-units'
            : x[0] === 'Contacts'
              ? '/operations/contacts'
              : x[0] === 'FollowUps'
                ? '/operations/follow-ups'
                : x[0] === 'Opportunities'
                  ? '/operations/opportunities'
                  : x[0] === 'CustomerTransfer'
                    ? '/operations/customer-transfer'
                    : x[0] === 'Employees'
                      ? '/operations/hr-employees'
                      : x[0] === 'ContractList'
                        ? '/operations/contracts'
                        : x[0] === 'Invoices'
                          ? '/operations/contract-invoices'
                          : x[0] === 'ContractPayments'
                            ? '/operations/contract-payments'
                            : x[0] === 'ContractEditor'
                              ? '/operations/contract-editor'
                              : x[0] === 'RecycleBin'
                                ? '/system/recycle-bin'
                                : '/operations/index',
        meta: { title: x[2], icon: 'carbon:chevron-right', order: i },
      }));
      const children = managed;
      if (children.length === 0) return null;
      return {
        name: `Operations${root.name}`,
        path: root.path,
        component: 'BasicLayout',
        redirect: `${root.path}/${children[0].path}`,
        meta: { title: root.title, icon: root.icon, order: root.sort },
        children,
      };
    })
    .filter(Boolean);
  return useResponseSuccess(roots);
});
