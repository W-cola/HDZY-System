import type { EventHandlerRequest, H3Event } from 'h3';

import { getRequestIP } from 'h3';

import { query } from './db';

const windowMs = 60_000;
const limit = 10;
const attempts = new Map<string, { count: number; started: number }>();

export function checkLoginRate(
  event: H3Event<EventHandlerRequest>,
  username: string,
) {
  const key = `${getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'}:${username.trim().toLowerCase()}`;
  const now = Date.now();
  const previous = attempts.get(key);
  if (!previous || now - previous.started >= windowMs) {
    attempts.set(key, { count: 1, started: now });
    return true;
  }
  previous.count += 1;
  return previous.count <= limit;
}

export async function recordLoginFailure(id: string) {
  const result = await query<{ count: number }>(
    `UPDATE sys_user SET login_failed_count=login_failed_count+1,
      locked=CASE WHEN login_failed_count+1 >= 5 THEN true ELSE locked END,
      locked_until=CASE WHEN login_failed_count+1 >= 5 THEN now()+interval '30 minutes' ELSE locked_until END
     WHERE id=$1 RETURNING login_failed_count AS count`,
    [id],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function clearLoginFailures(id: string) {
  await query(
    'UPDATE sys_user SET login_failed_count=0,locked=false,locked_until=NULL WHERE id=$1',
    [id],
  );
}

export async function unlockExpiredAccount(id: string) {
  await query(
    `UPDATE sys_user SET locked=false,login_failed_count=0,locked_until=NULL
     WHERE id=$1 AND locked=true AND locked_until IS NOT NULL AND locked_until <= now()`,
    [id],
  );
}
