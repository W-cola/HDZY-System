<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { Page, Tree, useVbenDrawer } from '@vben/common-ui';

import { Button, Card, InputSearch, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import {
  deleteSystemUserApi,
  getOrganizationApi,
  getSystemRolesApi,
  getSystemUsersApi,
  resetSystemUserPasswordApi,
} from '#/api';

import { useSearchSchema, useUserColumns } from './data';
import UserDrawer from './user-drawer.vue';

const departments = ref<any[]>([]);
const departmentKeyword = ref('');
const selectedDeptId = ref<string>();
const organizationWidth = ref(280);
const resizingOrganization = ref(false);
let resizeStartX = 0;
let resizeStartWidth = 0;
function startOrganizationResize(event: PointerEvent) {
  resizingOrganization.value = true;
  resizeStartX = event.clientX;
  resizeStartWidth = organizationWidth.value;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  window.addEventListener('pointermove', resizeOrganization);
  window.addEventListener('pointerup', stopOrganizationResize, { once: true });
}
function resizeOrganization(event: PointerEvent) {
  if (!resizingOrganization.value) return;
  organizationWidth.value = Math.min(
    460,
    Math.max(220, resizeStartWidth + event.clientX - resizeStartX),
  );
}
function stopOrganizationResize() {
  resizingOrganization.value = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  window.removeEventListener('pointermove', resizeOrganization);
}
onBeforeUnmount(stopOrganizationResize);
function toTreeNode(item: any): any {
  return {
    label: item.name,
    value: item.id,
    children: (item.children ?? []).map(toTreeNode),
  };
}
function filterTree(items: any[], keyword: string): any[] {
  if (!keyword) return items;
  return items
    .map((item) => {
      const children = filterTree(item.children ?? [], keyword);
      return item.label?.includes(keyword) || children.length > 0
        ? { ...item, children }
        : null;
    })
    .filter(Boolean) as any[];
}
const departmentTree = computed(() =>
  filterTree(departments.value.map(toTreeNode), departmentKeyword.value),
);
const positions = ref<any[]>([]);
const roles = ref<any[]>([]);
const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: UserDrawer,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: false,
    schema: useSearchSchema(positions.value, roles.value, departments.value),
    showCollapseButton: true,
    submitOnChange: false,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gridOptions: {
    columns: useUserColumns(),
    height: 'auto',
    keepSource: true,
    rowConfig: { keyField: 'id' },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues: Record<string, any>) => {
          const result = await getSystemUsersApi({
            ...formValues,
            positionId: formValues.positionId,
            roleCode: formValues.roleCode,
            deptId: formValues.filterDeptId ?? selectedDeptId.value,
            page: page.currentPage,
            pageSize: page.pageSize,
          });
          return result;
        },
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
function selectDepartment(node: any) {
  selectedDeptId.value = node?.value?.value;
  gridApi.query();
}
function onCreate() {
  formDrawerApi.setData(null).open();
}
function onEdit(row: any) {
  formDrawerApi.setData(row).open();
}
function onDelete(row: any) {
  Modal.confirm({
    title: '停用用户',
    content: `确认停用“${row.realName}”吗？停用后将无法登录，但会保留历史业务和审计记录。`,
    async onOk() {
      await deleteSystemUserApi(row.id);
      message.success('用户已停用');
      gridApi.query();
    },
  });
}
async function onResetPassword(row: any) {
  Modal.confirm({
    title: '重置密码',
    content: `确认重置“${row.realName}”的密码吗？`,
    async onOk() {
      const result = await resetSystemUserPasswordApi(row.id);
      message.success(
        `临时密码：${result.temporaryPassword ?? result.data?.temporaryPassword ?? '已生成'}`,
      );
    },
  });
}
function onRefresh() {
  gridApi.query();
}
onMounted(async () => {
  const [organization, roleResult] = await Promise.all([
    getOrganizationApi(),
    getSystemRolesApi({ page: 1, pageSize: 200 }),
  ]);
  departments.value = organization.departments ?? [];
  positions.value = organization.positions ?? [];
  roles.value = roleResult.items ?? roleResult.data?.items ?? [];
  await gridApi.formApi.updateSchema(
    useSearchSchema(positions.value, roles.value, departments.value),
  );
});
</script>
<template>
  <Page auto-content-height title="用户管理">
    <FormDrawer @success="onRefresh" />
    <div class="flex size-full min-h-0 gap-0">
      <Card
        class="organization-panel shrink-0"
        size="small"
        :style="{ width: `${organizationWidth}px` }"
      >
        <InputSearch
          v-model:value="departmentKeyword"
          placeholder="搜索部门..."
          allow-clear
        /><Tree
          :tree-data="departmentTree"
          label-field="label"
          value-field="value"
          :default-expanded-level="3"
          :show-expand-all="false"
          class="organization-tree"
          @select="selectDepartment"
        />
      </Card>
      <div
        class="organization-resize-handle"
        :class="{ 'is-resizing': resizingOrganization }"
        role="separator"
        aria-label="调整机构树宽度"
        title="拖动调整机构树宽度"
        @pointerdown="startOrganizationResize"
      ></div>
      <div class="min-w-0 flex-1">
        <Grid table-title="用户列表">
          <template #toolbar-tools>
            <Button type="primary" @click="onCreate">
              新增用户
            </Button>
</template><template #action="{ row }">
            <VbenTableAction
              :actions="[
                {
                  text: '编辑',
                  icon: 'lucide:edit',
                  onClick: () => onEdit(row),
                },
                {
                  text: '重置密码',
                  icon: 'lucide:key-round',
                  onClick: () => onResetPassword(row),
                },
                {
                  text: '停用',
                  icon: 'lucide:trash-2',
                  danger: true,
                  disabled: row.username === 'admin',
                  tooltip: row.username === 'admin' ? '内置管理员不可删除' : '',
                  onClick: () => onDelete(row),
                },
              ]"
              align="left"
              class="user-actions"
            />
          </template>
        </Grid>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.organization-panel {
  min-width: 220px;
  max-width: 460px;
  overflow: hidden;
}

.organization-resize-handle {
  position: relative;
  z-index: 2;
  flex: 0 0 10px;
  width: 10px;
  cursor: col-resize;
}

.organization-resize-handle::before {
  position: absolute;
  inset: 0 4px;
  content: '';
  background: transparent;
  transition: background-color 0.2s;
}

.organization-resize-handle:hover::before,
.organization-resize-handle.is-resizing::before {
  background: rgb(22 119 255 / 45%);
}

:deep(.organization-tree > div:first-child) {
  display: none;
}

:deep(.user-actions) {
  flex-wrap: nowrap;
  white-space: nowrap;
}
</style>
