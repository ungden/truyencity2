import { sepayService } from '../src/services/billing/sepay-service';

type VipOrder = {
  id: string;
  user_id: string;
  plan: 'monthly' | 'yearly';
  amount_vnd: number;
  payment_code: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  sepay_transaction_id: number | null;
  sepay_reference_code?: string | null;
  paid_at?: string | null;
  expires_at: string;
  created_at: string;
};

class MockQuery {
  private filters: Array<{ key: string; value: unknown; op: 'eq' | 'gt' }> = [];
  private limitCount: number | null = null;
  private insertPayload: Record<string, unknown> | null = null;
  private updatePayload: Record<string, unknown> | null = null;

  constructor(private table: string, private db: MockSupabase) {}

  select(_columns?: string) {
    return this;
  }

  eq(key: string, value: unknown) {
    this.filters.push({ key, value, op: 'eq' });
    return this;
  }

  gt(key: string, value: unknown) {
    this.filters.push({ key, value, op: 'gt' });
    return this;
  }

  order(_key: string, _opts: { ascending: boolean }) {
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return Promise.resolve({ data: this.runSelectMany(), error: null });
  }

  insert(payload: Record<string, unknown>) {
    this.insertPayload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.updatePayload = payload;
    return this;
  }

  async single() {
    if (this.insertPayload) {
      return { data: this.db.insert(this.table, this.insertPayload), error: null };
    }

    if (this.updatePayload) {
      return { data: null, error: this.db.update(this.table, this.filters, this.updatePayload) };
    }

    const rows = this.runSelectMany();
    if (rows.length === 0) {
      return { data: null, error: { message: 'No row' } };
    }
    if (rows.length > 1) {
      return { data: null, error: { message: 'Multiple rows' } };
    }
    return { data: rows[0], error: null };
  }

  then(resolve: (value: { error: null | { message: string } }) => void) {
    if (this.insertPayload) {
      this.db.insert(this.table, this.insertPayload);
      resolve({ error: null });
      return;
    }
    if (!this.updatePayload) {
      resolve({ error: null });
      return;
    }
    resolve({ error: this.db.update(this.table, this.filters, this.updatePayload) });
  }

  private runSelectMany() {
    const rows = this.db.rows(this.table);
    const filtered = rows.filter((row) =>
      this.filters.every((f) => {
        if (f.op === 'eq') return row[f.key] === f.value;
        if (f.op === 'gt') return String(row[f.key] ?? '') > String(f.value ?? '');
        return false;
      })
    );
    return this.limitCount ? filtered.slice(0, this.limitCount) : filtered;
  }
}

class MockSupabase {
  private vipOrders: VipOrder[] = [];
  private txRows: Array<Record<string, unknown>> = [];
  private subs: Array<Record<string, unknown>> = [{ user_id: 'user-1' }];

  from(table: string) {
    return new MockQuery(table, this);
  }

  rows(table: string): Array<Record<string, unknown>> {
    if (table === 'vip_orders') return this.vipOrders;
    if (table === 'credit_transactions') return this.txRows;
    if (table === 'user_subscriptions') return this.subs;
    return [];
  }

  insert(table: string, payload: Record<string, unknown>) {
    if (table === 'credit_transactions') {
      this.txRows.push(payload);
      return payload;
    }
    if (table !== 'vip_orders') return null;
    const row: VipOrder = {
      id: `order-${this.vipOrders.length + 1}`,
      user_id: String(payload.user_id),
      plan: payload.plan as 'monthly' | 'yearly',
      amount_vnd: Number(payload.amount_vnd),
      payment_code: String(payload.payment_code),
      status: 'pending',
      sepay_transaction_id: null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    this.vipOrders.push(row);
    return row;
  }

  update(table: string, filters: Array<{ key: string; value: unknown; op: 'eq' | 'gt' }>, payload: Record<string, unknown>) {
    const rows = this.rows(table);
    const targets = rows.filter((row) =>
      filters.every((f) => (f.op === 'eq' ? row[f.key] === f.value : String(row[f.key] ?? '') > String(f.value ?? '')))
    );
    if (targets.length === 0) return { message: 'No rows updated' };
    for (const target of targets) {
      Object.assign(target, payload);
    }
    return null;
  }

  getVipOrders() {
    return this.vipOrders;
  }
}

async function main() {
  process.env.SEPAY_ACCOUNT_NUMBER = '96247TRUYEN';
  process.env.SEPAY_BANK_CODE = 'OCB';
  process.env.SEPAY_ACCOUNT_NAME = 'TRUYEN CITY';

  const db = new MockSupabase();

  const created = await sepayService.createVipOrder(db as never, 'user-1', 'monthly');
  if ('error' in created) {
    throw new Error(`createVipOrder failed: ${created.error}`);
  }

  if (created.bank_info.account_number !== '96247TRUYEN') {
    throw new Error(`Expected fixed account number, got ${created.bank_info.account_number}`);
  }

  if (!/^TCVIP[A-Z0-9]{8}$/.test(created.bank_info.content)) {
    throw new Error(`Invalid payment code format: ${created.bank_info.content}`);
  }

  const payment = await sepayService.handlePayment(db as never, {
    id: 888001,
    code: created.bank_info.content,
    content: `Thanh toan ${created.bank_info.content}`,
    transferType: 'in',
    transferAmount: 99000,
    referenceCode: 'TEST.888001',
    gateway: 'OCB',
    transactionDate: '2026-03-01 12:00:00',
    accountNumber: '96247TRUYEN',
  });

  if (!payment.success) {
    throw new Error(`handlePayment failed: ${payment.error || 'unknown error'}`);
  }

  const order = db.getVipOrders()[0];
  if (!order || order.status !== 'paid') {
    throw new Error('Order status was not updated to paid');
  }

  console.log('SePay smoke test passed');
  console.log(`Order=${order.id} Account=${created.bank_info.account_number} Code=${order.payment_code}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
