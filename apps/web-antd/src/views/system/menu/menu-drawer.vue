<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createSystemMenuApi, updateSystemMenuApi } from '#/api';

import { menuSchema } from './data';
const emit = defineEmits<{ success: [] }>();
const item = ref<any>();
const [Form, formApi] = useVbenForm({
  schema: menuSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});
const [Drawer, drawerApi] = useVbenDrawer({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      item.value?.id
        ? await updateSystemMenuApi(item.value.id, values)
        : await createSystemMenuApi(values);
      emit('success');
      drawerApi.close();
    } catch {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    const data: any = drawerApi.getData() ?? {};
    item.value = data.id ? data : undefined;
    formApi.reset();
    await nextTick();
    await formApi.setValues({
      ...data,
      status: data.status === 0 ? 0 : 1,
      sort: data.sort ?? 1,
    });
  },
});
const title = computed(() =>
  item.value?.id ? '编辑菜单权限' : '新增菜单权限',
);
defineExpose({ drawerApi });
</script>
<template>
  <Drawer class="w-full max-w-200" :title="title"><Form class="mx-4" /></Drawer>
</template>
