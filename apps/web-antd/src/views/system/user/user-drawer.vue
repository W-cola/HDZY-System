<script lang="ts" setup>
import type { SystemUser } from './types';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createSystemUserApi,
  getOrganizationApi,
  getSystemRolesApi,
  updateSystemUserApi,
} from '#/api';

import { useUserFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();
const editing = ref<null | SystemUser>(null);
const userId = ref<string>();
function normalizeTreeValue(value: any): any {
  if (value && typeof value === 'object') {
    return normalizeTreeValue(value.value ?? value.key ?? value.id);
  }
  return value;
}
async function syncDepartment(value: any) {
  await formApi.setValues({ deptId: normalizeTreeValue(value) });
}
const [Form, formApi] = useVbenForm({
  schema: useUserFormSchema([], [], syncDepartment),
  showDefaultActions: false,
});
const [Drawer, drawerApi] = useVbenDrawer<null | SystemUser>({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      if (userId.value) {
        await updateSystemUserApi(userId.value, values);
      } else {
        const result = await createSystemUserApi(values);
        const temporaryPassword = result.temporaryPassword ?? 'Hdzy@123456';
        message.success(
          `用户创建成功，初始密码：${temporaryPassword}（首次登录需修改）`,
          6,
        );
      }
      emit('success');
      drawerApi.close();
    } catch {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    const [organization, roleResult] = await Promise.all([
      getOrganizationApi(),
      getSystemRolesApi({ page: 1, pageSize: 100 }),
    ]);
    await formApi.updateSchema(
      useUserFormSchema(
        organization.positions ?? [],
        roleResult.items ?? roleResult.data?.items ?? [],
        syncDepartment,
      ),
    );
    const data = drawerApi.getData();
    editing.value = data ?? null;
    userId.value = data?.id;
    formApi.reset();
    await nextTick();
    if (data) await formApi.setValues(data);
  },
});
const title = computed(() => (editing.value?.id ? '编辑用户' : '新增用户'));
defineExpose({ drawerApi });
</script>
<template>
  <Drawer :title="title"><Form /></Drawer>
</template>
