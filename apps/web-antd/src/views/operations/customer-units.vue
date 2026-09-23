<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useAccess } from '@vben/access';

import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Upload,
} from 'ant-design-vue';
import * as XLSX from 'xlsx';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createCustomerApi,
  deleteCustomerApi,
  getCustomerListApi,
  getSalesUserOptionsApi,
  importCustomersApi,
  updateCustomerApi,
} from '#/api';

import CustomerDetailDrawer from './customer-detail-drawer.vue';

const { hasAccessByCodes, hasDisabledAccessByCodes } = useAccess();
const editing = ref<any>();
const isAdmin = () => hasAccessByCodes(['system:user:view']);
const isDisabled = (code: string) => isAdmin() && hasDisabledAccessByCodes([code]);
const canCreate = () => hasAccessByCodes(['customer:create']);
const canUpdate = () => hasAccessByCodes(['customer:update']);
const canDelete = () => hasAccessByCodes(['customer:delete']);
const canImport = () => hasAccessByCodes(['customer:import']);
const canExport = () => hasAccessByCodes(['customer:export']);
const form = ref<any>({});
const salesUsers = ref<any[]>([]);
const ownerOptions = () =>
  salesUsers.value.map((user) => ({
    label: user.realName,
    value: String(user.id),
  }));
const customerTypeOptions = () => [
  { label: '企业', value: '企业' },
  { label: '政府', value: '政府' },
  { label: '事业单位', value: '事业单位' },
];
const customerLevelOptions = () => [
  { label: '重点', value: '重点' },
  { label: '普通', value: '普通' },
  { label: '潜在', value: '潜在' },
];
const filterValue = (value: any): string | undefined => {
  if (Array.isArray(value)) return filterValue(value[0]);
  if (value && typeof value === 'object') {
    return filterValue(value.value ?? value.id ?? value.key);
  }
  const normalized =
    value === undefined || value === null ? '' : String(value).trim();
  return normalized || undefined;
};
const [DetailDrawer, detailApi] = useVbenDrawer({
  connectedComponent: CustomerDetailDrawer,
  destroyOnClose: true,
});
function showDetail(row: any) {
  detailApi.setData({ customer: row }).open();
}
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    if (!form.value.name?.trim()) {
      message.warning('请输入客户名称');
      return;
    }
    drawerApi.lock();
    try {
      editing.value?.id
        ? await updateCustomerApi(editing.value.id, form.value)
        : await createCustomerApi(form.value);
      message.success(editing.value?.id ? '客户已更新' : '客户已创建');
      gridApi.query();
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
});
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        component: 'Input',
        fieldName: 'keyword',
        label: '关键词',
        componentProps: {
          placeholder: '名称/简称/电话/负责人',
          allowClear: true,
        },
      },
      {
        component: 'Select',
        fieldName: 'ownerId',
        label: '负责人',
        componentProps: {
          allowClear: true,
          showSearch: true,
          optionFilterProp: 'label',
          placeholder: '全部负责人',
          options: ownerOptions(),
        },
      },
      {
        component: 'Select',
        fieldName: 'customerType',
        label: '客户类型',
        componentProps: {
          allowClear: true,
          options: customerTypeOptions(),
        },
      },
      {
        component: 'Input',
        fieldName: 'industry',
        label: '所属行业',
        componentProps: { placeholder: '请输入行业', allowClear: true },
      },
      {
        component: 'Input',
        fieldName: 'region',
        label: '所在地区',
        componentProps: { placeholder: '请输入地区', allowClear: true },
      },
      {
        component: 'Input',
        fieldName: 'source',
        label: '客户来源',
        componentProps: { placeholder: '请输入来源', allowClear: true },
      },
      {
        component: 'Select',
        fieldName: 'customerLevel',
        label: '客户等级',
        componentProps: {
          allowClear: true,
          options: customerLevelOptions(),
        },
      },
      {
        component: 'Select',
        fieldName: 'status',
        label: '状态',
        componentProps: {
          allowClear: true,
          options: [
            { label: '正常', value: 1 },
            { label: '停用', value: 0 },
          ],
        },
      },
    ],
  },
  gridOptions: {
    columns: [
      { field: 'name', title: '客户名称', minWidth: 180 },
      { field: 'shortName', title: '简称', minWidth: 120 },
      { field: 'type', title: '类型', minWidth: 100 },
      { field: 'industry', title: '行业', minWidth: 150 },
      { field: 'phone', title: '联系电话', minWidth: 150 },
      { field: 'region', title: '地区', minWidth: 120 },
      { field: 'level', title: '客户等级', minWidth: 110 },
      {
        field: 'ownerName',
        title: '负责人',
        width: 130,
        fixed: 'right',
        formatter: ({ cellValue }) => cellValue || '未分配',
      },
      { field: 'remark', title: '备注', minWidth: 220 },
      {
        field: 'status',
        title: '状态',
        minWidth: 90,
        cellRender: {
          name: 'CellTag',
          options: [
            { label: '正常', value: 1, color: 'success' },
            { label: '停用', value: 0, color: 'error' },
          ],
        },
      },
      {
        field: 'operation',
        title: '操作',
        minWidth: 190,
        fixed: 'right',
        slots: { default: 'action' },
      },
    ],
    rowConfig: { keyField: 'id' },
    proxyConfig: {
      ajax: {
        query: async ({ page }, values: any) => {
          const ownerId = filterValue(values.ownerId);
          const customerType = filterValue(values.customerType);
          const customerLevel = filterValue(values.customerLevel);
          return getCustomerListApi({
            ...values,
            ownerId: ownerId ? String(ownerId) : undefined,
            customerType: customerType ? String(customerType) : undefined,
            customerLevel: customerLevel ? String(customerLevel) : undefined,
            page: page.currentPage,
            pageSize: page.pageSize,
          });
        },
      },
    },
    toolbarConfig: { refresh: true, zoom: true, custom: true },
  } as VxeTableGridOptions,
});
onMounted(async () => {
  const result = await getSalesUserOptionsApi();
  salesUsers.value = result.items ?? [];
  await gridApi.formApi.updateSchema([
    { fieldName: 'ownerId', componentProps: { options: ownerOptions() } },
    {
      fieldName: 'customerType',
      componentProps: { options: customerTypeOptions() },
    },
    {
      fieldName: 'customerLevel',
      componentProps: { options: customerLevelOptions() },
    },
  ]);
});
function remove(row: any) {
  Modal.confirm({
    title: '移入回收站',
    content: `确认将“${row.name}”移入回收站吗？系统会先检查联系人、跟进记录等关联数据，恢复前仍会保留删除原因。`,
    async onOk() {
      await deleteCustomerApi(row.id);
      message.success('客户单位已删除');
      gridApi.query();
    },
  });
}
function open(row?: any) {
  editing.value = row;
  form.value = row ? { ...row } : { type: '企业', level: '普通', status: 1 };
  drawerApi.open();
}

const formRules = {
  name: [{ required: true, message: '请输入客户名称' }],
};
const importLoading = ref(false);
// 导入模板与客户列表字段保持一致；负责人填写销售人员姓名，也支持填写用户 ID。
const headers = [
  '客户名称',
  '简称',
  '类型',
  '行业',
  '联系电话',
  '地区',
  '客户等级',
  '负责人',
  '备注',
  '状态',
];
const keys = [
  'name',
  'shortName',
  'type',
  'industry',
  'phone',
  'region',
  'level',
  'ownerName',
  'remark',
  'status',
];
function downloadBlob(book: XLSX.WorkBook, filename: string) {
  const data = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
  const url = URL.createObjectURL(
    new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function downloadTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([
    headers,
    [
      '示例客户（请删除此行）',
      '示例简称',
      '企业',
      '档案服务',
      '010-12345678',
      '北京',
      '普通',
      '陈曦',
      '示例备注：客户档案与项目合作信息',
      '正常',
    ],
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, '客户单位');
  downloadBlob(book, '客户单位导入模板.xlsx');
}
async function exportCustomers() {
  const values: any = await gridApi.formApi.getValues();
  const result = await getCustomerListApi({
    ...values,
    ownerId: filterValue(values.ownerId),
    customerType: filterValue(values.customerType),
    customerLevel: filterValue(values.customerLevel),
    status:
      values.status === undefined || values.status === ''
        ? undefined
        : Number(filterValue(values.status)),
    page: 1,
    pageSize: 200,
  });
  const headers = [
    '客户名称',
    '简称',
    '类型',
    '行业',
    '联系电话',
    '地区',
    '客户等级',
    '负责人',
    '备注',
    '状态',
  ];
  const rows = (result.items ?? []).map((row: any) => [
    row.name || '',
    row.shortName || '',
    row.type || '',
    row.industry || '',
    row.phone || '',
    row.region || '',
    row.level || '',
    row.ownerName || '未分配',
    row.remark || '',
    row.status === 1 ? '正常' : '停用',
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet['!cols'] = [28, 18, 14, 20, 18, 16, 14, 16, 36, 12].map((wch) => ({
    wch,
  }));
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  sheet['!autofilter'] = { ref: `A1:J${Math.max(1, rows.length + 1)}` };
  const border = { style: 'thin', color: { rgb: 'FFD9E2F3' } };
  for (let column = 0; column < headers.length; column++) {
    const headerCell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    headerCell.s = {
      font: {
        name: 'Microsoft YaHei',
        sz: 11,
        bold: true,
        color: { rgb: 'FFFFFF' },
      },
      fill: { patternType: 'solid', fgColor: { rgb: '1677FF' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: { top: border, bottom: border, left: border, right: border },
    };
    for (let row = 1; row <= rows.length; row++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (!cell) continue;
      cell.s = {
        font: { name: 'Microsoft YaHei', sz: 10, color: { rgb: '1F2937' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: { top: border, bottom: border, left: border, right: border },
      };
    }
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, '客户单位');
  downloadBlob(book, `客户单位-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
async function handleImport(file: File) {
  importLoading.value = true;
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      message.error('导入失败：Excel中没有工作表');
      return false;
    }
    const rows = XLSX.utils.sheet_to_json<any[]>(
      workbook.Sheets[firstSheetName]!,
      { header: 1, defval: '' },
    );
    if (
      rows.length === 0 ||
      headers.some((header, i) => rows[0]?.[i] !== header)
    ) {
      message.error('导入失败：请使用系统提供的模板，且不要修改表头');
      return false;
    }
    const customers = rows
      .slice(1)
      .filter(
        (row: any[]) =>
          row.some(Boolean) && row[0] !== '示例客户（请删除此行）',
      )
      .map((row: any[]) =>
        Object.fromEntries(keys.map((key, i) => [key, row[i]])),
      );
    const result = await importCustomersApi({ customers });
    message.success(`成功导入${result.imported}条客户`);
    gridApi.query();
  } finally {
    importLoading.value = false;
  }
  return false;
}
</script>
<template>
  <Page
    auto-content-height
    title="客户单位"
    description="维护客户主档案，为联系人、合同和项目提供统一客户基础资料。"
  >
    <Drawer :title="editing?.id ? '编辑客户' : '新增客户'">
      <Form
        :model="form"
        :rules="formRules"
        layout="vertical"
        class="customer-form"
      >
        <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item label="客户名称" required>
            <Input v-model:value="form.name" placeholder="请输入客户全称" />
          </Form.Item>
          <Form.Item label="客户简称">
            <Input
              v-model:value="form.shortName"
              placeholder="请输入客户简称"
            />
          </Form.Item>
          <Form.Item label="客户类型">
            <Select
              v-model:value="form.type"
              class="w-full"
              placeholder="请选择客户类型"
              :options="[
                { label: '企业', value: '企业' },
                { label: '政府', value: '政府' },
                { label: '事业单位', value: '事业单位' },
              ]"
            />
</Form.Item><Form.Item label="所属行业">
            <Input v-model:value="form.industry" placeholder="请输入所属行业" />
          </Form.Item>
          <Form.Item label="联系电话">
            <Input v-model:value="form.phone" placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item label="所在地区">
            <Input v-model:value="form.region" placeholder="请输入所在地区" />
          </Form.Item>
          <Form.Item label="客户来源">
            <Input v-model:value="form.source" placeholder="请输入客户来源" />
          </Form.Item>
          <Form.Item label="客户等级">
            <Select
              v-model:value="form.level"
              class="w-full"
              placeholder="请选择客户等级"
              :options="[
                { label: '重点', value: '重点' },
                { label: '普通', value: '普通' },
                { label: '潜在', value: '潜在' },
              ]"
            />
</Form.Item><Form.Item label="客户状态">
            <Select
              v-model:value="form.status"
              class="w-full"
              placeholder="请选择客户状态"
              :options="[
                { label: '正常', value: 1 },
                { label: '停用', value: 0 },
              ]"
            />
</Form.Item><Form.Item class="md:col-span-2" label="备注">
            <Input.TextArea
              v-model:value="form.remark"
              :rows="4"
              placeholder="请输入备注"
            />
          </Form.Item>
        </div>
      </Form>
</Drawer><DetailDrawer /><Grid table-title="客户列表">
      <template #toolbar-tools>
        <Button @click="downloadTemplate">下载导入模板</Button><Upload
          v-if="canImport() || isDisabled('customer:import')"
          :show-upload-list="false"
          :before-upload="handleImport"
          accept=".xlsx,.xls"
        >
          <Button
            :class="{ 'permission-disabled': isDisabled('customer:import') }"
            :loading="importLoading"
            :title="isDisabled('customer:import') ? '该功能已停用' : undefined"
            @click.prevent="isDisabled('customer:import') && $event.stopImmediatePropagation()"
          >
            导入 Excel
          </Button>
</Upload><Button v-if="canExport() || isDisabled('customer:export')"
          :class="{ 'permission-disabled': isDisabled('customer:export') }"
          :title="isDisabled('customer:export') ? '该功能已停用' : undefined"
          @click="!isDisabled('customer:export') && exportCustomers()">导出 Excel</Button><Button v-if="canCreate() || isDisabled('customer:create')"
          :class="{ 'permission-disabled': isDisabled('customer:create') }"
          :title="isDisabled('customer:create') ? '该功能已停用' : undefined"
          type="primary"
          @click="!isDisabled('customer:create') && open()">新增客户</Button>
</template><template #action="{ row }">
        <Space>
          <Button v-if="canUpdate() || isDisabled('customer:update')"
            :class="{ 'permission-disabled': isDisabled('customer:update') }"
            :title="isDisabled('customer:update') ? '该功能已停用' : undefined"
            type="link"
            size="small"
            @click="!isDisabled('customer:update') && open(row)">编辑</Button>
          <Button type="link" size="small" @click="showDetail(row)">
            详情
          </Button>
          <Button v-if="canDelete() || isDisabled('customer:delete')"
            :class="{ 'permission-disabled': isDisabled('customer:delete') }"
            :title="isDisabled('customer:delete') ? '该功能已停用' : undefined"
            type="link"
            danger
            size="small"
            @click="!isDisabled('customer:delete') && remove(row)">
            删除
          </Button>
        </Space>
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
.permission-disabled {
  cursor: not-allowed !important;
  opacity: 0.45;
  pointer-events: auto;
}

.customer-form :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.customer-form :deep(.ant-input),
.customer-form :deep(.ant-select),
.customer-form :deep(.ant-input-affix-wrapper),
.customer-form :deep(.ant-input-number) {
  width: 100%;
}
</style>
