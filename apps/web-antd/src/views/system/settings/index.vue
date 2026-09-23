<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useTimezoneStore } from '@vben/stores';

import { Alert, Button, Card, message, TabPane, Tabs } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  getSystemSettingsApi,
  getTimezoneOptionsApi,
  updateSystemSettingsApi,
} from '#/api';

import { logSchema, securitySchema, systemInfoSchema } from './data';
const timezoneStore = useTimezoneStore();
const loading = ref(false);
const initialSettings = ref<any>({});
const [SystemForm, systemFormApi] = useVbenForm({
  schema: systemInfoSchema([]),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 xl:grid-cols-2',
});
const [SecurityForm, securityFormApi] = useVbenForm({
  schema: securitySchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 xl:grid-cols-2',
});
const [LogForm, logFormApi] = useVbenForm({
  schema: logSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 xl:grid-cols-2',
});
async function load() {
  const [settings, timezoneOptions] = await Promise.all([
    getSystemSettingsApi(),
    getTimezoneOptionsApi(),
  ]);
  initialSettings.value = settings;
  await systemFormApi.updateSchema(systemInfoSchema(timezoneOptions));
  await Promise.all([
    systemFormApi.setValues(settings),
    securityFormApi.setValues(settings),
    logFormApi.setValues(settings),
  ]);
}
onMounted(load);
async function save() {
  const results = await Promise.all([
    systemFormApi.validate(),
    securityFormApi.validate(),
    logFormApi.validate(),
  ]);
  if (results.some((x) => !x.valid)) return;
  loading.value = true;
  try {
    const values = {
      ...initialSettings.value,
      ...(await systemFormApi.getValues()),
      ...(await securityFormApi.getValues()),
      ...(await logFormApi.getValues()),
    };
    await updateSystemSettingsApi(values);
    if (values.timezone) await timezoneStore.setTimezone(values.timezone);
    initialSettings.value = values;
    message.success('系统设置已保存并同步生效');
  } finally {
    loading.value = false;
  }
}
async function reset() {
  await load();
  message.info('已恢复到最近保存的设置');
}
</script>
<template>
  <Page
    auto-content-height
    title="系统设置"
    description="维护全局默认参数；个人偏好和顶部栏出现同类设置时，将读取并同步这里的配置。"
  >
    <div class="settings-shell">
      <Alert
        type="info"
        show-icon
        message="全局配置中心"
        description="系统名称、时区、安全与日志策略在这里统一维护。顶部栏时区与本页使用同一配置源。"
      /><Card class="mt-4 settings-card" :body-style="{ padding: 0 }">
        <Tabs tab-position="left" class="settings-tabs">
          <TabPane key="general" tab="基础设置">
            <section class="settings-section">
              <div class="section-heading">
                <h3>系统信息与通用参数</h3>
                <p>用于登录页、顶部栏、列表和文件上传等全局场景。</p>
              </div>
              <SystemForm />
            </section>
</TabPane><TabPane key="security" tab="安全策略">
            <section class="settings-section">
              <div class="section-heading">
                <h3>账号与密码安全</h3>
                <p>统一约束密码强度、登录失败锁定和账号保护规则。</p>
              </div>
              <SecurityForm />
            </section>
</TabPane><TabPane key="logs" tab="日志策略">
            <section class="settings-section">
              <div class="section-heading">
                <h3>操作日志策略</h3>
                <p>关键安全日志始终保留，详细模式适用于临时排障与审计。</p>
              </div>
              <LogForm />
            </section>
          </TabPane>
        </Tabs>
        <div class="settings-footer">
          <Button @click="reset">恢复已保存值</Button><Button type="primary" :loading="loading" @click="save">
            保存设置
          </Button>
        </div>
      </Card>
    </div>
  </Page>
</template>
<style scoped>
.settings-shell {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

.settings-card {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.settings-tabs {
  height: 100%;
  min-height: 0;
}

:deep(.settings-tabs > .ant-tabs-nav) {
  width: 180px;
  padding: 20px 12px;
  margin: 0;
  background: hsl(var(--muted) / 35%);
}

:deep(.settings-tabs > .ant-tabs-content-holder) {
  min-width: 0;
  min-height: 0;
}

:deep(.settings-tabs > .ant-tabs-content) {
  height: 100%;
}

:deep(.settings-tabs .ant-tabs-tabpane) {
  height: 100%;
  overflow: auto;
}

:deep(.settings-tabs .ant-tabs-tab) {
  padding: 12px 18px !important;
  margin: 2px 0 !important;
  border-radius: 8px;
}

:deep(.settings-tabs .ant-tabs-tab-active) {
  background: hsl(var(--primary) / 10%);
}

.settings-section {
  min-height: 100%;
  padding: 28px 32px 80px;
}

.section-heading {
  padding-bottom: 18px;
  margin-bottom: 24px;
  border-bottom: 1px solid hsl(var(--border));
}

.section-heading h3 {
  font-size: 18px;
  font-weight: 600;
}

.section-heading p {
  margin-top: 6px;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}

.settings-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 180px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 14px 28px;
  background: hsl(var(--background) / 96%);
  border-top: 1px solid hsl(var(--border));
  backdrop-filter: blur(8px);
}

:deep(.settings-card > .ant-card-body) {
  position: relative;
}

@media (max-width: 900px) {
  :deep(.settings-tabs > .ant-tabs-nav) {
    width: 140px;
  }

  .settings-footer {
    left: 140px;
  }

  .settings-section {
    padding: 24px 20px 80px;
  }
}
</style>
