import { defineNitroConfig } from 'nitropack/config';

import errorHandler from './error';

process.env.COMPATIBILITY_DATE ??= '2026-01-01';

export default defineNitroConfig({
  compatibilityDate: '2026-01-01',
  devErrorHandler: errorHandler,
  errorHandler: '~/error',
  preset: 'nitro-dev',
  routeRules: {
    '/api/**': {
      cors: false,
    },
  },
});
