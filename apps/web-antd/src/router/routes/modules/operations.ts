import type { RouteRecordRaw } from 'vue-router';
const customerUnits = () => import('#/views/operations/customer-units.vue');
const customerInvoiceProfiles = () =>
  import('#/views/operations/customer-invoice-profiles.vue');
const contacts = () => import('#/views/operations/contacts.vue');
const followUps = () => import('#/views/operations/follow-ups.vue');
const opportunities = () => import('#/views/operations/opportunities.vue');
const customerTransfer = () =>
  import('#/views/operations/customer-transfer.vue');
const contracts = () => import('#/views/operations/contracts.vue');
const contractEditor = () => import('#/views/operations/contract-editor.vue');
const contractInvoices = () =>
  import('#/views/operations/contract-invoices.vue');
const hrEmployees = () => import('#/views/operations/hr-employees.vue');
const contractPayments = () =>
  import('#/views/operations/contract-payments.vue');
const salesAnalytics = () => import('#/views/operations/sales-analytics.vue');
const systemPages: any = {
  Users: () => import('#/views/system/user/index.vue'),
  Roles: () => import('#/views/system/roles/index.vue'),
  Organization: () => import('#/views/system/organization/index.vue'),
  Settings: () => import('#/views/system/settings/index.vue'),
  Permissions: () => import('#/views/system/menu/index.vue'),
  AuditLogs: () => import('#/views/system/audit-logs/index.vue'),
  RecycleBin: () => import('#/views/system/recycle-bin/index.vue'),
};
const groups: any[] = [
  [
    'Hr',
    'hr',
    '人事行政',
    'carbon:identification',
    [['Employees', 'employees', '员工档案']],
  ],
  [
    'Customer',
    'customer',
    '客户中心',
    'carbon:customer-service',
    [
      ['CustomerList', 'list', '客户列表'],
      ['CustomerInvoiceProfiles', 'invoice-profiles', '开票信息管理'],
      ['Contacts', 'contacts', '联系人'],
      ['FollowUps', 'follow-ups', '跟进记录'],
      ['Opportunities', 'opportunities', '销售机会'],
      ['CustomerTransfer', 'transfer', '客户移交'],
    ],
  ],
  [
    'Contract',
    'contract',
    '合同中心',
    'carbon:document',
    [
      ['ContractList', 'list', '合同列表'],
      ['Invoices', 'invoices', '发票管理'],
      ['ContractPayments', 'payments', '回款管理'],
    ],
  ],
  [
    'Analytics',
    'analytics',
    '统计分析',
    'carbon:chart-line',
    [['SalesAnalytics', 'sales', '销售分析']],
  ],
  [
    'System',
    'system',
    '系统管理',
    'carbon:settings',
    [
      ['Users', 'users', '用户管理'],
      ['Roles', 'roles', '角色管理'],
      ['Organization', 'organization', '部门与岗位'],
      ['Permissions', 'permissions', '菜单权限'],
      ['Settings', 'settings', '系统设置'],
      ['AuditLogs', 'audit-logs', '操作日志'],
      ['RecycleBin', 'recycle-bin', '回收站'],
    ],
  ],
];
const componentFor = (name: string) =>
  name === 'CustomerList'
    ? customerUnits
    : name === 'CustomerInvoiceProfiles'
      ? customerInvoiceProfiles
      : name === 'Contacts'
        ? contacts
        : name === 'FollowUps'
          ? followUps
          : name === 'Opportunities'
            ? opportunities
            : name === 'CustomerTransfer'
              ? customerTransfer
              : name === 'ContractList'
                ? contracts
                : name === 'ContractEditor'
                  ? contractEditor
                  : name === 'Invoices'
                    ? contractInvoices
                    : name === 'Employees'
                      ? hrEmployees
                      : name === 'ContractPayments'
                        ? contractPayments
                        : name === 'SalesAnalytics'
                          ? salesAnalytics
                          : systemPages[name];
const routes: RouteRecordRaw[] = groups.map((g, index) => ({
  name: `Operations${g[0]}`,
  path: `/operations/${g[1]}`,
  meta: { icon: g[3], order: index, title: g[2] },
  children: g[4].map((c: any, i: number) => ({
    name: `Operations${c[0]}`,
    path: c[1],
    component: componentFor(c[0]),
    meta: { icon: 'carbon:chevron-right', title: c[2], order: i },
  })),
}));
export default routes;
