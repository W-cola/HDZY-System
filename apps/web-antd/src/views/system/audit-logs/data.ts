import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: '关键词',
      componentProps: {
        allowClear: true,
        placeholder: '操作人、模块、对象或IP',
      },
    },
    {
      component: 'Select',
      fieldName: 'result',
      label: '结果',
      componentProps: {
        allowClear: true,
        options: [
          { label: '成功', value: '成功' },
          { label: '失败', value: '失败' },
        ],
      },
    },
    {
      component: 'Input',
      fieldName: 'module',
      label: '模块',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'operator',
      label: '操作人',
      componentProps: { allowClear: true },
    },
  ];
}
export const columns: VxeTableGridColumns = [
  { field: 'createdAt', title: '操作时间', width: 175 },
  { field: 'operator', title: '操作人', width: 120 },
  { field: 'module', title: '模块', width: 120 },
  { field: 'action', title: '操作类型', width: 130 },
  { field: 'target', title: '操作对象', minWidth: 170 },
  {
    field: 'result',
    title: '结果',
    width: 85,
    cellRender: {
      name: 'CellTag',
      options: [
        { label: '成功', value: '成功', color: 'success' },
        { label: '失败', value: '失败', color: 'error' },
      ],
    },
  },
  { field: 'ip', title: 'IP地址', width: 140 },
  {
    field: 'operation',
    title: '操作',
    fixed: 'right',
    width: 100,
    slots: { default: 'action' },
  },
];
