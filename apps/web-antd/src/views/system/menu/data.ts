import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { getSystemMenuListApi } from '#/api';
export const typeOptions = [
  { label: '目录', value: 'catalog', color: 'processing' },
  { label: '菜单', value: 'menu', color: 'default' },
  { label: '按钮', value: 'button', color: 'error' },
];
export function menuSchema(): VbenFormSchema[] {
  return [
    {
      component: 'RadioGroup',
      fieldName: 'type',
      label: '类型',
      defaultValue: 'menu',
      componentProps: {
        optionType: 'button',
        buttonStyle: 'solid',
        options: typeOptions,
      },
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: '菜单名称',
      rules: 'required',
    },
    {
      component: 'ApiTreeSelect',
      fieldName: 'pid',
      label: '上级菜单',
      componentProps: {
        api: getSystemMenuListApi,
        labelField: 'title',
        valueField: 'id',
        childrenField: 'children',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'title',
      label: '显示标题',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'path',
      label: '路由路径',
      dependencies: {
        show: (v) => v.type !== 'button',
        triggerFields: ['type'],
      },
    },
    {
      component: 'Input',
      fieldName: 'component',
      label: '页面组件',
      dependencies: { show: (v) => v.type === 'menu', triggerFields: ['type'] },
    },
    {
      component: 'Input',
      fieldName: 'authCode',
      label: '权限标识',
      dependencies: {
        show: (v) => v.type !== 'catalog',
        triggerFields: ['type'],
      },
    },
    {
      component: 'IconPicker',
      fieldName: 'icon',
      label: '菜单图标',
      dependencies: {
        show: (v) => v.type !== 'button',
        triggerFields: ['type'],
      },
      componentProps: { prefix: 'carbon' },
    },
    {
      component: 'RadioGroup',
      fieldName: 'status',
      label: '状态',
      defaultValue: 1,
      componentProps: {
        optionType: 'button',
        buttonStyle: 'solid',
        class: 'w-full',
        options: [
          { label: '启用', value: 1 },
          { label: '停用', value: 0 },
        ],
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'sort',
      label: '排序',
      defaultValue: 1,
      componentProps: { min: 1 },
    },
  ];
}
export const columns: VxeTableGridColumns = [
  {
    field: 'title',
    title: '菜单标题',
    treeNode: true,
    minWidth: 220,
    align: 'left',
  },
  {
    field: 'type',
    title: '类型',
    width: 90,
    cellRender: { name: 'CellTag', options: typeOptions },
  },
  { field: 'authCode', title: '权限标识', width: 210 },
  { field: 'path', title: '路由路径', width: 190, align: 'left' },
  { field: 'component', title: '页面组件', minWidth: 190, align: 'left' },
  {
    field: 'status',
    title: '状态',
    width: 90,
    cellRender: {
      name: 'CellTag',
      options: [
        { label: '启用', value: 1, color: 'success' },
        { label: '停用', value: 0, color: 'error' },
      ],
    },
  },
  { field: 'sort', title: '排序', width: 70 },
  {
    field: 'operation',
    title: '操作',
    fixed: 'right',
    width: 250,
    slots: { default: 'action' },
  },
];
