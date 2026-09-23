<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, message, Modal, TabPane, Tabs } from 'ant-design-vue';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import {
  deleteDepartmentApi,
  deletePositionApi,
  getDepartmentListApi,
  getPositionListApi,
} from '#/api';

import { deptColumns, positionColumns, positionSearchSchema } from './data';
import EditDrawer from './edit-drawer.vue';
const [Editor, editorApi] = useVbenDrawer({
  connectedComponent: EditDrawer,
  destroyOnClose: true,
});
const [DeptGrid, deptApi] = useVbenVxeGrid({
  gridOptions: {
    columns: deptColumns,
    height: 'calc(100vh - 330px)',
    pagerConfig: { enabled: false },
    proxyConfig: { ajax: { query: async () => getDepartmentListApi() } },
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
const [PositionGrid, positionApi] = useVbenVxeGrid({
  formOptions: {
    schema: positionSearchSchema(),
    showCollapseButton: true,
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-3',
  },
  gridOptions: {
    columns: positionColumns,
    height: 'calc(100vh - 330px)',
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues: Record<string, any>) =>
          getPositionListApi({
            ...formValues,
            page: page.currentPage,
            pageSize: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { refresh: true, zoom: true, custom: true },
  } as VxeTableGridOptions,
});
function open(mode: 'dept' | 'position', value?: any, pid?: string) {
  editorApi.setData({ mode, value, pid }).open();
}
function refresh() {
  deptApi.query();
  positionApi.query();
}
function delDept(row: any) {
  Modal.confirm({
    title: '停用部门',
    content: `确认停用“${row.name}”吗？停用后保留组织历史关系。`,
    async onOk() {
      await deleteDepartmentApi(row.id);
      message.success('部门已停用');
      refresh();
    },
  });
}
function delPosition(row: any) {
  Modal.confirm({
    title: '停用岗位',
    content: `确认停用“${row.name}”吗？停用后保留组织历史关系。`,
    async onOk() {
      await deletePositionApi(row.id);
      message.success('岗位已停用');
      refresh();
    },
  });
}
</script>
<template>
  <Page
    auto-content-height
    title="部门与岗位"
    description="统一维护组织层级和岗位基础资料，岗位本身不直接授予业务权限。"
  >
    <Editor @success="refresh" /><Tabs class="organization-tabs">
      <TabPane key="dept" tab="部门管理">
        <DeptGrid table-title="部门列表">
          <template #toolbar-tools>
            <Button type="primary" @click="open('dept')">
              新增部门
            </Button>
</template><template #deptAction="{ row }">
            <VbenTableAction
              :actions="[
                {
                  text: '新增下级',
                  icon: 'lucide:plus',
                  onClick: () => open('dept', undefined, row.id),
                },
                {
                  text: '编辑',
                  icon: 'lucide:edit',
                  onClick: () => open('dept', row),
                },
                {
                  text: '停用',
                  icon: 'lucide:trash-2',
                  danger: true,
                  onClick: () => delDept(row),
                },
              ]"
            />
          </template>
        </DeptGrid>
</TabPane><TabPane key="position" tab="岗位管理">
        <PositionGrid table-title="岗位列表">
          <template #toolbar-tools>
            <Button type="primary" @click="open('position')">
              新增岗位
            </Button>
</template><template #positionAction="{ row }">
            <VbenTableAction
              :actions="[
                {
                  text: '编辑',
                  icon: 'lucide:edit',
                  onClick: () => open('position', row),
                },
                {
                  text: '停用',
                  icon: 'lucide:trash-2',
                  danger: true,
                  onClick: () => delPosition(row),
                },
              ]"
            />
          </template>
        </PositionGrid>
      </TabPane>
    </Tabs>
  </Page>
</template>

<style scoped>
.organization-tabs {
  min-height: 0;
}

:deep(.organization-tabs .ant-tabs-content) {
  height: calc(100vh - 285px);
}

:deep(.organization-tabs .ant-tabs-tabpane) {
  height: 100%;
}
</style>
