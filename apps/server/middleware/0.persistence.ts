import { defineEventHandler } from 'h3';
import { initializeSystemData } from '~/utils/system-persistence';

export default defineEventHandler(async () => {
  await initializeSystemData();
});
