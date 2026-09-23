<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, message, Modal, Table } from 'ant-design-vue';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { deleteRoleApi, getRoleListApi, getRoleMembersApi } from '#/api';

import { useColumns, useSearchSchema } from './data';
import PermissionDrawer from './permission-drawer.vue';
import RoleDrawer from './role-drawer.vue';

const permissions = ref<any[]>([]);
const members = ref<any[]>([]);
const membersVisible = ref(false);
const memberRole = ref<any>();
const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: RoleDrawer,
  destroyOnClose: true,
});
const [PermissionFormDrawer, permissionDrawerApi] = useVbenDrawer({
  connectedComponent: PermissionDrawer,
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
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    rowConfig: { keyField: 'id' },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues: Record<string, any>) =>
          getRoleListApi({
            ...formValues,
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
function configurePermissions(row: any) {
  if (row.code === 'super') {
    message.info('超级管理员拥有全部权限，无需配置');
    return;
  }
  permissionDrawerApi
    .setData({ ...row, permissionTree: permissions.value })
    .open();
}
function onCreate() {
  formDrawerApi.setData(null).open();
}
function onEdit(row: any) {
  if (row.code === 'super') {
    message.info('超级管理员是系统锁定角色，不允许编辑');
    return;
  }
  formDrawerApi.setData(row).open();
}
async function onDelete(row: any) {
  if (row.builtin) {
    message.warning('内置角色不能删除');
    return;
  }
  Modal.confirm({
    title: '停用角色',
    content: `确认停用“${row.name}”吗？停用后会保留历史权限和审计引用。`,
    async onOk() {
      await deleteRoleApi(row.id);
      message.success('角色已停用');
      gridApi.query();
    },
  });
}
async function showMembers(row: any) {
  memberRole.value = row;
  members.value = await getRoleMembersApi(row.id);
  membersVisible.value = true;
}
onMounted(async () => {
  const result = await getRoleListApi({ page: 1, pageSize: 100 });
  permissions.value = result.permissionTree ?? [];
});
</script>
<template>
  <Page
    auto-content-height
    title="角色管理"
    description="通过角色统一配置菜单、按钮操作和数据范围。"
  >
    <FormDrawer @success="gridApi.query" />
    <PermissionFormDrawer @success="gridApi.query" />
    <Grid table-title="角色列表">
      <template #toolbar-tools>
        <Button type="primary" @click="onCreate">新增角色</Button>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              text: '配置权限',
              icon: 'lucide:shield-check',
              onClick: () => configurePermissions(row),
            },
            { text: '编辑', icon: 'lucide:edit', onClick: () => onEdit(row) },
            {
              text: '成员',
              icon: 'lucide:users',
              onClick: () => showMembers(row),
            },
            {
              text: '停用',
              icon: 'lucide:trash-2',
              danger: true,
              onClick: () => onDelete(row),
            },
          ]"
          align="center"
          class="role-actions"
        />
      </template>
    </Grid>
    <Modal
      v-model:open="membersVisible"
      :title="`${memberRole?.name ?? ''}成员`"
      :footer="null"
    >
      <Table
        :data-source="members"
        :pagination="false"
        row-key="id"
        :columns="[
          { title: '账号', dataIndex: 'username' },
          { title: '姓名', dataIndex: 'realName' },
          { title: '部门', dataIndex: 'deptId' },
        ]"
      />
    </Modal>
  </Page>
</template>

<style scoped>
:deep(.role-actions) {
  flex-wrap: nowrap;
  white-space: nowrap;
}
</style>
