import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { getDepartmentTreeListApi } from '#/api';
export function deptSchema(
  onParentChange?: (value: any) => void,
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '部门名称',
      rules: 'required',
    },
    {
      component: 'ApiTreeSelect',
      fieldName: 'pid',
      label: '上级部门',
      componentProps: {
        api: getDepartmentTreeListApi,
        labelField: 'name',
        valueField: 'id',
        childrenField: 'children',
        allowClear: true,
        class: 'w-full',
        onChange: onParentChange,
        onSelect: onParentChange,
      },
    },
    { component: 'Input', fieldName: 'leader', label: '负责人' },
    {
      component: 'InputNumber',
      fieldName: 'sort',
      label: '排序',
      defaultValue: 1,
      componentProps: { min: 1 },
    },
    {
      component: 'RadioGroup',
      fieldName: 'status',
      label: '状态',
      defaultValue: 1,
      componentProps: {
        optionType: 'button',
        buttonStyle: 'solid',
        options: [
          { label: '启用', value: 1 },
          { label: '停用', value: 0 },
        ],
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
      componentProps: { maxLength: 100, showCount: true, rows: 3 },
    },
  ];
}
export function positionSchema(
  onDepartmentChange?: (value: any) => void,
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '岗位名称',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'code',
      label: '岗位编码',
      rules: 'required',
    },
    {
      component: 'ApiTreeSelect',
      fieldName: 'deptId',
      label: '所属部门',
      rules: 'selectRequired',
      componentProps: {
        api: getDepartmentTreeListApi,
        labelField: 'name',
        valueField: 'id',
        childrenField: 'children',
        class: 'w-full',
        onChange: onDepartmentChange,
        onSelect: onDepartmentChange,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'sort',
      label: '排序',
      defaultValue: 1,
      componentProps: { min: 1 },
    },
    {
      component: 'RadioGroup',
      fieldName: 'status',
      label: '状态',
      defaultValue: 1,
      componentProps: {
        optionType: 'button',
        buttonStyle: 'solid',
        options: [
          { label: '启用', value: 1 },
          { label: '停用', value: 0 },
        ],
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
      componentProps: { maxLength: 100, showCount: true, rows: 3 },
    },
  ];
}
export const deptColumns: VxeTableGridColumns = [
  {
    field: 'name',
    title: '部门名称',
    treeNode: true,
    minWidth: 220,
    align: 'left',
  },
  { field: 'leader', title: '负责人', width: 120 },
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
  { field: 'sort', title: '排序', width: 80 },
  { field: 'remark', title: '备注', minWidth: 150 },
  {
    field: 'operation',
    title: '操作',
    fixed: 'right',
    width: 250,
    slots: { default: 'deptAction' },
  },
];
export const positionColumns: VxeTableGridColumns = [
  { field: 'name', title: '岗位名称', width: 160 },
  { field: 'code', title: '岗位编码', width: 180 },
  { field: 'deptName', title: '所属部门', minWidth: 180 },
  { field: 'members', title: '成员数', width: 90 },
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
  { field: 'sort', title: '排序', width: 80 },
  { field: 'remark', title: '备注', minWidth: 150 },
  {
    field: 'operation',
    title: '操作',
    fixed: 'right',
    width: 150,
    slots: { default: 'positionAction' },
  },
];

export function positionSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '岗位名称',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'code',
      label: '岗位编码',
      componentProps: { allowClear: true },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: {
        allowClear: true,
        options: [
          { label: '启用', value: 1 },
          { label: '停用', value: 0 },
        ],
      },
    },
  ];
}
