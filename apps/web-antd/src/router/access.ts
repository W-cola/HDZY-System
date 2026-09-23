import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';

import { message } from 'ant-design-vue';

import { getAllMenusApi } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');
  const layoutMap: ComponentRecordType = { BasicLayout, IFrameView };

  return await generateAccessible('backend', {
    ...options,
    fetchMenuListAsync: async () => {
      message.loading({
        content: `${$t('common.loadingMenu')}...`,
        duration: 1.5,
      });
      const menus = ((await getAllMenusApi()) || []) as any[];
      const contractList = {
        name: 'OperationsContractList',
        path: 'list',
        component: '/operations/contracts',
        meta: { title: '合同列表', icon: 'carbon:document', order: 0 },
      };
      const customerInvoiceProfiles = {
        name: 'OperationsCustomerInvoiceProfiles',
        path: 'invoice-profiles',
        component: '/operations/customer-invoice-profiles',
        meta: { title: '开票信息管理', icon: 'carbon:chevron-right', order: 1 },
      };
      const contractInvoices = {
        name: 'OperationsInvoices',
        path: 'invoices',
        component: '/operations/contract-invoices',
        meta: { title: '发票管理', icon: 'carbon:chevron-right', order: 2 },
      };
      const customerMenu = menus.find(
        (menu: any) => menu.name === 'OperationsCustomer',
      );
      if (customerMenu) {
        customerMenu.children = Array.isArray(customerMenu.children)
          ? customerMenu.children
          : [];
        // The backend menu tree is authoritative; do not inject a second
        // invoice-profile entry into the customer menu.
      }
      const contractMenu = menus.find(
        (menu: any) => menu.name === 'OperationsContract',
      );
      if (contractMenu) {
        contractMenu.children = Array.isArray(contractMenu.children)
          ? contractMenu.children
          : [];
        if (
          !contractMenu.children.some(
            (menu: any) => menu.name === contractList.name,
          )
        ) {
          contractMenu.children.unshift(contractList);
        }
        const existingContractInvoices = contractMenu.children.find(
          (menu: any) =>
            menu.name === contractInvoices.name ||
            menu.path === contractInvoices.path,
        );
        if (existingContractInvoices) {
          Object.assign(existingContractInvoices, contractInvoices);
        } else {
          contractMenu.children.splice(1, 0, contractInvoices);
        }
        contractMenu.redirect = '/operations/contract/list';
        return menus;
      }
      return [
        ...menus,
        {
          name: 'OperationsContract',
          path: '/operations/contract',
          component: 'BasicLayout',
          redirect: '/operations/contract/list',
          meta: { title: '合同中心', icon: 'carbon:document', order: 3 },
          children: [contractList],
        },
      ];
    },
    forbiddenComponent,
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
