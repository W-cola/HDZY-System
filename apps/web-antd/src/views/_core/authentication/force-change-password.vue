<script setup lang="ts">
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ProfilePasswordSetting, z } from '@vben/common-ui';

import { Card, message } from 'ant-design-vue';

import { changePasswordApi } from '#/api';
import { useAuthStore } from '#/store';

const router = useRouter();
const authStore = useAuthStore();
const submitting = ref(false);

const formSchema = computed((): VbenFormSchema[] => [
  {
    fieldName: 'oldPassword',
    label: '临时密码',
    component: 'VbenInputPassword',
    componentProps: { placeholder: '请输入临时密码' },
    rules: z.string().min(1, '请输入临时密码'),
  },
  {
    fieldName: 'newPassword',
    label: '新密码',
    component: 'VbenInputPassword',
    componentProps: {
      passwordStrength: true,
      placeholder: '请输入新密码（至少8位）',
    },
    rules: z.string().min(8, '新密码至少8位'),
  },
  {
    fieldName: 'confirmPassword',
    label: '确认新密码',
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
  if (submitting.value) return;
  submitting.value = true;
  try {
    await changePasswordApi(values);
    const userInfo = await authStore.fetchUserInfo();
    message.success('密码修改成功');
    await router.push(userInfo.homePath || '/operations/contract/list');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-full items-center justify-center p-6">
    <Card class="w-full max-w-xl" title="首次登录，请修改密码">
      <p class="mb-6 text-gray-500">
        当前账号使用的是临时密码，修改完成后才能进入系统。
      </p>
      <ProfilePasswordSetting
        :form-schema="formSchema"
        :loading="submitting"
        @submit="handleSubmit"
      />
    </Card>
  </div>
</template>
