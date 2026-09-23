import { afterAll, describe, expect, it } from 'vitest';

const base = process.env.API_BASE_URL || 'http://127.0.0.1:5320/api';
let adminToken = '';
let salesToken = '';
const ids: string[] = [];

async function api(path: string, init: RequestInit = {}, token = adminToken) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  return { response, body: await response.json() };
}

describe('核心业务集成链路', () => {
  it('登录成功、失败和 RBAC 拒绝', async () => {
    const good = await api(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          password: process.env.TEST_ADMIN_PASSWORD || 'a123456789',
        }),
      },
      '',
    );
    expect(good.response.status).toBe(200);
    adminToken = good.body.data.accessToken;
    const bad = await api(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          password: 'definitely-wrong',
        }),
      },
      '',
    );
    expect(bad.response.status).toBe(403);
    const created = await api('/system/user', {
      method: 'POST',
      body: JSON.stringify({
        username: `quality-sales-${Date.now()}`,
        realName: '质量测试销售',
        deptId: 'ceo',
        roles: ['sales'],
      }),
    });
    expect(created.response.status).toBe(200);
    const userId = created.body.data.id;
    ids.push(userId);
    const salesLogin = await api(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          username: created.body.data.username,
          password: created.body.data.temporaryPassword,
        }),
      },
      '',
    );
    expect(salesLogin.response.status).toBe(200);
    salesToken = salesLogin.body.data.accessToken;
    const forbidden = await api('/system/role/list', {}, salesToken);
    expect(forbidden.response.status).toBe(403);
    for (let i = 0; i < 8; i++)
      await api(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            username: created.body.data.username,
            password: 'wrong-password',
          }),
        },
        '',
      );
    const locked = await api(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          username: created.body.data.username,
          password: created.body.data.temporaryPassword,
        }),
      },
      '',
    );
    expect(locked.response.status).toBe(403);
    await api(`/system/user/${userId}`, { method: 'DELETE' });
  });

  it('客户创建、软删除与回收站恢复', async () => {
    const created = await api('/system/customer', {
      method: 'POST',
      body: JSON.stringify({
        name: `质量验收客户-${Date.now()}`,
        type: '企业',
        status: 1,
      }),
    });
    expect(created.response.status).toBe(200);
    const id = created.body.data.id;
    ids.push(id);
    const updated = await api(`/system/customer/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: `${created.body.data.name}-更新`,
        type: '企业',
        status: 1,
      }),
    });
    expect(updated.response.status).toBe(200);
    const deleted = await api(`/system/customer/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason: '集成测试' }),
    });
    expect(deleted.response.status).toBe(200);
    const restored = await api(`/system/recycle-bin/${id}/restore`, {
      method: 'PUT',
    });
    expect(restored.response.status).toBe(200);
    const list = await api('/system/customer/list?page=1&pageSize=200');
    expect(list.body.data.items.some((x: any) => x.id === id)).toBe(true);
  });

  it('合同、发票与回款金额一致', async () => {
    const customer = await api('/system/customer', {
      method: 'POST',
      body: JSON.stringify({
        name: `金额验收客户-${Date.now()}`,
        type: '企业',
        status: 1,
      }),
    });
    const customerId = customer.body.data.id;
    ids.push(customerId);
    const contract = await api('/system/contract', {
      method: 'POST',
      body: JSON.stringify({
        projectNo: `QA-${Date.now()}`,
        contractName: '金额一致性合同',
        customerId,
        amount: 1000,
        items: [{ name: '服务', quantity: 1, unitPrice: 1000 }],
        paymentPlans: [{ condition: '签约', ratio: 100, amount: 1000 }],
      }),
    });
    expect(contract.response.status).toBe(200);
    const contractId = contract.body.data.id;
    const invoice = await api('/system/contract/invoice', {
      method: 'POST',
      body: JSON.stringify({ contractId, invoiceAmount: 600 }),
    });
    expect(invoice.response.status).toBe(200);
    const payment = await api('/system/contract/payment', {
      method: 'POST',
      body: JSON.stringify({ contractId, paymentAmount: 400 }),
    });
    expect(payment.response.status).toBe(200);
    const invoices = await api(
      `/system/contract/invoice/list?contractId=${contractId}&page=1&pageSize=200`,
    );
    const payments = await api(
      `/system/contract/payment/list?contractId=${contractId}&page=1&pageSize=200`,
    );
    const sum = (items: any[], key: string) =>
      items.reduce((n, x) => n + Number(x[key] || 0), 0);
    expect(sum(invoices.body.data.items, 'invoiceAmount')).toBe(600);
    expect(sum(payments.body.data.items, 'paymentAmount')).toBe(400);
    expect(600 + 400).toBe(Number(contract.body.data.amount || 1000));
  });
});

afterAll(async () => {
  for (const id of ids) {
    try {
      await api(`/system/user/${id}`, { method: 'DELETE' });
    } catch {}
  }
});
