import { defineEventHandler } from 'h3';

const allowedOrigins = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  ...(process.env.LUFFY_PREVIEW_ORIGINS ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean),
]);

export default defineEventHandler((event) => {
  const origin = event.headers.get('Origin');
  if (origin && allowedOrigins.has(origin)) {
    event.node.res.setHeader('Access-Control-Allow-Origin', origin);
    event.node.res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  event.node.res.setHeader('Vary', 'Origin');
  event.node.res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization',
  );
  event.node.res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  );
  if (event.method === 'OPTIONS') {
    event.node.res.statusCode = 204;
    return '';
  }
});
