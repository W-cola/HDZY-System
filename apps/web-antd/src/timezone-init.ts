import { setTimezoneHandler } from '@vben/stores';

import { getTimezoneApi, getTimezoneOptionsApi, setTimezoneApi } from '#/api';

export function initTimezone() {
  setTimezoneHandler({
    getTimezone: getTimezoneApi,
    getTimezoneOptions: getTimezoneOptionsApi,
    setTimezone: setTimezoneApi,
  });
}
