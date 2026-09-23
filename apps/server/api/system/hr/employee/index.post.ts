import { eventHandler, readBody } from 'h3';
import { query } from '~/utils/db';
import { requirePermission } from '~/utils/rbac';
import {
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'hr:employee:create');
  if (!user) return;
  const b: any = await readBody(event);
  if (!b?.name?.trim()) return useResponseError('请填写员工姓名');
  const parseFile = (value: any) =>
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return { id: value };
          }
        })()
      : value || {};
  const laborContractFile = parseFile(b.laborContractFile);
  const idCardFile = parseFile(b.idCardFile);
  const bankCardFile = parseFile(b.bankCardFile);
  const id = b.id || `he${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const r = await query(
    'INSERT INTO hr_employee(id,employee_no,name,gender,birthday,mobile,email,id_card_no,bank_name,bank_account,emergency_contact,emergency_mobile,dept_name,position,entry_date,status,labor_contract_start,labor_contract_end,labor_contract_no,labor_contract_file,id_card_file,bank_card_file,remark,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) ON CONFLICT(id) DO UPDATE SET employee_no=EXCLUDED.employee_no,name=EXCLUDED.name,gender=EXCLUDED.gender,birthday=EXCLUDED.birthday,mobile=EXCLUDED.mobile,email=EXCLUDED.email,id_card_no=EXCLUDED.id_card_no,bank_name=EXCLUDED.bank_name,bank_account=EXCLUDED.bank_account,emergency_contact=EXCLUDED.emergency_contact,emergency_mobile=EXCLUDED.emergency_mobile,dept_name=EXCLUDED.dept_name,position=EXCLUDED.position,entry_date=EXCLUDED.entry_date,status=EXCLUDED.status,labor_contract_start=EXCLUDED.labor_contract_start,labor_contract_end=EXCLUDED.labor_contract_end,labor_contract_no=EXCLUDED.labor_contract_no,labor_contract_file=EXCLUDED.labor_contract_file,id_card_file=EXCLUDED.id_card_file,bank_card_file=EXCLUDED.bank_card_file,remark=EXCLUDED.remark,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *',
    [
      id,
      b.employeeNo || '',
      b.name.trim(),
      b.gender || '',
      b.birthday || null,
      b.mobile || '',
      b.email || '',
      b.idCardNo || '',
      b.bankName || '',
      b.bankAccount || '',
      b.emergencyContact || '',
      b.emergencyMobile || '',
      b.deptName || '',
      b.position || '',
      b.entryDate || null,
      b.status || '在职',
      b.laborContractStart || null,
      b.laborContractEnd || null,
      b.laborContractNo || '',
      JSON.stringify(laborContractFile),
      JSON.stringify(idCardFile),
      JSON.stringify(bankCardFile),
      b.remark || '',
      user.id,
    ],
  );
  return useResponseSuccess(r.rows[0]);
});
