import { eventHandler, setResponseStatus } from 'h3';
import { getDatabase, getDatabaseMode } from '~/utils/db';
import { useResponseError, useResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  try {
    const db = await getDatabase();
    await db.query('SELECT 1');
    return useResponseSuccess({
      service: 'huadang-zhiyuan-api',
      status: 'ok',
      database: getDatabaseMode(),
      databaseCheck: 'ok',
    });
  } catch (error) {
    console.error('[status] database health check failed', error);
    setResponseStatus(event, 503);
    return useResponseError('Database unavailable', 'DATABASE_UNAVAILABLE');
  }
});
