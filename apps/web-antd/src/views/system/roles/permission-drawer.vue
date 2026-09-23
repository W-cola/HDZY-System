<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Tree } from 'ant-design-vue';

import { updateRolePermissionsApi } from '#/api';

const emit = defineEmits<{ success: [] }>();
const role = ref<any>();
const permissions = ref<any[]>([]);
const checkedKeys = ref<string[]>([]);
const [Drawer, drawerApi] = useVbenDrawer({
  destroyOnClose: true,
  async onConfirm() {
    if (!role.value?.id) return;
    drawerApi.lock();
    try {
      await updateRolePermissionsApi(role.value.id, checkedKeys.value);
      role.value.permissions = [...checkedKeys.value];
      emit('success');
      drawerApi.close();
    } catch {
      drawerApi.unlock();
    }
  },
  onOpenChange(open) {
    if (!open) return;
    const data: any = drawerApi.getData() ?? {};
    role.value = data;
    permissions.value = data.permissionTree ?? [];
    checkedKeys.value = [...(data.permissions ?? [])];
  },
});
const title = computed(() => `配置权限：${role.value?.name ?? ''}`);
defineExpose({ drawerApi });
</script>

<template>
  <Drawer :title="title">
    <div class="pb-4 text-sm text-muted-foreground">
      页面权限控制菜单可见性；按钮权限控制具体操作。数据范围仍由角色的数据权限规则控制。
    </div>
    <Tree
      v-model:checked-keys="checkedKeys"
      :tree-data="permissions"
      checkable
      default-expand-all
      :field-names="{ title: 'title', key: 'key', children: 'children' }"
      :block-node="true"
    >
      <template #title="node">
        <span>{{ node.title }}</span>
        <span v-if="node.authCode" class="ml-2 text-xs text-muted-foreground">
          {{ node.isAction ? '操作' : '页面' }} · {{ node.authCode }}
        </span>
      </template>
    </Tree>
  </Drawer>
</template>
