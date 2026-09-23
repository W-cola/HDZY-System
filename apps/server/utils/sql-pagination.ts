import { query } from './db';

export function getPageParams(input: { page?: unknown; pageSize?: unknown }) {
  const page = Math.max(
    1,
    Math.min(1_000_000, Number.parseInt(String(input.page ?? 1), 10) || 1),
  );
  const pageSize = Math.max(
    1,
    Math.min(100, Number.parseInt(String(input.pageSize ?? 20), 10) || 20),
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export async function queryPage<T = any>(
  dataSql: string,
  countSql: string,
  values: any[],
  page: number,
  pageSize: number,
) {
  const [data, count] = await Promise.all([
    query<T>(
      `${dataSql} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize],
    ),
    query<{ total: number }>(countSql, values),
  ]);
  return { rows: data.rows, total: Number(count.rows[0]?.total ?? 0) };
}
