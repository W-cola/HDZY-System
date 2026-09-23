import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';

const root = path.resolve(new URL('../../..', import.meta.url).pathname);
const db = new PGlite(path.join(root, 'data/pg'));
await db.waitReady;
const q = (text, values = []) => db.query(text, values);
const customers = [
  [
    '北京恒信档案科技有限公司',
    '恒信档案',
    '企业',
    '档案数字化',
    '010-68561234',
    '北京',
    '行业交流',
    '重点',
  ],
  [
    '上海启明城市建设发展有限公司',
    '启明城建',
    '企业',
    '智慧城市',
    '021-58346721',
    '上海',
    '合作伙伴',
    '普通',
  ],
  [
    '深圳远洋文化传媒集团有限公司',
    '远洋传媒',
    '企业',
    '文化传媒',
    '0755-82931678',
    '深圳',
    '官网咨询',
    '重点',
  ],
  [
    '杭州市档案馆',
    '杭州档案馆',
    '政府',
    '档案管理',
    '0571-87051268',
    '杭州',
    '行业交流',
    '重点',
  ],
  [
    '广州南粤教育发展中心',
    '南粤教育',
    '事业单位',
    '教育服务',
    '020-38910542',
    '广州',
    '转介绍',
    '潜在',
  ],
];
for (let i = 0; i < customers.length; i++) {
  const c = customers[i];
  await q(
    `INSERT INTO crm_customer(id,name,short_name,type,industry,phone,region,source,level,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
    [
      `crm-customer-${String(i + 1).padStart(3, '0')}`,
      ...c,
      `${c[0]}的客户档案与项目合作信息。`,
    ],
  );
}
console.log('已恢复基础客户数据:', customers.length);
await db.close();
