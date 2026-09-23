import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { getDepartmentTreeApi } from '#/api';

function flattenDepartments(items: any[], parentName = ''): any[] {
  return items.flatMap((item) => {
    const label = parentName ? `${parentName} / ${item.name}` : item.name;
    return [
      { label, value: String(item.id) },
      ...flattenDepartments(item.children ?? [], label),
    ];
  });
}

export function useSearchSchema(
  positions: any[] = [],
  roles: any[] = [],
  departments: any[] = [],
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'filterDeptId',
      label: '部门',
      componentProps: {
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
        placeholder: '全部部门',
        options: flattenDepartments(departments),
      },
    },
    {
      component: 'Input',
      fieldName: 'username',
      label: '登录账号',
      componentProps: { placeholder: '请输入登录账号', allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'realName',
      label: '姓名',
      componentProps: { placeholder: '请输入姓名', allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'userId',
      label: '用户ID',
      componentProps: { placeholder: '请输入用户ID', allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: '手机号',
      componentProps: { placeholder: '请输入手机号', allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: '邮箱',
      componentProps: { placeholder: '请输入邮箱', allowClear: true },
    },
    {
      component: 'Select',
      fieldName: 'positionId',
      label: '岗位',
      componentProps: {
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
        placeholder: '全部岗位',
        options: positions.map((item: any) => ({
          label: item.code ? `${item.name}（${item.code}）` : item.name,
          value: String(item.id),
        })),
      },
    },
    {
      component: 'Select',
      fieldName: 'roleCode',
      label: '用户角色',
      componentProps: {
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
        placeholder: '全部角色',
        options: roles
          .filter((item: any) => Number(item.status) === 1)
          .map((item: any) => ({
            label: `${item.name}（${item.code}）`,
            value: String(item.code),
          })),
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '账号状态',
      componentProps: {
        allowClear: true,
        options: [
          { label: '正常', value: 1 },
          { label: '停用', value: 0 },
        ],
        placeholder: '全部状态',
      },
    },
    {
      component: 'Select',
      fieldName: 'locked',
      label: '锁定状态',
      componentProps: {
        allowClear: true,
        options: [
          { label: '未锁定', value: false },
          { label: '已锁定', value: true },
        ],
        placeholder: '全部状态',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'createdAt',
      label: '创建时间',
      componentProps: {
        allowClear: true,
        format: 'YYYY-MM-DD',
        placeholder: ['开始日期', '结束日期'],
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'lastLoginAt',
      label: '最后登录时间',
      componentProps: {
        allowClear: true,
        format: 'YYYY-MM-DD',
        placeholder: ['开始日期', '结束日期'],
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'remark',
      label: '备注关键词',
      componentProps: { placeholder: '请输入备注关键词', allowClear: true },
    },
  ];
}

export function useUserFormSchema(
  positions: any[],
  roles: any[] = [],
  onDepartmentChange?: (value: any) => void,
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'realName',
      label: '姓名',
      rules: 'required',
      componentProps: { placeholder: '请输入姓名' },
    },
    {
      component: 'Input',
      fieldName: 'username',
      label: '登录账号',
      rules: 'required',
      componentProps: { placeholder: '请输入登录账号' },
    },
    {
      component: 'ApiTreeSelect',
      fieldName: 'deptId',
      label: '主部门',
      rules: 'selectRequired',
      componentProps: {
        allowClear: true,
        api: getDepartmentTreeApi,
        class: 'w-full',
        labelField: 'name',
        valueField: 'id',
        childrenField: 'children',
        showSearch: true,
        treeNodeFilterProp: 'name',
        treeDefaultExpandAll: false,
        dropdownStyle: { minWidth: '360px' },
        placeholder: '请选择主部门',
        onChange: onDepartmentChange,
        onSelect: onDepartmentChange,
      },
    },
    {
      component: 'Select',
      fieldName: 'positionId',
      label: '岗位',
      componentProps: {
        allowClear: true,
        options: positions.map((item) => ({
          label: item.deptName ? `${item.deptName} / ${item.name}` : item.name,
          value: item.id,
        })),
        placeholder: '请选择岗位',
      },
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: '手机号',
      componentProps: { placeholder: '请输入手机号' },
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: '邮箱',
      componentProps: { placeholder: '请输入邮箱' },
    },
    {
      component: 'Select',
      fieldName: 'roles',
      label: '用户角色',
      rules: 'selectRequired',
      componentProps: {
        mode: 'multiple',
        options: roles
          .filter((item) => item.status === 1)
          .map((item) => ({
            disabled: item.code === 'super',
            label:
              item.code === 'super' ? `${item.name}（系统锁定）` : item.name,
            value: item.code,
          })),
        placeholder: '请选择角色（决定登录后的菜单权限）',
        class: 'w-full',
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'status',
      label: '账号状态',
      defaultValue: 1,
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: [
          { label: '正常', value: 1 },
          { label: '停用', value: 0 },
        ],
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
      componentProps: { placeholder: '请输入备注' },
    },
  ];
}

export function useUserColumns(): VxeTableGridColumns {
  return [
    { field: 'username', title: '用户名', width: 150 },
    { field: 'id', title: '用户ID', width: 150 },
    {
      field: 'status',
      title: '状态',
      width: 100,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: '正常', value: 1 },
          { color: 'error', label: '停用', value: 0 },
        ],
      },
    },
    { field: 'realName', title: '姓名', width: 110 },
    { field: 'deptName', title: '所属部门', width: 170 },
    { field: 'positionName', title: '岗位', width: 130 },
    { field: 'phone', title: '手机号', width: 140 },
    {
      field: 'roleNames',
      title: '用户角色',
      minWidth: 180,
      formatter: ({ cellValue }: any) =>
        Array.isArray(cellValue) && cellValue.length > 0
          ? cellValue.join('、')
          : '未分配角色',
    },
    { field: 'remark', title: '备注', minWidth: 180 },
    { field: 'createdAt', title: '创建时间', width: 180 },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 260,
    },
  ];
}
