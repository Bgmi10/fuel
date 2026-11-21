/**
 * import-expenses.ts
 *
 *   npx tsx scripts/legacy-import/import-expenses.ts            -> DRY RUN (nothing written)
 *   npx tsx scripts/legacy-import/import-expenses.ts --commit   -> real import (one transaction)
 *
 * Every imported row gets id "legacy-exp-0001", "legacy-exp-0002", ...
 * so it can be found, re-run safely, or removed:
 *   DELETE FROM "Expense" WHERE id LIKE 'legacy-exp-%';
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

// ------------------------------------------------------------------ CONFIG
const FILE = './legacy-data/Expenses.xlsx';
/** id of the User these expenses are recorded under (see the SQL in the chat) */
const BY_USER_ID = 'cmsfuojy80001c8sots2p7nry';
/** 1 if Expense.amount is stored in rupees, 100 if in paise */
const AMOUNT_MULTIPLIER = 1;
const EXPENSE_TYPE = 'OTHER' as const;
// ------------------------------------------------------------------------

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

function parseDate(v: string): Date | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(v);
  if (!m || MONTHS[m[2].toUpperCase()] === undefined) return null;
  // 12:00 noon IST (= 06:30 UTC): the day never shifts, whichever timezone a report uses
  return new Date(Date.UTC(Number(m[3]), MONTHS[m[2].toUpperCase()], Number(m[1]), 6, 30, 0));
}

async function main() {
  console.log(COMMIT ? '=== COMMIT MODE ===' : '=== DRY RUN (nothing will be written) ===');
  if (BY_USER_ID.startsWith('PASTE')) throw new Error('Set BY_USER_ID at the top of the script first');

  const user = await prisma.user.findUnique({ where: { id: BY_USER_ID } });
  if (!user) throw new Error('BY_USER_ID not found in User table');
  console.log(`Expenses will be recorded under: ${user.name} (${user.role})`);

  const existing = await prisma.expense.count({ where: { id: { startsWith: 'legacy-exp-' } } });
  if (existing > 0) {
    if (COMMIT) throw new Error(`${existing} legacy expenses already exist. Refusing to import twice.`);
    console.warn(`WARNING: ${existing} legacy expenses already exist.`);
  }
  const live = await prisma.expense.count();
  console.log(`Expenses already in DB: ${live}`);

  // ---- read
  const ws = XLSX.readFile(FILE).Sheets[XLSX.readFile(FILE).SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' });
  const hi = rows.findIndex((r) => str(r[0]).toUpperCase() === 'DESCRIPTION');
  if (hi < 0) throw new Error('Header row (DESCRIPTION) not found');

  const data: Prisma.ExpenseCreateManyInput[] = [];
  const skipped: string[] = [];
  let footerCount: number | null = null;
  let footerTotal: number | null = null;

  for (let i = hi + 1; i < rows.length; i++) {
    const [d0, d1, d2] = [str(rows[i][0]), str(rows[i][1]), str(rows[i][2])];
    if (!d0 && !d1 && !d2) continue;
    if (/^number of records/i.test(d0)) {
      footerCount = Number(/(\d+)/.exec(d0)?.[1]);
      footerTotal = Number(d2.replace(/[^\d]/g, ''));
      continue;
    }
    const date = parseDate(d1);
    const amt = Number(d2.replace(/,/g, ''));
    if (!d0 || !date || !Number.isInteger(amt) || amt <= 0) {
      skipped.push(`row ${i + 1}: "${d0}" | "${d1}" | "${d2}"`);
      continue;
    }
    data.push({
      id: `legacy-exp-${String(data.length + 1).padStart(4, '0')}`,
      description: d0.replace(/\s+/g, ' '),
      expenseType: EXPENSE_TYPE,
      date,
      byUserId: BY_USER_ID,
      amount: amt * AMOUNT_MULTIPLIER,
      createdAt: date,
      updatedAt: date,
    });
  }

  const total = data.reduce((s, r) => s + (r.amount as number), 0) / AMOUNT_MULTIPLIER;
  const byYear: Record<string, { n: number; sum: number }> = {};
  for (const r of data) {
    const y = String((r.date as Date).getUTCFullYear());
    byYear[y] = { n: (byYear[y]?.n ?? 0) + 1, sum: (byYear[y]?.sum ?? 0) + (r.amount as number) / AMOUNT_MULTIPLIER };
  }

  console.log(`\nParsed ${data.length} expenses, total ${inr(total)}  (type=${EXPENSE_TYPE}, multiplier=${AMOUNT_MULTIPLIER})`);
  console.log(`File footer says: ${footerCount} records, total ${footerTotal !== null ? inr(footerTotal) : 'n/a'}`);
  for (const [y, v] of Object.entries(byYear)) console.log(`  ${y}: ${v.n} rows  ${inr(v.sum)}`);
  if (skipped.length) console.log('\nSKIPPED rows:\n' + skipped.join('\n'));

  const ok = skipped.length === 0 && data.length === footerCount && total === footerTotal;
  console.log(ok ? '\nCHECK PASSED: count and total match the file footer.' : '\nCHECK FAILED: count/total do not match the footer or rows were skipped.');
  if (!COMMIT) {
    console.log('Dry run finished. If this looks right, re-run with --commit.');
    return;
  }
  if (!ok) throw new Error('Refusing to commit while the check fails');

  await prisma.$transaction(
    async (tx) => {
      await tx.expense.createMany({ data });
      const agg = await tx.expense.aggregate({
        where: { id: { startsWith: 'legacy-exp-' } },
        _count: true,
        _sum: { amount: true },
      });
      if (agg._count !== data.length || agg._sum.amount !== total * AMOUNT_MULTIPLIER) {
        throw new Error(`Verification failed: ${agg._count} rows / ${agg._sum.amount} in DB`);
      }
      console.log(`\nVerified inside transaction: ${agg._count} expenses, sum ${agg._sum.amount}`);
    },
    { timeout: 120000 },
  );
  console.log('COMMITTED.');
}

main()
  .catch((e) => {
    console.error('\nFAILED (nothing was written):', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());