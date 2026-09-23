import type { FormValues } from '@vben/common-ui';
import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { ComponentPropsMap, ComponentType } from './component';

import { defineComponent, h } from 'vue';

import { VbenTableAction as VbenTableActionCore } from '@vben/common-ui';
import {
  setupVbenVxeTable,
  useVbenVxeGrid as useGrid,
} from '@vben/plugins/vxe-table';

import { Button, Image, Tag } from 'ant-design-vue';

import { useVbenForm } from './form';

setupVbenVxeTable({
  configVxeTable: (vxeUI) => {
    vxeUI.setConfig({
      grid: {
        align: 'center',
        border: false,
        columnConfig: { resizable: true },
        minHeight: 180,
        formConfig: { enabled: false },
        proxyConfig: {
          autoLoad: true,
          response: { result: 'items', total: 'total', list: 'items' },
          showActiveMsg: true,
          showResponseMsg: false,
        },
        round: true,
        showOverflow: true,
        size: 'small',
      } as VxeTableGridOptions,
    });
    vxeUI.renderer.add('CellImage', {
      renderTableDefault(renderOpts, params) {
        const { props } = renderOpts;
        const { column, row } = params;
        return h(Image, { src: row[column.field], ...props });
      },
    });
    vxeUI.renderer.add('CellLink', {
      renderTableDefault(renderOpts) {
        const { props } = renderOpts;
        return h(
          Button,
          { size: 'small', type: 'link' },
          { default: () => props?.text },
        );
      },
    });
    vxeUI.renderer.add('CellTag', {
      renderTableDefault(renderOpts, params) {
        const options = (renderOpts as any).options ?? [];
        const item = options.find(
          (option: any) => option.value === params.row[params.column.field],
        );
        return h(
          Tag,
          { color: item?.color },
          { default: () => item?.label ?? params.row[params.column.field] },
        );
      },
    });
  },
  useVbenForm,
});

export function useVbenVxeGrid<
  T extends Record<string, any>,
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
>(
  ...rest: Parameters<
    typeof useGrid<
      T,
      ComponentType,
      ComponentPropsMap,
      TFormValues,
      TSubmitValues
    >
  >
) {
  return useGrid<
    T,
    ComponentType,
    ComponentPropsMap,
    TFormValues,
    TSubmitValues
  >(...rest);
}

export const VbenTableAction = defineComponent({
  name: 'VbenTableAction',
  inheritAttrs: false,
  props: ['actions', 'dropdownActions', 'align'],
  setup(props) {
    return () => h(VbenTableActionCore, props);
  },
});

export type * from '@vben/plugins/vxe-table';
