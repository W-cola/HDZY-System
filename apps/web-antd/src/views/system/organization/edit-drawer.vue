<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createDepartmentApi,
  createPositionApi,
  getDepartmentListApi,
  getPositionListApi,
  updateDepartmentApi,
  updatePositionApi,
} from '#/api';

import { deptSchema, positionSchema } from './data';
const emit = defineEmits<{ success: [] }>();
const mode = ref<'dept' | 'position'>('dept');
const data = ref<any>();
const selectedTreeValue = ref<any>();
const suggestedSort = ref(1);
function rememberTreeValue(value: any) {
  selectedTreeValue.value = value?.value ?? value?.key ?? value?.id ?? value;
  if (!data.value?.id) void updateSuggestedSort(selectedTreeValue.value);
}
const [Form, formApi] = useVbenForm({
  schema: deptSchema(rememberTreeValue),
  showDefaultActions: false,
});
function getTreeValue(value: any): any {
  if (value && typeof value === 'object') {
    return getTreeValue(value.value ?? value.key ?? value.id);
  }
  return value || undefined;
}
async function updateSuggestedSort(parent: any) {
  const parentId = getTreeValue(parent);
  try {
    const list =
      mode.value === 'dept'
        ? await getDepartmentListApi()
        : ((await getPositionListApi({ page: 1, pageSize: 200 })).items ?? []);
    const siblings =
      mode.value === 'dept'
        ? list.filter((x: any) => (x.pid ?? null) === (parentId ?? null))
        : list.filter((x: any) => x.deptId === parentId);
    suggestedSort.value =
      siblings.length > 0
        ? Math.max(...siblings.map((x: any) => Number(x.sort) || 0)) + 1
        : 1;
    if (!data.value?.id) await formApi.setValues({ sort: suggestedSort.value });
  } catch {
    suggestedSort.value = 1;
  }
}
const [Drawer, drawerApi] = useVbenDrawer({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    const selectedValue = getTreeValue(selectedTreeValue.value);
    if (mode.value === 'dept')
      values.pid = selectedValue ?? getTreeValue(values.pid);
    else values.deptId = selectedValue ?? getTreeValue(values.deptId);
    drawerApi.lock();
    try {
      if (mode.value === 'dept') {
        data.value?.id
          ? await updateDepartmentApi(data.value.id, values)
          : await createDepartmentApi(values);
      } else {
        data.value?.id
          ? await updatePositionApi(data.value.id, values)
          : await createPositionApi(values);
      }
      emit('success');
      drawerApi.close();
    } catch {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    const payload: any = drawerApi.getData() ?? {};
    mode.value = payload.mode ?? 'dept';
    data.value = payload.value;
    selectedTreeValue.value =
      mode.value === 'dept'
        ? (payload.pid ?? payload.value?.pid)
        : payload.value?.deptId;
    if (!data.value?.id) await updateSuggestedSort(selectedTreeValue.value);
    await formApi.updateSchema(
      mode.value === 'dept'
        ? deptSchema(rememberTreeValue)
        : positionSchema(rememberTreeValue),
    );
    formApi.reset();
    await nextTick();
    await formApi.setValues({
      ...payload.value,
      ...(payload.pid ? { pid: payload.pid } : {}),
    });
  },
});
const title = computed(
  () =>
    `${data.value?.id ? '编辑' : '新增'}${mode.value === 'dept' ? '部门' : '岗位'}`,
);
defineExpose({ drawerApi });
</script>
<template>
  <Drawer :title="title"><Form /></Drawer>
</template>
