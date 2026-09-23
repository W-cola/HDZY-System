import type { EventHandlerRequest, H3Event } from 'h3';

import { createError, getQuery, readBody } from 'h3';
import { z } from 'zod';

export const idSchema = z.string().trim().min(1).max(128);
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

export async function parseBody<T extends z.ZodType>(
  event: H3Event<EventHandlerRequest>,
  schema: T,
): Promise<null | z.infer<T>> {
  const result = schema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      data: { code: 'VALIDATION_ERROR', message: '请求参数不合法' },
    });
  }
  return result.data;
}

export function parseQuery<T extends z.ZodType>(
  event: H3Event<EventHandlerRequest>,
  schema: T,
): null | z.infer<T> {
  const result = schema.safeParse(getQuery(event));
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      data: { code: 'VALIDATION_ERROR', message: '查询参数不合法' },
    });
  }
  return result.data;
}

export function parseParam(event: H3Event<EventHandlerRequest>, name = 'id') {
  const value = idSchema.safeParse(event.context.params?.[name]);
  if (!value.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      data: { code: 'VALIDATION_ERROR', message: '路径参数不合法' },
    });
  }
  return value.data;
}

export const text = (max: number) => z.string().trim().max(max);
export const optionalText = (max: number) =>
  z.string().trim().max(max).optional().default('');
export const money = z.coerce
  .number()
  .finite()
  .nonnegative()
  .max(1_000_000_000_000);
