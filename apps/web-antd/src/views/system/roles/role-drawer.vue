<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createRoleApi, updateRoleApi } from '#/api';

import { useRoleFormSchema } from './data';

const emit = defineEmits<{ success: [] }>();
const role = ref<any>();
const [Form, formApi] = useVbenForm({
  schema: useRoleFormSchema(),
  showDefaultActions: false,
});
const [Drawer, drawerApi] = useVbenDrawer({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      if (role.value?.id) await updateRoleApi(role.value.id, values);
      else await createRoleApi(values);
      emit('success');
      drawerApi.close();
    } catch {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    role.value = drawerApi.getData();
    formApi.reset();
    await nextTick();
    if (role.value) await formApi.setValues(role.value);
  },
});
const title = computed(() => (role.value?.id ? '编辑角色' : '新增角色'));
defineExpose({ drawerApi });
</script>
<template>
  <Drawer :title="title"><Form /></Drawer>
</template>
