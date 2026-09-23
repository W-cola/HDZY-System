import { eventHandler, getQuery } from 'h3';
import { query } from '~/utils/db';
import { requirePermission } from '~/utils/rbac';
import { usePageResponseSuccess } from '~/utils/response';
import { getPageParams, queryPage } from '~/utils/sql-pagination';

function parseFile(value: unknown) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) || {};
    } catch {
      return { id: value };
    }
  }
  return value;
}

export default eventHandler(async (event) => {
  const actor = await requirePermission(event, 'hr:employee:view');
  if (!actor) return;
  await query(
    "ALTER TABLE hr_employee ADD COLUMN IF NOT EXISTS id_card_file jsonb NOT NULL DEFAULT '{}'::jsonb",
  );
  await query(
    "ALTER TABLE hr_employee ADD COLUMN IF NOT EXISTS bank_card_file jsonb NOT NULL DEFAULT '{}'::jsonb",
  );
  const q: any = getQuery(event);
  const values: any[] = [];
  const where = ['1=1'];
  if (q.keyword) {
    values.push(`%${String(q.keyword).trim()}%`);
    where.push(
      `(e.name ILIKE $${values.length} OR e.employee_no ILIKE $${values.length} OR e.mobile ILIKE $${values.length} OR e.email ILIKE $${values.length} OR e.labor_contract_no ILIKE $${values.length})`,
    );
  }
  const addLike = (field: string, value: unknown) => {
    if (!value) return;
    values.push(`%${String(value).trim()}%`);
    where.push(`${field} ILIKE $${values.length}`);
  };
  addLike('e.dept_name', q.deptName);
  addLike('e.position', q.position);
  if (q.status) {
    values.push(String(q.status));
    where.push(`e.status = $${values.length}`);
  }
  if (q.gender) {
    values.push(String(q.gender));
    where.push(`e.gender = $${values.length}`);
  }
  const addDate = (field: string, operator: string, value: unknown) => {
    if (!value) return;
    values.push(String(value));
    where.push(`${field} ${operator} $${values.length}`);
  };
  addDate('e.entry_date', '>=', q.entryDateStart);
  addDate('e.entry_date', '<=', q.entryDateEnd);
  addDate('e.labor_contract_end', '>=', q.contractEndStart);
  addDate('e.labor_contract_end', '<=', q.contractEndEnd);
  if (q.reminder === 'birthday') {
    where.push(
      "e.birthday IS NOT NULL AND date_part('day', e.birthday + make_interval(years => date_part('year', age(current_date,e.birthday))::int + 1) - current_date) BETWEEN 0 AND 30",
    );
  } else if (q.reminder === 'contract') {
    where.push(
      'e.labor_contract_end BETWEEN current_date AND current_date + 30',
    );
  } else if (q.reminder === 'none') {
    where.push(
      "NOT (e.birthday IS NOT NULL AND date_part('day', e.birthday + make_interval(years => date_part('year', age(current_date,e.birthday))::int + 1) - current_date) BETWEEN 0 AND 30) AND NOT (e.labor_contract_end BETWEEN current_date AND current_date + 30)",
    );
  }
  const { page, pageSize } = getPageParams(q);
  const fromWhere = `FROM hr_employee e WHERE ${where.join(' AND ')}`;
  const result = await queryPage(
    `SELECT e.id,e.employee_no AS "employeeNo",e.name,e.gender,to_char(e.birthday,'YYYY-MM-DD') AS birthday,e.mobile,e.email,e.id_card_no AS "idCardNo",e.bank_name AS "bankName",e.bank_account AS "bankAccount",e.emergency_contact AS "emergencyContact",e.emergency_mobile AS "emergencyMobile",e.dept_name AS "deptName",e.position,e.entry_date AS "entryDate",e.status,to_char(e.labor_contract_start,'YYYY-MM-DD') AS "laborContractStart",to_char(e.labor_contract_end,'YYYY-MM-DD') AS "laborContractEnd",e.labor_contract_no AS "laborContractNo",e.labor_contract_file AS "laborContractFile",e.id_card_file AS "idCardFile",e.bank_card_file AS "bankCardFile",e.remark,CASE WHEN e.birthday IS NOT NULL AND (date_part('day', e.birthday + make_interval(years => date_part('year', age(current_date,e.birthday))::int + 1) - current_date) BETWEEN 0 AND 30) THEN '生日临近' WHEN e.labor_contract_end IS NOT NULL AND e.labor_contract_end BETWEEN current_date AND current_date + 30 THEN '合同即将到期' ELSE '' END AS reminder ${fromWhere} ORDER BY e.created_at DESC`,
    `SELECT COUNT(*)::int AS total ${fromWhere}`,
    values,
    page,
    pageSize,
  );
  return usePageResponseSuccess(
    String(page),
    String(pageSize),
    result.rows.map((row: any) => ({
      ...row,
      laborContractFile: parseFile(row.laborContractFile),
      idCardFile: parseFile(row.idCardFile),
      bankCardFile: parseFile(row.bankCardFile),
    })),
    { total: result.total, alreadyPaginated: true },
  );
});
