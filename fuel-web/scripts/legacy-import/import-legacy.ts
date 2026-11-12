/**
 * import-legacy.ts
 *
 *   npx tsx scripts/legacy-import/import-legacy.ts            -> DRY RUN (reads DB, writes NOTHING)
 *   npx tsx scripts/legacy-import/import-legacy.ts --commit   -> real import, ONE transaction
 *
 * Needs:  npm i -D tsx xlsx
 * Put the 6 Excel files in ./legacy-data/ (or pass --dir=/path).
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { buildPlan, ImportPlan, Row } from './legacy-transform';

// ------------------------------------------------------------------ CONFIG
const BRANCH_ID = 'cmsue7qvi0000onjeo7iwxyaa';
const BRANCH_NAME = 'Purasawalkam';
const MASTER_FILE = 'Members_till_04Nov2026_11_50AM.xlsx';
const YEARS = [2022, 2023, 2024, 2025, 2026];
/** Payments on CANCELLED memberships: 'VOIDED' = not counted as revenue, 'PAID' = counted */
const CANCELLED_PAYMENT_STATUS: 'VOIDED' | 'PAID' = 'VOIDED';
const PAYMENT_MODE = 'Legacy';
// ------------------------------------------------------------------------

const COMMIT = process.argv.includes('--commit');
const dirArg = process.argv.find((a) => a.startsWith('--dir='));
const DIR = dirArg ? dirArg.slice(6) : './legacy-data';
const OUT = './legacy-output';

const prisma = new PrismaClient();

function readSheet(file: string): Row[] {
  const wb = XLSX.readFile(path.join(DIR, file), { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: false, defval: '' });
}

const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const heads = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [heads.join(','), ...rows.map((r) => heads.map((h) => esc(r[h])).join(','))].join('\n');
};
const inr = (paise: number) => '₹' + (paise / 100).toLocaleString('en-IN');
const chunks = <T,>(a: T[], n = 500): T[][] =>
  Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

// ----------------------------------------------------------- catalog resolver
type Db = PrismaClient | Prisma.TransactionClient;

async function resolveCatalog(db: Db, plan: ImportPlan, commit: boolean) {
  const svc = new Map<string, string>();
  const sub = new Map<string, string>(); // "service|sub" -> id
  const pkg = new Map<string, string>(); // package key -> id
  const created = { services: [] as string[], subs: [] as string[], packages: [] as string[] };

  for (const name of plan.catalog.services) {
    let s = await db.service.findFirst({ where: { name } });
    if (!s) {
      created.services.push(name);
      s = commit
        ? await db.service.create({ data: { name, isActive: false, sortOrder: 90 } })
        : ({ id: `NEW:${name}` } as any);
    }
    svc.set(name, s!.id);
  }

  for (const sc of plan.catalog.subs) {
    const serviceId = svc.get(sc.service)!;
    let row = serviceId.startsWith('NEW:')
      ? null
      : await db.serviceSubCategory.findFirst({ where: { serviceId, name: sc.name } });
    if (!row) {
      created.subs.push(`${sc.service} / ${sc.name}`);
      row = commit
        ? await db.serviceSubCategory.create({ data: { serviceId, name: sc.name, isActive: false, sortOrder: 90 } })
        : ({ id: `NEW:${sc.service}|${sc.name}` } as any);
    }
    sub.set(`${sc.service}|${sc.name}`, row!.id);
  }

  for (const p of plan.catalog.packages) {
    const serviceId = svc.get(p.service)!;
    let row = serviceId.startsWith('NEW:')
      ? null
      : await db.servicePackage.findFirst({ where: { serviceId, name: p.name } });
    if (!row) {
      created.packages.push(`${p.service} / ${p.name}`);
      if (commit) {
        const subId = p.sub ? sub.get(`${p.service}|${p.sub}`) : undefined;
        row = await db.servicePackage.create({
          data: {
            serviceId,
            name: p.name,
            durationInDays: p.days,
            price: p.pricePaise,
            isActive: false, // legacy plans never show in sales / app
            usageType: 'DURATION_BASED',
            description: 'Legacy plan (imported from old software)',
            sortOrder: 90,
            ...(subId ? { subCategories: { create: { subCategoryId: subId } } } : {}),
          },
        });
      } else row = { id: `NEW:${p.key}` } as any;
    }
    pkg.set(p.key, row!.id);
  }
  return { svc, sub, pkg, created };
}

// ----------------------------------------------------------------------- main
async function main() {
  console.log(COMMIT ? '=== COMMIT MODE ===' : '=== DRY RUN (nothing will be written) ===');

  const branch = await prisma.branch.findUnique({ where: { id: BRANCH_ID } });
  if (!branch || branch.name !== BRANCH_NAME) throw new Error('Branch id/name does not match the DB');

  const alreadyLegacy = await prisma.member.count({ where: { legacyId: { not: null } } });
  const legacyInvoices = await prisma.invoice.count({ where: { invoiceNumber: { startsWith: 'LEGACY-' } } });
  if (alreadyLegacy > 0 || legacyInvoices > 0) {
    const msg = `Legacy data already present (members with legacyId: ${alreadyLegacy}, LEGACY invoices: ${legacyInvoices}).`;
    if (COMMIT) throw new Error(msg + ' Refusing to import twice.');
    console.warn('WARNING: ' + msg);
  }

  const existingMembers = (await prisma.member.findMany({ select: { id: true, phone: true, name: true } }));
  const istNow = new Date(Date.now() + 5.5 * 3600 * 1000);
  const today = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));

  const plan = buildPlan(
    readSheet(MASTER_FILE),
    YEARS.map((year) => ({ year, rows: readSheet(`Memberships_${year}.xlsx`) })),
    {
      branchId: BRANCH_ID,
      branchName: BRANCH_NAME,
      today,
      existingMembers,
      cancelledPaymentStatus: CANCELLED_PAYMENT_STATUS,
      paymentMode: PAYMENT_MODE,
    },
  );

  // safety: no clash with live data
  const liveEmails = new Set((await prisma.member.findMany({ select: { email: true } })).map((m) => m.email));
  const livePhones = new Set(existingMembers.map((m) => m.phone));
  const clashes = plan.members.filter((m) => liveEmails.has(m.email) || livePhones.has(m.phone));
  if (clashes.length) throw new Error(`Phone/email clash with live members: ${clashes.map((c) => c.legacyId).join(', ')}`);

  // catalog (read-only in dry run)
  const cat = await resolveCatalog(prisma, plan, false);

  // ---- reports
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'exceptions.csv'), csv(plan.exceptions as any));
  fs.writeFileSync(
    path.join(OUT, 'subscriptions-preview.csv'),
    csv(
      plan.subs.map((s) => ({
        legacyId: s.legacyId, member: s.memberName, plan: s.rawPlan, service: s.serviceName,
        subCategory: s.subName ?? '', start: s.startDate.toISOString().slice(0, 10),
        end: s.endDate.toISOString().slice(0, 10), status: s.status, intent: s.intent,
        final: s.finalAmount / 100, paid: s.paidAmount / 100, balance: s.balanceAmount / 100,
        invoice: s.invoiceNumber, invoiceStatus: s.invoiceStatus, paymentStatus: s.paymentStatus ?? '',
      })),
    ),
  );

  const counts: Record<string, number> = {};
  plan.exceptions.forEach((e) => (counts[e.type] = (counts[e.type] ?? 0) + 1));
  console.log('\nMembers: %d in file -> %d new, %d merged into live members', plan.stats.membersTotal, plan.stats.membersNew, plan.stats.membersMerged);
  console.log('Subscriptions / invoices:', plan.stats.subs, ' payments:', plan.subs.filter((s) => s.paymentStatus).length);
  console.log('Will create -> services:', cat.created.services, '\n  sub-categories:', cat.created.subs, '\n  packages:', cat.created.packages.length);
  console.log('\nExceptions by type:', counts);
  console.log('\nRevenue to be imported (PAID payments, by year of start date):');
  for (const [y, v] of Object.entries(plan.stats.revenueByYearPaise)) console.log('  ', y, inr(v));
  console.log('By service:');
  for (const [k, v] of Object.entries(plan.stats.revenueByServicePaise)) console.log('  ', k.padEnd(22), inr(v));
  console.log(`Voided/cancelled payments: ${inr(plan.stats.voidedPaise)}  | Refunded: ${inr(plan.stats.refundedPaise)}  | Outstanding balance: ${inr(plan.stats.outstandingBalancePaise)}`);
  console.log(`\nReports written to ${OUT}/ (exceptions.csv, subscriptions-preview.csv)`);

  if (!COMMIT) {
    console.log('\nDry run finished. Review the CSVs, then re-run with --commit.');
    return;
  }

  // ------------------------------------------------------------- COMMIT
  await prisma.$transaction(
    async (tx) => {
      const c = await resolveCatalog(tx, plan, true);

      for (const u of plan.memberUpdates) {
        await tx.member.update({ where: { id: u.id }, data: { legacyId: u.legacyId, legacyPhone: u.legacyPhone } });
      }
      for (const part of chunks(plan.members)) {
        await tx.member.createMany({ data: part as Prisma.MemberCreateManyInput[] });
      }

      const subCatId = (s: (typeof plan.subs)[number]) => (s.subName ? c.sub.get(`${s.serviceName}|${s.subName}`) ?? null : null);

      const invoices: Prisma.InvoiceCreateManyInput[] = plan.subs.map((s) => ({
        id: s.invoiceId,
        invoiceNumber: s.invoiceNumber,
        memberId: s.memberId,
        branchId: BRANCH_ID,
        packageId: c.pkg.get(s.packageKey)!,
        subCategoryId: subCatId(s),
        intent: s.intent,
        serviceName: s.serviceName,
        packageName: s.rawPlan,
        packageDurationInDays: s.durationDays,
        branchName: BRANCH_NAME,
        memberName: s.memberName,
        memberPhone: s.memberPhone,
        memberEmail: s.memberEmail,
        packageAmount: s.packageAmount,
        discountAmount: s.discountAmount,
        finalAmount: s.finalAmount,
        paidAmount: s.paidAmount,
        balanceAmount: s.balanceAmount,
        referralDiscountAmount: 0,
        status: s.invoiceStatus,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.createdAt,
      }));
      for (const part of chunks(invoices)) await tx.invoice.createMany({ data: part });

      const subscriptions: Prisma.SubscriptionCreateManyInput[] = plan.subs.map((s) => ({
        id: s.subscriptionId,
        memberId: s.memberId,
        branchId: BRANCH_ID,
        packageId: c.pkg.get(s.packageKey)!,
        invoiceId: s.invoiceId,
        subCategoryId: subCatId(s),
        serviceName: s.serviceName,
        packageName: s.rawPlan,
        packageDurationInDays: s.durationDays,
        originalPrice: s.packageAmount,
        finalPrice: s.finalAmount,
        branchName: BRANCH_NAME,
        usageType: 'DURATION_BASED',
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.createdAt,
      }));
      for (const part of chunks(subscriptions)) await tx.subscription.createMany({ data: part });

      const payments: Prisma.PaymentCreateManyInput[] = plan.subs
        .filter((s) => s.paymentStatus)
        .map((s) => ({
          id: s.paymentId,
          receiptNumber: s.receiptNumber,
          invoiceId: s.invoiceId,
          memberId: s.memberId,
          amount: s.paidAmount,
          paymentMode: PAYMENT_MODE,
          paymentType: 'INITIAL',
          status: s.paymentStatus!,
          notes: 'Legacy import',
          paidAt: s.createdAt,
          createdAt: s.createdAt,
        }));
      for (const part of chunks(payments)) await tx.payment.createMany({ data: part });

      // verify inside the transaction: any mismatch rolls everything back
      const [m, i, s, p] = await Promise.all([
        tx.member.count({ where: { legacyId: { not: null } } }),
        tx.invoice.count({ where: { invoiceNumber: { startsWith: 'LEGACY-' } } }),
        tx.subscription.count({ where: { invoice: { invoiceNumber: { startsWith: 'LEGACY-' } } } }),
        tx.payment.count({ where: { receiptNumber: { startsWith: 'LEGACY-RC-' } } }),
      ]);
      const expectMembers = plan.members.length + plan.memberUpdates.length;
      if (m !== expectMembers || i !== plan.subs.length || s !== plan.subs.length || p !== payments.length) {
        throw new Error(`Verification failed: members ${m}/${expectMembers}, invoices ${i}/${plan.subs.length}, subs ${s}/${plan.subs.length}, payments ${p}/${payments.length}`);
      }
      console.log(`\nVerified inside transaction: ${m} members, ${i} invoices, ${s} subscriptions, ${p} payments.`);
      console.log('Created ->', c.created);
    },
    { timeout: 10 * 60 * 1000, maxWait: 60 * 1000 },
  );

  console.log('\nCOMMITTED. Now run the reconciliation SQL and compare with the revenue printed above.');
}

main()
  .catch((e) => {
    console.error('\nFAILED (nothing was written):', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
