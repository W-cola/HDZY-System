import { defineConfig } from '@vben/vite-config';

function getAllowedHosts() {
  const previewHosts =
    process.env.LUFFY_PREVIEW_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => {
        const normalized = origin
          .replace(/^\*/, '')
          .replace(/^https?:\/\//, '');
        return normalized.split('/')[0]?.split(':')[0];
      })
      .filter((host): host is string => Boolean(host)) ?? [];

  // 预览域名会在每次沙箱恢复时变化；Vite 支持以点号开头的域名后缀匹配。
  // 保留显式注入域名，同时允许平台的 sbx 预览域名访问开发服务器。
  return [...new Set(['.sbx.luxiaofei.cc', ...previewHosts])];
}

export default defineConfig(async () => {
  return {
    application: {
      // 平台清单已经独立启动 server，禁止前端重复拉起 Nitro Mock。
      nitroMock: false,
    },
    vite: {
      server: {
        allowedHosts: getAllowedHosts(),
        proxy: {
          '/api': {
            changeOrigin: true,
            // 独立 API 服务保留 /api 路径，避免重写造成接口地址错位。
            target: 'http://127.0.0.1:5320',
            ws: true,
          },
        },
      },
    },
  };
});
