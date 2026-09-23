import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PREFIX = 'scrypt$';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${PREFIX}${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  // 明文密码不再被接受，避免旧数据形成永久认证后门。
  if (!stored.startsWith(PREFIX)) return false;
  const [, salt, expected] = stored.split('$');
  if (!salt || !expected || !/^[0-9a-f]+$/i.test(expected)) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return (
    actual.length === expectedBuffer.length &&
    timingSafeEqual(actual, expectedBuffer)
  );
}
