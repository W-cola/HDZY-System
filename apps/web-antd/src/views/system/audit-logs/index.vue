<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { getAuditLogsApi } from '#/api';

import { columns, useSearchSchema } from './data';
import DetailDrawer from './detail-drawer.vue';
const [Detail, detailApi] = useVbenDrawer({
  connectedComponent: DetailDrawer,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: false,
    schema: useSearchSchema(),
    showCollapseButton: true,
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridOptions: {
    columns,
    height: 'auto',
    rowConfig: { keyField: 'id' },
    proxyConfig: {
      ajax: {
        query: async ({ page }, values) =>
          getAuditLogsApi({
            ...values,
            page: page.currentPage,
            pageSize: page.pageSize,
          }),
      },
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions,
});
function showDetail(row: any) {
  detailApi.setData(row).open();
}
async function exportLogs() {
  const values = await gridApi.formApi.getValues();
  const result = await getAuditLogsApi({
    ...values,
    page: 1,
    pageSize: 200,
  });
  const rows = result.items ?? [];
  const quote = (value: any) =>
    `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [
    [
      '操作时间',
      '操作人',
      '模块',
      '操作类型',
      '操作对象',
      '结果',
      'IP地址',
      '详情',
    ],
    ...rows.map((x: any) => [
      x.createdAt,
      x.operator,
      x.module,
      x.action,
      x.target,
      x.result,
      x.ip,
      x.detail,
    ]),
  ]
    .map((row) => row.map(quote).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `操作日志-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  message.success(`已导出 ${rows.length} 条日志`);
}
</script>
<template>
  <Page
    auto-content-height
    title="操作日志"
    description="记录系统重要操作，支持组合查询、详情查看与按当前条件导出；日志只读，不允许修改或删除。"
  >
    <Detail /><Grid table-title="操作日志列表">
      <template #toolbar-tools>
        <Button @click="exportLogs">导出日志</Button>
</template><template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              text: '详情',
              icon: 'lucide:search',
              onClick: () => showDetail(row),
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
