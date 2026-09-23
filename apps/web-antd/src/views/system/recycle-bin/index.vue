<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';

import { message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import {
  getRecycleBinListApi,
  permanentlyDeleteRecycleBinApi,
  restoreRecycleBinApi,
} from '#/api';
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        component: 'Input',
        fieldName: 'keyword',
        label: '关键词',
        componentProps: { allowClear: true, placeholder: '名称/客户名称' },
      },
      {
        component: 'Select',
        fieldName: 'entityType',
        label: '数据类型',
        componentProps: {
          allowClear: true,
          options: ['客户单位', '联系人', '跟进记录', '销售机会'].map(
            (label) => ({
              label,
              value: label,
            }),
          ),
        },
      },
    ],
  },
  gridOptions: {
    columns: [
      { field: 'entityType', title: '数据类型', minWidth: 110 },
      { field: 'deletedAt', title: '删除时间', minWidth: 170 },
      { field: 'name', title: '数据名称', minWidth: 220 },
      { field: 'customerName', title: '所属客户', minWidth: 190 },
      { field: 'deletedBy', title: '删除人', minWidth: 100 },
      { field: 'deleteReason', title: '删除原因', minWidth: 180 },
      { field: 'referenceCount', title: '关联数', minWidth: 90 },
      {
        field: 'operation',
        title: '操作',
        minWidth: 230,
        fixed: 'right',
        slots: { default: 'action' },
      },
    ],
    rowConfig: { keyField: 'entityId' },
    proxyConfig: {
      ajax: {
        query: async ({ page }, values: any) =>
          getRecycleBinListApi({
            ...values,
            page: page.currentPage,
            pageSize: page.pageSize,
          }),
      },
    },
    toolbarConfig: { refresh: true, zoom: true, custom: true },
  } as VxeTableGridOptions,
});
function restore(row: any) {
  Modal.confirm({
    title: '恢复数据',
    content: `确认恢复“${row.name}”吗？`,
    async onOk() {
      await restoreRecycleBinApi(row.entityId);
      message.success('记录已恢复');
      gridApi.query();
    },
  });
}
function permanentlyDelete(row: any) {
  Modal.confirm({
    title: '永久删除数据',
    content: `此操作不可恢复，关联数据数：${row.referenceCount ?? 0}。确认永久删除“${row.name}”吗？`,
    async onOk() {
      await permanentlyDeleteRecycleBinApi(row.entityId);
      message.success('记录已永久删除');
      gridApi.query();
    },
  });
}
</script>
<template>
  <Page
    auto-content-height
    title="回收站"
    description="集中管理客户、联系人、跟进记录和销售机会；系统管理对象采用停用优先策略，恢复或永久删除均受权限与关联检查保护。"
  >
    <Grid table-title="已删除数据">
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              text: '恢复',
              icon: 'lucide:rotate-ccw',
              onClick: () => restore(row),
            },
            {
              text: '永久删除',
              icon: 'lucide:trash-2',
              danger: true,
              onClick: () => permanentlyDelete(row),
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
