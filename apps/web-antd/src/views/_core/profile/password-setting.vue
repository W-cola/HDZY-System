<script setup lang="ts">
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';

import { computed, ref } from 'vue';

import { ProfilePasswordSetting, z } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { changePasswordApi } from '#/api';

const submitting = ref(false);
const formSchema = computed((): VbenFormSchema[] => [
  {
    fieldName: 'oldPassword',
    label: '旧密码',
    component: 'VbenInputPassword',
    componentProps: { placeholder: '请输入旧密码' },
    rules: z.string().min(1, '请输入旧密码'),
  },
  {
    fieldName: 'newPassword',
    label: '新密码',
    component: 'VbenInputPassword',
    componentProps: { passwordStrength: true, placeholder: '请输入新密码' },
    rules: z.string().min(8, '新密码至少8位'),
  },
  {
    fieldName: 'confirmPassword',
    label: '确认密码',
    component: 'VbenInputPassword',
    componentProps: { passwordStrength: true, placeholder: '请再次输入新密码' },
    dependencies: {
      rules(values) {
        return z
          .string()
          .min(1, '请再次输入新密码')
          .refine(
            (value) => value === values.newPassword,
            '两次输入的密码不一致',
          );
      },
      triggerFields: ['newPassword'],
    },
  },
]);

async function handleSubmit(values: Recordable<any>) {
  submitting.value = true;
  try {
    await changePasswordApi(values);
    message.success('密码修改成功');
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <ProfilePasswordSetting
    :form-schema="formSchema"
    :loading="submitting"
    @submit="handleSubmit"
  />
</template>
