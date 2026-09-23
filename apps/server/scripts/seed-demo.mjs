import { randomBytes, scryptSync } from 'node:crypto';

import { PGlite } from '@electric-sql/pglite';

const db = new PGlite('../../data/pg');
await db.waitReady;
const hash = (password) => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
};
const q = (sql, values = []) => db.query(sql, values);
const tx = async (fn) => {
  await q('BEGIN');
  try {
    await fn();
    await q('COMMIT');
  } catch (error) {
    await q('ROLLBACK');
    throw error;
  }
};

await tx(async () => {
  const admin =
    (await q("SELECT id FROM sys_user WHERE username='admin' LIMIT 1")).rows[0]
      ?.id ?? 'u1';
  const salesRole = (
    await q("SELECT id FROM sys_role WHERE code='sales' LIMIT 1")
  ).rows[0]?.id;
  await q(
    `INSERT INTO sys_user(id,username,password,real_name,phone,email,dept_id,position_id,leader_id,status,locked,must_change_password,remark)
    VALUES ('u-sales-li','li.ming','${hash('Sales2026!')}','李明','13800138001','li.ming@huadangzhiyuan.com','sales-center','p6',$1,1,false,false,'华北区域客户经理')
    ON CONFLICT (id) DO NOTHING`,
    [admin],
  );
  await q(
    `INSERT INTO sys_user(id,username,password,real_name,phone,email,dept_id,position_id,leader_id,status,locked,must_change_password,remark)
    VALUES ('u-sales-chen','chen.yue','${hash('Sales2026!')}','陈悦','13800138002','chen.yue@huadangzhiyuan.com','sales-center','p6',$1,1,false,false,'重点客户经理')
    ON CONFLICT (id) DO NOTHING`,
    [admin],
  );
  if (salesRole) {
    await q(
      'INSERT INTO sys_user_role(user_id,role_id) VALUES($1,$2),($3,$2) ON CONFLICT DO NOTHING',
      ['u-sales-li', salesRole, 'u-sales-chen'],
    );
  }

  const customers = [
    [
      'c-demo-northstar',
      '北京北辰城市发展集团有限公司',
      '北辰城发',
      '企业',
      '城市建设与公共服务',
      '010-67891234',
      '北京市朝阳区',
      '行业展会',
      '核心',
      'u-sales-li',
      '长期合作的城市建设类客户，关注档案数字化与数据治理。',
    ],
    [
      'c-demo-huaxin',
      '华信智造（天津）有限公司',
      '华信智造',
      '企业',
      '智能制造',
      '022-58961288',
      '天津市滨海新区',
      '合作伙伴推荐',
      '重要',
      'u-sales-li',
      '制造业集团客户，拟建设统一项目档案管理平台。',
    ],
    [
      'c-demo-yonghui',
      '上海永辉生物医药研发有限公司',
      '永辉生物',
      '企业',
      '生物医药',
      '021-60873621',
      '上海市浦东新区',
      '官网咨询',
      '重要',
      'u-sales-chen',
      '研发资料合规管理需求明确，重点关注权限、留痕与检索。',
    ],
    [
      'c-demo-lanhai',
      '杭州蓝海教育科技集团有限公司',
      '蓝海教育',
      '企业',
      '教育服务',
      '0571-86982317',
      '浙江省杭州市西湖区',
      '老客户转介绍',
      '普通',
      'u-sales-chen',
      '区域教育服务企业，处于数字档案平台选型阶段。',
    ],
  ];
  for (const c of customers)
    await q(
      `INSERT INTO crm_customer(id,name,short_name,type,industry,phone,region,source,level,owner_id,status,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,$11) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,short_name=EXCLUDED.short_name,industry=EXCLUDED.industry,phone=EXCLUDED.phone,region=EXCLUDED.region,source=EXCLUDED.source,level=EXCLUDED.level,owner_id=EXCLUDED.owner_id,remark=EXCLUDED.remark,updated_at=now()`,
      c,
    );

  const contacts = [
    [
      'ct-demo-northstar-zhang',
      'c-demo-northstar',
      '张婉宁',
      '女',
      '信息化建设部部长',
      '决策人',
      '13901021876',
      '010-67895678',
      'zhang.wanning@beichen-urban.com',
      'beichen_wn',
      true,
      '负责集团数字化建设与档案治理项目立项。',
    ],
    [
      'ct-demo-northstar-zhao',
      'c-demo-northstar',
      '赵启航',
      '男',
      '档案管理中心主任',
      '业务联系人',
      '13611092743',
      '010-67894561',
      'zhao.qihang@beichen-urban.com',
      'zhao_qh',
      false,
      '负责现状调研、档案目录和验收标准确认。',
    ],
    [
      'ct-demo-huaxin-wang',
      'c-demo-huaxin',
      '王志远',
      '男',
      '集团运营总监',
      '决策人',
      '13752369108',
      '022-58962300',
      'wang.zhiyuan@huaxin-mfg.com',
      'wang_zy',
      true,
      '负责制造基地项目管理与集团资源协调。',
    ],
    [
      'ct-demo-yonghui-luo',
      'c-demo-yonghui',
      '罗思琪',
      '女',
      '质量与合规总监',
      '业务联系人',
      '13816852490',
      '021-60874512',
      'luo.siqi@yhbiopharma.com',
      'luo_sq',
      true,
      '负责研发资料合规、审计与质量体系要求。',
    ],
    [
      'ct-demo-lanhai-sun',
      'c-demo-lanhai',
      '孙嘉禾',
      '男',
      '行政信息中心经理',
      '业务联系人',
      '13588461207',
      '0571-86983456',
      'sun.jiahe@lanhai-edu.cn',
      'sun_jh',
      true,
      '负责集团行政数字化和供应商选型。',
    ],
  ];
  for (const c of contacts)
    await q(
      `INSERT INTO crm_contact(id,customer_id,name,gender,position,contact_type,mobile,telephone,email,wechat,is_primary,status,remark,contact_business) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'正常',$12,$13) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,position=EXCLUDED.position,mobile=EXCLUDED.mobile,email=EXCLUDED.email,is_primary=EXCLUDED.is_primary,remark=EXCLUDED.remark,contact_business=EXCLUDED.contact_business,updated_at=now()`,
      [...c, c[5] === '决策人' ? '商务决策与预算审批' : '需求沟通与项目协同'],
    );

  const opportunities = [
    [
      'opp-demo-northstar',
      'c-demo-northstar',
      'ct-demo-northstar-zhang',
      'u-sales-li',
      '北辰城市建设项目档案数字化平台',
      '政府及行业交流',
      '商务谈判',
      '进行中',
      1_280_000,
      65,
      '2026-10-30',
      '安排现场原型评审，确认历史档案扫描范围与接口清单',
      '2026-09-15T10:00:00+08:00',
      '正常',
      '集团总部及下属12家项目公司的档案统一管理。',
    ],
    [
      'opp-demo-huaxin',
      'c-demo-huaxin',
      'ct-demo-huaxin-wang',
      'u-sales-li',
      '华信制造基地工程档案归档项目',
      '合作伙伴推荐',
      '方案报价',
      '进行中',
      860_000,
      45,
      '2026-11-20',
      '提交二期工厂档案分类方案和实施报价',
      '2026-09-18T14:30:00+08:00',
      '正常',
      '覆盖天津、苏州两座智能制造基地的工程与设备档案。',
    ],
    [
      'opp-demo-yonghui',
      'c-demo-yonghui',
      'ct-demo-yonghui-luo',
      'u-sales-chen',
      '永辉生物研发资料合规管理项目',
      '官网咨询',
      '需求确认',
      '进行中',
      540_000,
      25,
      '2026-12-15',
      '完成研发、质量、注册三类资料的权限矩阵访谈',
      '2026-09-12T09:30:00+08:00',
      '正常',
      '重点满足研发记录留痕、版本控制和外部审计检索。',
    ],
    [
      'opp-demo-lanhai',
      'c-demo-lanhai',
      'ct-demo-lanhai-sun',
      'u-sales-chen',
      '蓝海教育集团电子档案平台选型',
      '老客户转介绍',
      '初步接触',
      '进行中',
      320_000,
      10,
      '2027-01-15',
      '发送教育行业档案管理案例并预约产品演示',
      '2026-09-22T15:00:00+08:00',
      '低',
      '计划先在杭州总部试点，再逐步覆盖区域校区。',
    ],
  ];
  for (const o of opportunities)
    await q(
      `INSERT INTO crm_opportunity(id,customer_id,primary_contact_id,owner_id,name,source,stage,status,amount,probability,expected_close_date,next_plan,next_follow_time,risk_level,description) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO UPDATE SET stage=EXCLUDED.stage,status=EXCLUDED.status,amount=EXCLUDED.amount,probability=EXCLUDED.probability,next_plan=EXCLUDED.next_plan,next_follow_time=EXCLUDED.next_follow_time,updated_at=now()`,
      o,
    );
  for (const o of opportunities)
    await q(
      `INSERT INTO crm_opportunity_stage_history(id,opportunity_id,from_stage,to_stage,operator_id,note) VALUES($1,$2,'',$3,$4,'导入客户经营样本') ON CONFLICT (id) DO NOTHING`,
      [`hist-${o[0]}`, o[0], o[6], o[3]],
    );

  const followups = [
    [
      'fu-demo-northstar-1',
      'c-demo-northstar',
      'ct-demo-northstar-zhang',
      'opp-demo-northstar',
      '2026-08-28T10:00:00+08:00',
      '现场拜访',
      '北辰集团档案治理现状调研',
      '与张婉宁、赵启航完成首次现场调研，确认集团档案分散在OA、项目系统及纸质库三类载体。',
      '明确需要先建设统一目录和权限模型',
      '高',
      '输出现状调研纪要与一期实施边界',
      '2026-09-05T10:00:00+08:00',
      '已完成',
      'u-sales-li',
      '已形成初步建设范围。',
    ],
    [
      'fu-demo-northstar-2',
      'c-demo-northstar',
      'ct-demo-northstar-zhang',
      'opp-demo-northstar',
      '2026-09-05T15:00:00+08:00',
      '方案汇报',
      '北辰项目一期方案评审',
      '在线汇报统一目录、全文检索、项目档案归档和分级授权方案，客户认可总体架构。',
      '客户要求补充与现有OA单点登录的对接说明',
      '高',
      '组织技术人员完成接口和数据迁移评估',
      '2026-09-15T10:00:00+08:00',
      '待跟进',
      'u-sales-li',
      '报价需拆分软件、实施与扫描服务。',
    ],
    [
      'fu-demo-huaxin-1',
      'c-demo-huaxin',
      'ct-demo-huaxin-wang',
      'opp-demo-huaxin',
      '2026-09-01T14:00:00+08:00',
      '电话沟通',
      '华信制造基地项目需求确认',
      '王志远确认一期覆盖天津基地近五年工程档案、设备维修档案和质量记录。',
      '客户已提供样本目录，正在内部确认预算',
      '中',
      '根据样本目录更新分类和容量测算',
      '2026-09-18T14:30:00+08:00',
      '待跟进',
      'u-sales-li',
      '需要协调交付团队参与报价。',
    ],
    [
      'fu-demo-yonghui-1',
      'c-demo-yonghui',
      'ct-demo-yonghui-luo',
      'opp-demo-yonghui',
      '2026-09-03T09:30:00+08:00',
      '视频会议',
      '永辉生物合规资料管理需求访谈',
      '围绕研发记录、质量偏差、注册申报资料讨论权限、版本、借阅和审计追踪要求。',
      '客户希望优先验证权限矩阵和版本追溯能力',
      '高',
      '安排产品演示并准备医药行业案例',
      '2026-09-12T09:30:00+08:00',
      '待跟进',
      'u-sales-chen',
      '项目预算预计在四季度释放。',
    ],
    [
      'fu-demo-lanhai-1',
      'c-demo-lanhai',
      'ct-demo-lanhai-sun',
      'opp-demo-lanhai',
      '2026-08-25T11:00:00+08:00',
      '电话沟通',
      '蓝海教育平台选型初步沟通',
      '孙嘉禾介绍集团总部及各校区当前使用共享盘管理合同、人事和招生资料，检索效率较低。',
      '客户愿意参加标准产品演示',
      '中',
      '发送教育行业案例，收集校区数量和并发用户数',
      '2026-09-22T15:00:00+08:00',
      '待跟进',
      'u-sales-chen',
      '当前处于供应商比较阶段。',
    ],
  ];
  for (const f of followups)
    await q(
      `INSERT INTO crm_follow_up(id,customer_id,contact_id,opportunity_id,follow_up_time,follow_up_type,subject,content,result,intention_level,next_plan,next_follow_time,status,owner_id,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO NOTHING`,
      f,
    );

  const profiles = [
    [
      'invp-demo-northstar',
      'c-demo-northstar',
      '北京北辰城市发展集团有限公司',
      '91110105MA01N8KX4P',
      '增值税专用发票',
      '北京市朝阳区北辰东路8号',
      '010-67890000',
      '中国工商银行北京北辰支行',
      '0200012345678901234',
      'finance@beichen-urban.com',
      '010-67890000',
      '2026-08-01',
      'u-sales-li',
    ],
    [
      'invp-demo-huaxin',
      'c-demo-huaxin',
      '华信智造（天津）有限公司',
      '91120116MA06P7D92L',
      '增值税专用发票',
      '天津经济技术开发区泰达大街88号',
      '022-58960000',
      '招商银行天津滨海分行',
      '121900001234567',
      'invoice@huaxin-mfg.com',
      '022-58960000',
      '2026-08-15',
      'u-sales-li',
    ],
    [
      'invp-demo-yonghui',
      'c-demo-yonghui',
      '上海永辉生物医药研发有限公司',
      '91310115MA1K4R7C6Q',
      '增值税普通发票',
      '上海市浦东新区张江路1206号',
      '021-60870000',
      '中国建设银行上海张江支行',
      '3105012345678900001',
      'billing@yhbiopharma.com',
      '021-60870000',
      '2026-08-20',
      'u-sales-chen',
    ],
  ];
  for (const p of profiles)
    await q(
      `INSERT INTO crm_customer_invoice_profile(id,customer_id,invoice_title,taxpayer_no,invoice_type,registered_address,registered_phone,bank_name,bank_account,invoice_email,invoice_phone,effective_from,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
      p,
    );

  const contracts = [
    [
      'con-demo-northstar',
      'BJBC-DA-2026-018',
      '北辰城市发展集团档案数字化一期服务合同',
      'c-demo-northstar',
      '张婉宁',
      '北辰集团档案数字化一期项目',
      'BJBC-DA-2026-018',
      'DA-BJ-2026-018',
      '2026-08-18',
      '2026-08-20',
      980_000,
      'u-sales-li',
      '文档',
      '2026年8月—2027年2月',
      '执行中',
      JSON.stringify({
        items: [
          {
            name: '档案平台实施服务',
            quantity: 1,
            unitPrice: 580_000,
            total: 580_000,
          },
          {
            name: '历史档案数字化加工',
            quantity: 200_000,
            unitPrice: 1.5,
            total: 300_000,
          },
          {
            name: '接口与培训服务',
            quantity: 1,
            unitPrice: 100_000,
            total: 100_000,
          },
        ],
        paymentPlans: [
          { condition: '合同签订后10个工作日', ratio: 40, amount: 392_000 },
          { condition: '一期上线验收合格', ratio: 40, amount: 392_000 },
          { condition: '质保期满', ratio: 20, amount: 196_000 },
        ],
      }),
    ],
    [
      'con-demo-huaxin',
      'TJHX-ARCH-2026-009',
      '华信制造天津基地工程档案归档项目合同',
      'c-demo-huaxin',
      '王志远',
      '华信制造天津基地工程档案归档项目',
      'TJHX-ARCH-2026-009',
      'DA-TJ-2026-009',
      '2026-08-26',
      '2026-08-28',
      680_000,
      'u-sales-li',
      '组工',
      '2026年9月—2027年1月',
      '执行中',
      JSON.stringify({
        items: [
          {
            name: '工程档案分类与整理',
            quantity: 1,
            unitPrice: 220_000,
            total: 220_000,
          },
          {
            name: '电子档案管理平台',
            quantity: 1,
            unitPrice: 360_000,
            total: 360_000,
          },
          {
            name: '实施培训与验收',
            quantity: 1,
            unitPrice: 100_000,
            total: 100_000,
          },
        ],
        paymentPlans: [
          { condition: '合同签订后', ratio: 30, amount: 204_000 },
          { condition: '平台上线', ratio: 50, amount: 340_000 },
          { condition: '项目验收', ratio: 20, amount: 136_000 },
        ],
      }),
    ],
    [
      'con-demo-yonghui',
      'SHYH-QA-2026-004',
      '永辉生物研发资料合规管理平台服务合同',
      'c-demo-yonghui',
      '罗思琪',
      '永辉生物研发资料合规管理项目',
      'SHYH-QA-2026-004',
      'DA-SH-2026-004',
      '2026-07-12',
      '2026-07-15',
      420_000,
      'u-sales-chen',
      '文档',
      '2026年7月—2026年12月',
      '已完成',
      JSON.stringify({
        items: [
          {
            name: '合规资料管理平台',
            quantity: 1,
            unitPrice: 280_000,
            total: 280_000,
          },
          {
            name: '权限矩阵与审计配置',
            quantity: 1,
            unitPrice: 90_000,
            total: 90_000,
          },
          {
            name: '用户培训与运维交接',
            quantity: 1,
            unitPrice: 50_000,
            total: 50_000,
          },
        ],
        paymentPlans: [
          { condition: '合同签订后', ratio: 50, amount: 210_000 },
          { condition: '验收合格', ratio: 50, amount: 210_000 },
        ],
      }),
    ],
  ];
  for (const c of contracts)
    await q(
      `INSERT INTO crm_contract(id,contract_no,contract_name,customer_id,contact_name,project_name,project_no,archive_no,archived_at,signed_at,amount,owner_id,project_type,project_period,status,items) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (id) DO NOTHING`,
      c,
    );

  const invoices = [
    [
      'cinv-demo-northstar-1',
      'con-demo-northstar',
      'c-demo-northstar',
      'invp-demo-northstar',
      392_000,
      '首付款',
      '2026-08-25',
      '有效',
      '07600126',
      'u-sales-li',
    ],
    [
      'cinv-demo-huaxin-1',
      'con-demo-huaxin',
      'c-demo-huaxin',
      'invp-demo-huaxin',
      204_000,
      '合同款',
      '2026-09-01',
      '有效',
      '07600141',
      'u-sales-li',
    ],
    [
      'cinv-demo-yonghui-1',
      'con-demo-yonghui',
      'c-demo-yonghui',
      'invp-demo-yonghui',
      210_000,
      '验收款',
      '2026-08-06',
      '有效',
      '07600087',
      'u-sales-chen',
    ],
  ];
  for (const i of invoices)
    await q(
      `INSERT INTO crm_contract_invoice(id,contract_id,customer_id,invoice_profile_id,invoice_amount,invoice_type,issued_at,status,invoice_no,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      i,
    );
  const payments = [
    [
      'pay-demo-northstar-1',
      'con-demo-northstar',
      'c-demo-northstar',
      392_000,
      '2026-08-28',
      '银行转账',
      '招商银行北京分行营业部',
      'RC202608280018',
      '已到账',
      'cinv-demo-northstar-1',
      'u-sales-li',
    ],
    [
      'pay-demo-huaxin-1',
      'con-demo-huaxin',
      'c-demo-huaxin',
      204_000,
      '2026-09-05',
      '银行转账',
      '中国工商银行天津开发区支行',
      'RC202609050026',
      '已到账',
      'cinv-demo-huaxin-1',
      'u-sales-li',
    ],
    [
      'pay-demo-yonghui-1',
      'con-demo-yonghui',
      'c-demo-yonghui',
      210_000,
      '2026-08-12',
      '银行转账',
      '上海浦东发展银行张江支行',
      'RC202608120011',
      '已到账',
      'cinv-demo-yonghui-1',
      'u-sales-chen',
    ],
  ];
  for (const p of payments)
    await q(
      `INSERT INTO crm_contract_payment(id,contract_id,customer_id,payment_amount,payment_date,payment_method,payment_account,receipt_no,status,invoice_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
      p,
    );

  const employees = [
    [
      'emp-demo-001',
      'HDZY-2021-017',
      '周岚',
      '女',
      '1988-03-16',
      '13800138016',
      'lan.zhou@huadangzhiyuan.com',
      '110105198803160028',
      '中国工商银行',
      '0200011111111111111',
      '王建国',
      '13901001111',
      '档案事业部',
      '交付中心负责人',
      '2021-06-01',
      '在职',
      '2021-06-01',
      '2026-05-31',
      'HDZY-LC-2021-017',
      '负责重点项目交付与验收',
    ],
    [
      'emp-demo-002',
      'HDZY-2022-034',
      '高鹏',
      '男',
      '1990-11-08',
      '13800138034',
      'peng.gao@huadangzhiyuan.com',
      '120101199011080019',
      '招商银行',
      '121900002222222',
      '高秀梅',
      '13802112222',
      '档案事业部',
      '实施顾问',
      '2022-09-15',
      '在职',
      '2022-09-15',
      '2027-09-14',
      'HDZY-LC-2022-034',
      '负责平台实施、迁移与用户培训',
    ],
    [
      'emp-demo-003',
      'HDZY-2023-052',
      '林晓雨',
      '女',
      '1993-07-24',
      '13800138052',
      'xiaoyu.lin@huadangzhiyuan.com',
      '310104199307240026',
      '中国建设银行',
      '3105013333333333333',
      '林国强',
      '13901663333',
      '综合服务中心',
      '财务专员',
      '2023-04-10',
      '在职',
      '2023-04-10',
      '2026-04-09',
      'HDZY-LC-2023-052',
      '负责合同收款、发票和费用核对',
    ],
    [
      'emp-demo-004',
      'HDZY-2020-006',
      '赵明远',
      '男',
      '1985-12-02',
      '13800138006',
      'mingyuan.zhao@huadangzhiyuan.com',
      '110108198512020015',
      '中国银行',
      '100600444444444',
      '赵淑兰',
      '13601004444',
      '总经办',
      '项目总监',
      '2020-02-17',
      '在职',
      '2020-02-17',
      '2026-02-16',
      'HDZY-LC-2020-006',
      '负责重大项目经营与资源协调',
    ],
  ];
  for (const e of employees)
    await q(
      `INSERT INTO hr_employee(id,employee_no,name,gender,birthday,mobile,email,id_card_no,bank_name,bank_account,emergency_contact,emergency_mobile,dept_name,position,entry_date,status,labor_contract_start,labor_contract_end,labor_contract_no,remark,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$21) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,mobile=EXCLUDED.mobile,email=EXCLUDED.email,position=EXCLUDED.position,status=EXCLUDED.status,remark=EXCLUDED.remark,updated_at=now()`,
      [...e, admin],
    );
});
await db.close();
console.log('业务演示数据已完成幂等写入');
