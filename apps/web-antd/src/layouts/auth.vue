<script lang="ts" setup>
import { computed } from 'vue';

import { AuthPageLayout } from '@vben/layouts';
import { preferences } from '@vben/preferences';

const appName = computed(() => preferences.app.name || '华档致远');
const logo = computed(() => preferences.logo.source);
const logoDark = computed(() => preferences.logo.sourceDark);
</script>

<template>
  <AuthPageLayout
    :app-name="appName"
    :logo="logo"
    :logo-dark="logoDark"
    page-title="让管理更清晰，让协作更高效"
    page-description="统一管理企业档案、组织权限与项目运营，让关键业务信息安全、规范、可追溯"
  >
    <template #logo>
      <div class="absolute top-0 left-0 z-10 flex items-center gap-3 p-6">
        <div class="brand-mark"><span></span></div>
        <div>
          <div class="brand-name">华档致远</div>
          <div class="brand-subtitle">企业档案与项目运营管理平台</div>
        </div>
      </div>
    </template>
  </AuthPageLayout>
</template>

<style scoped>
.brand-mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  background: linear-gradient(
    145deg,
    rgb(51 160 197 / 28%),
    rgb(18 55 89 / 70%)
  );
  border: 1px solid rgb(77 174 205 / 45%);
  border-radius: 11px;
  box-shadow: 0 8px 24px rgb(20 104 143 / 18%);
  transform: rotate(-8deg);
}

.brand-mark span {
  display: block;
  width: 15px;
  height: 20px;
  background: linear-gradient(160deg, #b7f6f3, #3e9fc8);
  border: 1px solid #8fe3ed;
  border-radius: 2px 4px;
}

.brand-name {
  font-size: 19px;
  font-weight: 650;
  color: hsl(var(--foreground));
  letter-spacing: 0.12em;
}

.brand-subtitle {
  margin-top: 3px;
  font-size: 8px;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0.16em;
}
</style>
