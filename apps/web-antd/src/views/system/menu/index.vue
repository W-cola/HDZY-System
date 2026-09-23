<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { deleteSystemMenuApi, getSystemMenuListApi } from '#/api';

import { columns } from './data';
import MenuDrawer from './menu-drawer.vue';
const [Editor, editorApi] = useVbenDrawer({
  connectedComponent: MenuDrawer,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns,
    height: 'auto',
    pagerConfig: { enabled: false },
    proxyConfig: { ajax: { query: async () => getSystemMenuListApi() } },
    rowConfig: { keyField: 'id' },
    treeConfig: {
      parentField: 'pid',
      rowField: 'id',
      transform: true,
      expandAll: true,
    },
    toolbarConfig: { refresh: true, zoom: true, custom: true },
  } as VxeTableGridOptions,
});
function open(data: any = {}) {
  editorApi.setData(data).open();
}
function append(row: any) {
  open({ pid: row.id, type: row.type === 'button' ? 'button' : 'menu' });
}
const protectedMenuIds = new Set([
  'm-audit-logs',
  'm-org',
  'm-permissions',
  'm-roles',
  'm-settings',
  'm-system',
  'm-users',
]);
function remove(row: any) {
  if (protectedMenuIds.has(row.id)) {
    message.warning('系统核心菜单不可删除');
    return;
  }
  Modal.confirm({
    title: '删除菜单权限',
    content: `确认删除“${row.title}”吗？`,
    async onOk() {
      await deleteSystemMenuApi(row.id);
      message.success('菜单权限已删除');
      gridApi.query();
    },
  });
}
</script>
<template>
  <Page
    auto-content-height
    title="菜单权限"
    description="统一维护系统目录、页面菜单与按钮权限标识，角色授权将基于此权限树生效。"
  >
    <Editor @success="gridApi.query" /><Grid table-title="菜单权限列表">
      <template #toolbar-tools>
        <Button type="primary" @click="open({ type: 'catalog' })">
          新增菜单
        </Button>
</template><template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              text: '新增下级',
              icon: 'lucide:plus',
              onClick: () => append(row),
            },
            { text: '编辑', icon: 'lucide:edit', onClick: () => open(row) },
            {
              text: '删除',
              icon: 'lucide:trash-2',
              danger: true,
              disabled: protectedMenuIds.has(row.id),
              tooltip: protectedMenuIds.has(row.id)
                ? '系统核心菜单不可删除'
                : undefined,
              onClick: () => remove(row),
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
