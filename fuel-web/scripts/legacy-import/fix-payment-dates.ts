/**
 * fix-payment-dates.ts
 *
 *   npx tsx scripts/legacy-import/fix-payment-dates.ts            -> DRY RUN (reads DB, writes nothing)
 *   npx tsx scripts/legacy-import/fix-payment-dates.ts --commit   -> applies the fix (ONE transaction)
 *
 * Needs the 3 payment report files in ./legacy-data/ (Invoice_1/2/3.xlsx).
 * Only touches rows created by the legacy import (invoice number LEGACY-*).
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { buildPaymentFix, DbInvoice, Row } from './legacy-payments-transform';

// ------------------------------------------------------------------ CONFIG
const DIR = './legacy-data';
const FILES = ['Invoice_1.xlsx', 'Invoice_2.xlsx', 'Invoice_3.xlsx'];
/** old software payment mode -> value stored in Payment.paymentMode (app uses GPay, Cash, UPI, Razorpay) */
const MODE_MAP: Record<string, string> = {
  'Google Pay': 'GPay',
  Cash: 'Cash',
  Card: 'Card',
  Account: 'Account',
  PhonePe: 'UPI',
  Paytm: 'UPI',
};
// ------------------------------------------------------------------------

const COMMIT = process.argv.includes('--commit');
const OUT = './legacy-output';
const prisma = new PrismaClient();

const readSheet = (file: string): Row[] => {
  const wb = XLSX.readFile(path.join(DIR, file));
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
};
const inr = (paise: number) => '₹' + (paise / 100).toLocaleString('en-IN');
const chunks = <T,>(a: T[], n = 500): T[][] =>
  Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const heads = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [heads.join(','), ...rows.map((r) => heads.map((h) => esc(r[h])).join(','))].join('\n');
};
const table = (rec: Record<string, number>) =>
  Object.entries(rec).sort().forEach(([k, v]) => console.log('  ', k.padEnd(10), inr(v)));

async function main() {
  console.log(COMMIT ? '=== COMMIT MODE ===' : '=== DRY RUN (nothing will be written) ===');

  // ---- load imported invoices
  const rows = await prisma.invoice.findMany({
    where: { invoiceNumber: { startsWith: 'LEGACY-' } },
    select: {
      id: true, memberId: true, packageName: true, finalAmount: true, paidAmount: true,
      balanceAmount: true, status: true,
      member: { select: { legacyId: true } },
      subscription: { select: { id: true, startDate: true, endDate: true } },
      payments: {
        where: { receiptNumber: { startsWith: 'LEGACY-RC-' } },
        select: { id: true, status: true, amount: true, paidAt: true, receiptNumber: true },
      },
    },
  });
  if (!rows.length) throw new Error('No LEGACY invoices found. Run the member import first.');

  const alreadyFixed = rows.filter((r) => r.payments.some((p) => /^LEGACY-RC-\d+$/.test(p.receiptNumber))).length;
  if (alreadyFixed > 0) {
    const msg = `${alreadyFixed} invoices already carry real-date payments (LEGACY-RC-<id>).`;
    if (COMMIT) throw new Error(msg + ' Refusing to run twice.');
    console.warn('WARNING: ' + msg);
  }

  const liveMembers = new Set(
    (await prisma.invoice.findMany({
      where: { NOT: { invoiceNumber: { startsWith: 'LEGACY-' } } },
      select: { memberId: true },
      distinct: ['memberId'],
    })).map((x) => x.memberId),
  );

  const invoices: DbInvoice[] = rows.map((r) => {
    if (!r.subscription || !r.member.legacyId) throw new Error(`Invoice ${r.id} has no subscription / legacyId`);
    return {
      invoiceId: r.id,
      subscriptionId: r.subscription.id,
      memberId: r.memberId,
      legacyId: r.member.legacyId,
      packageName: r.packageName,
      startDate: r.subscription.startDate,
      endDate: r.subscription.endDate,
      finalAmount: r.finalAmount,
      paidAmount: r.paidAmount,
      balanceAmount: r.balanceAmount,
      invoiceStatus: r.status,
      payments: r.payments.map((p) => ({ id: p.id, status: p.status, amount: p.amount, paidAt: p.paidAt })),
      memberHasLiveInvoices: liveMembers.has(r.memberId),
    };
  });

  const plan = buildPaymentFix(
    FILES.map((f) => ({ name: f, rows: readSheet(f) })),
    invoices,
    { modeMap: MODE_MAP },
  );

  // ---- sales rep: staff name -> User (only when exactly one user has that name)
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const repId = new Map<string, string | null>();
  for (const staff of new Set(plan.fixes.map((f) => f.staff).filter(Boolean) as string[])) {
    const hit = users.filter((u) => u.name.trim().toLowerCase() === staff.trim().toLowerCase());
    repId.set(staff, hit.length === 1 ? hit[0].id : null);
  }

  // ---- reports
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'payment-fix-exceptions.csv'), csv(plan.exceptions));
  fs.writeFileSync(path.join(OUT, 'unmatched-payments.csv'), csv(plan.unmatched));

  const s = plan.stats;
  console.log(`\nPayment report: ${s.reportPayments} payments, ${inr(s.reportTotalPaise)} (matches the files' footers)`);
  console.log(`Imported invoices matched: ${s.matchedInvoices} of ${invoices.length}`);
  console.log(`  rebuilt with real dates/modes: ${s.rebuilt}`);
  console.log(`  rebuilt + invoice updated (payment made after the old export): ${s.rebuiltAndUpdated}`);
  console.log(`  kept as they were: ${s.kept}`);
  console.log(`Legacy payments: ${invoices.reduce((n, i) => n + i.payments.length, 0)} now -> ${s.paymentsCreated} real payments replace those of the rebuilt invoices`);
  console.log(`  payments with date only (time unknown, set to 12:00 IST): ${s.dateOnlyPayments}`);
  console.log('\nRevenue by year (PAID payments)  BEFORE:');
  table(s.revenueBeforeByYear);
  console.log('AFTER:');
  table(s.revenueAfterByYear);
  console.log('\nNew payments by mode (all statuses):');
  table(s.byModePaise);
  console.log('\nSales rep match:', Object.fromEntries(repId));
  const ec: Record<string, number> = {};
  plan.exceptions.forEach((e) => (ec[e.type] = (ec[e.type] ?? 0) + 1));
  console.log('Exceptions:', ec);
  console.log(`\nNOT imported: ${s.unmatchedPayments} report payments (${inr(s.unmatchedTotalPaise)}) match no imported membership -> unmatched-payments.csv`);
  console.log(`Reports written to ${OUT}/`);

  if (!COMMIT) {
    console.log('\nDry run finished. Review, then re-run with --commit.');
    return;
  }

  // ------------------------------------------------------------- COMMIT
  await prisma.$transaction(
    async (tx) => {
      const delIds = plan.fixes.flatMap((f) => f.deletePaymentIds);
      for (const part of chunks(delIds, 1000)) await tx.payment.deleteMany({ where: { id: { in: part } } });

      const newPayments = plan.fixes.flatMap((f) => f.payments);
      for (const part of chunks(newPayments)) {
        await tx.payment.createMany({
          data: part.map((p) => ({
            id: p.id,
            receiptNumber: p.receiptNumber,
            invoiceId: p.invoiceId,
            memberId: p.memberId,
            amount: p.amount,
            paymentMode: p.paymentMode,
            paymentType: p.paymentType,
            status: p.status as Prisma.PaymentCreateManyInput['status'],
            notes: p.notes,
            paidAt: p.paidAt,
            createdAt: p.paidAt,
          })),
        });
      }

      for (const f of plan.fixes) {
        const rep = f.staff ? repId.get(f.staff) ?? null : null;
        await tx.invoice.update({
          where: { id: f.invoiceId },
          data: {
            createdAt: f.firstPaidAt,
            updatedAt: f.firstPaidAt,
            ...(f.staff ? { salesRepName: f.staff, ...(rep ? { salesRepId: rep } : {}) } : {}),
            ...(f.newPaid !== undefined
              ? { paidAmount: f.newPaid, balanceAmount: f.newBalance, status: f.newStatus as Prisma.InvoiceUpdateInput['status'] }
              : {}),
          },
        });
        await tx.subscription.update({
          where: { id: f.subscriptionId },
          data: { createdAt: f.firstPaidAt, updatedAt: f.firstPaidAt },
        });
      }

      for (const m of plan.memberCreatedAt) {
        await tx.member.update({ where: { id: m.memberId }, data: { createdAt: m.createdAt, updatedAt: m.createdAt } });
      }

      // ---- verify inside the transaction; any failure rolls everything back
      const inv = await tx.invoice.findMany({
        where: { invoiceNumber: { startsWith: 'LEGACY-' } },
        select: { id: true, paidAmount: true },
      });
      const sums = await tx.payment.groupBy({
        by: ['invoiceId'],
        where: { receiptNumber: { startsWith: 'LEGACY-RC-' } },
        _sum: { amount: true },
      });
      const sumBy = new Map(sums.map((x) => [x.invoiceId, x._sum.amount ?? 0]));
      const broken = inv.filter((i) => (sumBy.get(i.id) ?? 0) !== i.paidAmount);
      if (broken.length) throw new Error(`Verification failed: ${broken.length} invoices where payments != paidAmount`);

      const paid = await tx.payment.findMany({
        where: { receiptNumber: { startsWith: 'LEGACY-RC-' }, status: 'PAID' },
        select: { amount: true, paidAt: true },
      });
      const byYear: Record<string, number> = {};
      for (const p of paid) byYear[String(p.paidAt.getUTCFullYear())] = (byYear[String(p.paidAt.getUTCFullYear())] ?? 0) + p.amount;
      for (const [y, v] of Object.entries(s.revenueAfterByYear)) {
        if (byYear[y] !== v) throw new Error(`Verification failed: year ${y} is ${byYear[y]} in DB, expected ${v}`);
      }
      console.log('\nVerified inside transaction: every invoice\'s payments add up, yearly revenue equals the plan.');
    },
    { timeout: 10 * 60 * 1000, maxWait: 60 * 1000 },
  );

  console.log('\nCOMMITTED.');
}

main()
  .catch((e) => {
    console.error('\nFAILED (nothing was written):', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
