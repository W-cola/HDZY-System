import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

export const dataScopeOptions = [
  { label: '全部数据（可读写）', value: 'all' },
  { label: '全部数据（只读）', value: 'allRead' },
  { label: '人事专用', value: 'hrOnly' },
  { label: '指定部门', value: 'specifiedDepartments' },
  { label: '全部可见，仅本人可编辑', value: 'allReadOwnWrite' },
  { label: '本人及下属', value: 'selfAndSubordinates' },
  { label: '本部门', value: 'department' },
  { label: '仅本人', value: 'self' },
];
const scopeLabels = Object.fromEntries(
  dataScopeOptions.map((x) => [x.value, x.label]),
);

export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '角色名称',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'code',
      label: '角色编码',
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
    {
      component: 'Input',
      fieldName: 'remark',
      label: '备注',
      componentProps: { allowClear: true },
    },
  ];
}
export function useRoleFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '角色名称',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'code',
      label: '角色编码',
      rules: 'required',
    },
    {
      component: 'Select',
      fieldName: 'dataScope',
      label: '数据范围',
      rules: 'selectRequired',
      componentProps: {
        options: dataScopeOptions,
        class: 'w-full',
        popupMatchSelectWidth: false,
        dropdownStyle: { minWidth: '280px' },
        optionLabelProp: 'label',
        placeholder: '请选择数据范围',
      },
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
    { component: 'Textarea', fieldName: 'remark', label: '备注' },
  ];
}
export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'name', title: '角色名称', width: 180 },
    { field: 'code', title: '角色编码', width: 180 },
    {
      field: 'dataScope',
      title: '数据范围',
      minWidth: 190,
      formatter: ({ cellValue }: any) => scopeLabels[cellValue] ?? cellValue,
    },
    { field: 'members', title: '成员数', width: 90 },
    {
      field: 'status',
      title: '状态',
      width: 90,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: '启用', value: 1 },
          { color: 'error', label: '停用', value: 0 },
        ],
      },
    },
    { field: 'remark', title: '备注', minWidth: 180 },
    {
      field: 'operation',
      title: '操作',
      fixed: 'right',
      width: 320,
      align: 'center',
      slots: { default: 'action' },
    },
  ];
}
