/**
 * legacy-payments-transform.ts
 * Pure logic: matches the old software's PAYMENT report (Invoice_*.xlsx) to the
 * already-imported legacy invoices and plans:
 *   - real payment dates/times (TXN is IST; stored as UTC like the rest of the app)
 *   - real payment mode, staff, remarks, old payment id (as receipt number)
 *   - instalments split into separate payments (INITIAL + BALANCE)
 *   - invoice / subscription / member createdAt = real first payment date
 */
import { randomBytes } from 'node:crypto';

export type Cell = string | number | boolean | null | undefined;
export type Row = Cell[];

export interface DbInvoice {
  invoiceId: string;
  subscriptionId: string;
  memberId: string;
  legacyId: string;
  packageName: string;
  startDate: Date;
  endDate: Date;
  finalAmount: number; // paise
  paidAmount: number;
  balanceAmount: number;
  invoiceStatus: string;
  payments: { id: string; status: string; amount: number; paidAt: Date }[];
  /** member also has non-legacy (live app) invoices -> never touch the member row */
  memberHasLiveInvoices: boolean;
}

export interface PaymentOpts {
  modeMap: Record<string, string>;
}

export interface NewPayment {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  memberId: string;
  amount: number; // paise
  paymentMode: string;
  paymentType: 'INITIAL' | 'BALANCE';
  status: string;
  notes: string;
  paidAt: Date;
}

export interface InvoiceFix {
  kind: 'REBUILD' | 'REBUILD_UPDATE_INVOICE';
  invoiceId: string;
  subscriptionId: string;
  memberId: string;
  legacyId: string;
  deletePaymentIds: string[];
  payments: NewPayment[];
  firstPaidAt: Date;
  staff: string | null;
  newPaid?: number;
  newBalance?: number;
  newStatus?: string;
}

export interface PaymentFixPlan {
  fixes: InvoiceFix[];
  memberCreatedAt: { memberId: string; createdAt: Date }[];
  exceptions: { type: string; legacyId: string; detail: string }[];
  unmatched: Record<string, string>[];
  stats: {
    reportPayments: number;
    reportTotalPaise: number;
    matchedInvoices: number;
    rebuilt: number;
    rebuiltAndUpdated: number;
    kept: number;
    paymentsCreated: number;
    dateOnlyPayments: number;
    unmatchedPayments: number;
    unmatchedTotalPaise: number;
    byModePaise: Record<string, number>;
    revenueBeforeByYear: Record<string, number>;
    revenueAfterByYear: Record<string, number>;
  };
}

// ------------------------------------------------------------------ helpers
const str = (v: Cell) => (v === null || v === undefined ? '' : String(v).trim());
const norm = (s: string) => s.toUpperCase().replace(/\s+/g, ' ').replace(/\s*-\s*/g, ' - ').trim();
const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};
const isoOf = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const isoDate = (dt: Date) => isoOf(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());

function parseDay(v: string): string | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(v.trim());
  if (!m || MONTHS[m[2].toUpperCase()] === undefined) return null;
  return isoOf(Number(m[3]), MONTHS[m[2].toUpperCase()], Number(m[1]));
}

/** "19-Nov-2026 08:33 PM" (IST) -> UTC Date. "12:00 AM" = date only -> 12:00 noon IST */
function parseTxn(v: string): { at: Date; dateOnly: boolean } | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(v.trim());
  if (!m || MONTHS[m[2].toUpperCase()] === undefined) return null;
  const y = Number(m[3]);
  const mo = MONTHS[m[2].toUpperCase()];
  const d = Number(m[1]);
  let h = Number(m[4]) % 12;
  if (m[6].toUpperCase() === 'PM') h += 12;
  const min = Number(m[5]);
  if (h === 0 && min === 0) return { at: new Date(Date.UTC(y, mo, d, 6, 30, 0)), dateOnly: true };
  return { at: new Date(Date.UTC(y, mo, d, h, min, 0) - 330 * 60000), dateOnly: false };
}

export function genId(): string {
  return 'c' + Date.now().toString(36) + randomBytes(9).toString('hex');
}

interface Pay {
  paymentId: string;
  legacyId: string;
  plan: string;
  key: string;
  amount: number; // rupees
  mode: string;
  at: Date;
  dateOnly: boolean;
  staff: string;
  remark: string;
  raw: Record<string, string>;
}

function readPayments(rows: Row[], label: string): Pay[] {
  const hi = rows.findIndex((r) => str(r[0]).toUpperCase() === 'PAYMENT ID');
  if (hi < 0) throw new Error(`${label}: header row (PAYMENT ID) not found`);
  const heads = rows[hi].map((h) => str(h).toUpperCase());
  const out: Pay[] = [];
  let footerCount: number | null = null;
  let footerTotal: number | null = null;
  for (let i = hi + 1; i < rows.length; i++) {
    const rec: Record<string, string> = {};
    heads.forEach((h, j) => (rec[h] = str(rows[i][j])));
    if (/^number of records/i.test(str(rows[i][0]))) {
      footerCount = Number(/(\d+)/.exec(str(rows[i][0]))?.[1]);
      const t = heads.indexOf('AMOUNT');
      footerTotal = Number(str(rows[i][t]).replace(/[^\d]/g, ''));
      continue;
    }
    if (!/^\d+$/.test(rec['PAYMENT ID'])) continue;
    const start = parseDay(rec['START DATE']);
    const end = parseDay(rec['END DATE']);
    const txn = parseTxn(rec['TXN']);
    const amount = Number(rec['AMOUNT'].replace(/,/g, ''));
    if (!start || !end || !txn || !Number.isFinite(amount)) {
      throw new Error(`${label}: unreadable row for payment ${rec['PAYMENT ID']}: ${JSON.stringify(rec)}`);
    }
    out.push({
      paymentId: rec['PAYMENT ID'],
      legacyId: rec['MEMBER ID'],
      plan: rec['MEMBERSHIP'],
      key: `${rec['MEMBER ID']}|${norm(rec['MEMBERSHIP'])}|${start}|${end}`,
      amount,
      mode: rec['PAYMENT MODE'],
      at: txn.at,
      dateOnly: txn.dateOnly,
      staff: rec['STAFF'],
      remark: rec['REMARK'],
      raw: rec,
    });
  }
  const sum = out.reduce((s, p) => s + p.amount, 0);
  if (footerCount !== null && (out.length !== footerCount || sum !== footerTotal)) {
    throw new Error(`${label}: footer says ${footerCount} rows / ${footerTotal}, parsed ${out.length} rows / ${sum}`);
  }
  return out;
}

// -------------------------------------------------------------------- planner
export function buildPaymentFix(
  files: { name: string; rows: Row[] }[],
  invoices: DbInvoice[],
  opt: PaymentOpts,
): PaymentFixPlan {
  const exceptions: PaymentFixPlan['exceptions'] = [];
  const ex = (type: string, legacyId: string, detail: string) => exceptions.push({ type, legacyId, detail });

  const all: Pay[] = files.flatMap((f) => readPayments(f.rows, f.name));
  const seen = new Set<string>();
  for (const p of all) {
    if (seen.has(p.paymentId)) throw new Error(`Duplicate payment id ${p.paymentId} across report files`);
    seen.add(p.paymentId);
  }

  const groups = new Map<string, Pay[]>();
  for (const p of all) {
    if (p.amount <= 0) {
      ex('ZERO_AMOUNT_PAYMENT', p.legacyId, `payment ${p.paymentId} (${p.plan}) amount ${p.amount} ignored`);
      continue;
    }
    groups.set(p.key, [...(groups.get(p.key) ?? []), p]);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.at.getTime() - b.at.getTime() || Number(a.paymentId) - Number(b.paymentId));
  }

  const dbKeys = new Set<string>();
  const fixes: InvoiceFix[] = [];
  const stats: PaymentFixPlan['stats'] = {
    reportPayments: all.length,
    reportTotalPaise: all.reduce((s, p) => s + p.amount, 0) * 100,
    matchedInvoices: 0,
    rebuilt: 0,
    rebuiltAndUpdated: 0,
    kept: 0,
    paymentsCreated: 0,
    dateOnlyPayments: 0,
    unmatchedPayments: 0,
    unmatchedTotalPaise: 0,
    byModePaise: {},
    revenueBeforeByYear: {},
    revenueAfterByYear: {},
  };
  const addYear = (rec: Record<string, number>, dt: Date, amt: number) => {
    const y = String(dt.getUTCFullYear());
    rec[y] = (rec[y] ?? 0) + amt;
  };

  for (const inv of invoices) {
    const key = `${inv.legacyId}|${norm(inv.packageName)}|${isoDate(inv.startDate)}|${isoDate(inv.endDate)}`;
    if (dbKeys.has(key)) throw new Error(`Two DB invoices share the key ${key}`);
    dbKeys.add(key);

    for (const p of inv.payments) if (p.status === 'PAID') addYear(stats.revenueBeforeByYear, p.paidAt, p.amount);

    const list = groups.get(key);
    const existing = inv.payments[0];
    const keepAfter = () => {
      for (const p of inv.payments) if (p.status === 'PAID') addYear(stats.revenueAfterByYear, p.paidAt, p.amount);
      stats.kept++;
    };

    if (!list || !list.length) {
      if (inv.paidAmount > 0) ex('NO_PAYMENT_IN_REPORT', inv.legacyId, `${inv.packageName}: invoice paid ${inv.paidAmount / 100}, no payment rows in report -> kept as is`);
      keepAfter();
      continue;
    }
    groups.delete(key);
    stats.matchedInvoices++;

    const sumPaise = list.reduce((s, p) => s + p.amount, 0) * 100;
    if (existing && existing.status === 'REFUNDED') {
      ex('KEEP_REFUNDED', inv.legacyId, `${inv.packageName}: refunded invoice, report ${sumPaise / 100} vs DB ${inv.paidAmount / 100} -> kept as is`);
      keepAfter();
      continue;
    }

    let kind: InvoiceFix['kind'];
    if (sumPaise === inv.paidAmount) kind = 'REBUILD';
    else if (sumPaise > inv.paidAmount && inv.invoiceStatus !== 'CANCELLED' && sumPaise <= inv.finalAmount) kind = 'REBUILD_UPDATE_INVOICE';
    else {
      ex('SUM_MISMATCH', inv.legacyId, `${inv.packageName}: report ${sumPaise / 100} vs DB paid ${inv.paidAmount / 100} -> kept as is`);
      keepAfter();
      continue;
    }

    const status = existing?.status ?? 'PAID';
    const payments: NewPayment[] = list.map((p, i) => {
      if (p.dateOnly) stats.dateOnlyPayments++;
      const mode = opt.modeMap[p.mode] ?? p.mode;
      return {
        id: genId(),
        receiptNumber: `LEGACY-RC-${p.paymentId}`,
        invoiceId: inv.invoiceId,
        memberId: inv.memberId,
        amount: p.amount * 100,
        paymentMode: mode,
        paymentType: i === 0 ? 'INITIAL' : 'BALANCE',
        status,
        notes: `Legacy payment #${p.paymentId}${p.remark ? ' | ' + p.remark : ''}`,
        paidAt: p.at,
      };
    });
    for (const np of payments) {
      stats.paymentsCreated++;
      stats.byModePaise[np.paymentMode] = (stats.byModePaise[np.paymentMode] ?? 0) + np.amount;
      if (np.status === 'PAID') addYear(stats.revenueAfterByYear, np.paidAt, np.amount);
    }

    const fix: InvoiceFix = {
      kind,
      invoiceId: inv.invoiceId,
      subscriptionId: inv.subscriptionId,
      memberId: inv.memberId,
      legacyId: inv.legacyId,
      deletePaymentIds: inv.payments.map((p) => p.id),
      payments,
      firstPaidAt: payments[0].paidAt,
      staff: list[0].staff || null,
    };
    if (kind === 'REBUILD_UPDATE_INVOICE') {
      fix.newPaid = sumPaise;
      fix.newBalance = inv.finalAmount - sumPaise;
      fix.newStatus = fix.newBalance === 0 ? 'FULLY_PAID' : 'PARTIAL_PAID';
      stats.rebuiltAndUpdated++;
      ex('LATER_PAYMENT_APPLIED', inv.legacyId, `${inv.packageName}: paid ${inv.paidAmount / 100} -> ${sumPaise / 100}, balance ${inv.balanceAmount / 100} -> ${fix.newBalance / 100}`);
    } else stats.rebuilt++;
    fixes.push(fix);
  }

  // payments in the report that match no imported invoice
  const unmatched: Record<string, string>[] = [];
  for (const list of groups.values()) {
    for (const p of list) {
      stats.unmatchedPayments++;
      stats.unmatchedTotalPaise += p.amount * 100;
      unmatched.push({ ...p.raw, __txnUtc: p.at.toISOString() });
    }
  }

  // member created = earliest real payment among the member's rebuilt invoices
  const first = new Map<string, Date>();
  const skip = new Set(invoices.filter((i) => i.memberHasLiveInvoices).map((i) => i.memberId));
  for (const f of fixes) {
    if (skip.has(f.memberId)) continue;
    const cur = first.get(f.memberId);
    if (!cur || f.firstPaidAt.getTime() < cur.getTime()) first.set(f.memberId, f.firstPaidAt);
  }

  return {
    fixes,
    memberCreatedAt: [...first].map(([memberId, createdAt]) => ({ memberId, createdAt })),
    exceptions,
    unmatched,
    stats,
  };
}
