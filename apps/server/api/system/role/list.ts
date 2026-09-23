import { eventHandler, getQuery } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, usePageResponseSuccess } from '~/utils/response';
function tree(items: any[], pid: null | string = null): any[] {
  return items
    .filter((x) => x.pid === pid)
    .map((x) => {
      const children = tree(items, x.id);
      return {
        key: x.id,
        title: x.title,
        authCode: x.authCode,
        type: x.type,
        isAction: x.type === 'button',
        disabled: x.status !== 1,
        ...(children.length > 0 ? { children } : {}),
      };
    });
}
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const q = getQuery(event);
  const [roleResult, menuResult] = await Promise.all([
    query(
      `SELECT r.id,r.code,r.name,r.builtin,r.status,r.data_scope AS "dataScope",r.remark,count(DISTINCT ur.user_id)::int AS members,coalesce(array_agg(DISTINCT rm.menu_id) FILTER (WHERE rm.menu_id IS NOT NULL),'{}') AS permissions FROM sys_role r LEFT JOIN sys_user_role ur ON ur.role_id=r.id LEFT JOIN sys_role_menu rm ON rm.role_id=r.id GROUP BY r.id ORDER BY r.name`,
    ),
    query(
      'SELECT id,pid,title,auth_code AS "authCode",type,status,sort FROM sys_menu ORDER BY sort',
    ),
  ]);
  let list = roleResult.rows;
  if (q.name)
    list = list.filter((x: any) =>
      x.name.toLowerCase().includes(String(q.name).toLowerCase()),
    );
  if (q.code)
    list = list.filter((x: any) =>
      x.code.toLowerCase().includes(String(q.code).toLowerCase()),
    );
  if (q.remark)
    list = list.filter((x: any) =>
      String(x.remark).toLowerCase().includes(String(q.remark).toLowerCase()),
    );
  if (q.status !== undefined && q.status !== '')
    list = list.filter((x: any) => String(x.status) === String(q.status));
  const response = usePageResponseSuccess(
    String(q.page ?? 1),
    String(q.pageSize ?? 20),
    list,
  );
  return {
    ...response,
    data: { ...response.data, permissionTree: tree(menuResult.rows) },
  };
});
