/**
 * legacy-transform.ts
 * Pure logic (no DB, no Excel library): turns the rows of the old software's
 * Excel exports into a validated import plan + an exceptions list.
 *
 * Money in the new DB is stored in PAISE, old Excel is RUPEES -> x100.
 * All dates/timestamps are UTC, matching how the app stores them today
 * (subscription start/end = UTC midnight, created/paid = 12:00 noon IST).
 */
import { randomBytes } from 'node:crypto';

export type Cell = string | number | boolean | null | undefined;
export type Row = Cell[];

export interface ExistingMember {
  id: string;
  phone: string;
  name: string;
}

export interface PlanOptions {
  branchId: string;
  branchName: string;
  /** UTC midnight of today's date in IST */
  today: Date;
  existingMembers: ExistingMember[];
  /** What to do with payments on CANCELLED subscriptions */
  cancelledPaymentStatus: 'VOIDED' | 'PAID';
  paymentMode: string;
}

export interface ExceptionRow {
  type: string;
  legacyId: string;
  name: string;
  detail: string;
}

// ---------------------------------------------------------------- catalog map
const GYM = 'Functional Training';
const YOGA = 'Yoga';

interface PlanDef {
  service: string;
  sub: string | null;
  days: number;
  /** true = real duration varies per row, so use end-start+1 for the snapshot */
  flexible?: boolean;
}

const d = (service: string, sub: string | null, days: number, flexible = false): PlanDef => ({
  service,
  sub,
  days,
  flexible,
});

// keys are normalised (see norm())
const PLAN_DEFS: Record<string, PlanDef> = {
  // Gym  (service "Functional Training", sub-category "Gym")
  '1 MONTH GYM': d(GYM, 'Gym', 30),
  '3 MONTHS GYM': d(GYM, 'Gym', 90),
  '6 MONTHS GYM': d(GYM, 'Gym', 180),
  '12 MONTHS GYM': d(GYM, 'Gym', 365),
  '2 MONTHS MEMBERSHIP': d(GYM, 'Gym', 60),
  '12+2 GYM NEW YEAR OFFER 2025': d(GYM, 'Gym', 425),
  '6+1 GYM NEW YEAR OFFER 2025': d(GYM, 'Gym', 212),
  '1 MONTH FUEL COMBO': d(GYM, 'Gym', 30),
  'FUEL FLEX TRANSFER': d(GYM, 'Gym', 365, true),
  'FREE MEMBERSHIP (100DAYS)': d(GYM, 'Gym', 100),
  'TRIAL PACK (GYM)': d(GYM, 'Gym', 15),
  'TRIAL PACK (7 DAYS)': d(GYM, 'Gym', 7),
  // Older "FITNESS" gym plans (separate prices)
  'FITNESS 1M': d(GYM, 'Fitness (legacy)', 30),
  'FITNESS 2M': d(GYM, 'Fitness (legacy)', 60),
  'FITNESS 3M': d(GYM, 'Fitness (legacy)', 90),
  'FITNESS 6M': d(GYM, 'Fitness (legacy)', 180),
  'FITNESS 12M': d(GYM, 'Fitness (legacy)', 365),
  // Yoga
  'YOGA FOR ALL - 1M': d(YOGA, null, 30),
  'YOGA FOR ALL - 3M': d(YOGA, null, 90),
  'YOGA FOR ALL - 6M': d(YOGA, null, 180),
  'TRIAL PACK (YOGA)': d(YOGA, null, 15),
  '1 MONTH YOGA OFFLINE - 3 DAYS': d(YOGA, 'Yoga Offline (3D/Week)', 30),
  '3 MONTHS YOGA OFFLINE - 3 DAYS': d(YOGA, 'Yoga Offline (3D/Week)', 90),
  '6 MONTHS YOGA OFFLINE - 3 DAYS': d(YOGA, 'Yoga Offline (3D/Week)', 180),
  '1 MONTH YOGA OFFLINE - 5 DAYS': d(YOGA, 'Yoga Offline', 30),
  '3 MONTHS YOGA OFFLINE - 5 DAYS': d(YOGA, 'Yoga Offline', 90),
  '6 MONTHS YOGA OFFLINE - 5 DAYS': d(YOGA, 'Yoga Offline', 180),
  '12 MONTHS YOGA OFFLINE - 5 DAYS': d(YOGA, 'Yoga Offline', 365),
  '1 MONTH YOGA ONLINE - 3 DAYS': d(YOGA, 'Yoga Online (3D/Week)', 30),
  '3 MONTHS YOGA ONLINE - 3 DAYS': d(YOGA, 'Yoga Online (3D/Week)', 90),
  '1 MONTH YOGA ONLINE - 5 DAYS': d(YOGA, 'Yoga Online', 30),
  '3 MONTHS YOGA ONLINE - 5 DAYS': d(YOGA, 'Yoga Online', 90),
  // Others
  ZUMBA: d('Zumba', null, 30),
  'HYROX MASTERCLASS': d('Hyrox', null, 1),
  'PERSONAL TRAINING': d('Personal Training', null, 30, true),
  '1 MONTH GYM PERSONAL TRAINING': d('Personal Training', null, 30),
  '1 DAY EVENT': d('Events', null, 1),
};

const norm = (s: string) =>
  s.toUpperCase().replace(/\s+/g, ' ').replace(/\s*-\s*/g, ' - ').trim();

// ------------------------------------------------------------------- helpers
const str = (v: Cell): string => (v === null || v === undefined ? '' : String(v).trim());
const cleanName = (s: string) => s.replace(/\s+/g, ' ').trim();
const rupees = (v: string): number => {
  const n = Number(v.replace(/,/g, '').trim());
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

interface YMD { y: number; m: number; d: number }

export function parseDate(v: string): YMD | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(v.trim());
  if (!m) return null;
  const mon = MONTHS[m[2].toUpperCase()];
  if (mon === undefined) return null;
  return { y: Number(m[3]), m: mon, d: Number(m[1]) };
}

const utc = (x: YMD, h = 0, mi = 0) => new Date(Date.UTC(x.y, x.m, x.d, h, mi, 0));
/** 12:00 noon IST == 06:30 UTC */
const noonIST = (x: YMD) => utc(x, 6, 30);
const iso = (x: YMD) =>
  `${x.y}-${String(x.m + 1).padStart(2, '0')}-${String(x.d).padStart(2, '0')}`;

export function genId(): string {
  return 'c' + Date.now().toString(36) + randomBytes(9).toString('hex');
}

type Rec = Record<string, string>;

function readTable(rows: Row[]): Rec[] {
  const hi = rows.findIndex((r) => str(r[0]).toUpperCase() === 'MEMBER ID');
  if (hi < 0) throw new Error('Header row ("MEMBER ID") not found');
  const heads = rows[hi].map((h) => str(h).toUpperCase());
  const out: Rec[] = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const rec: Rec = {};
    heads.forEach((h, j) => {
      rec[h] = str(rows[i][j]);
    });
    if (!/^\d+$/.test(rec['MEMBER ID'])) continue; // footer / blank rows
    rec.__row = String(i + 1);
    out.push(rec);
  }
  return out;
}

interface PhoneInfo {
  phone: string | null;
  kind: 'ok' | 'intl' | 'missing' | 'bad';
  raw: string;
}

function cleanPhone(raw: string): PhoneInfo {
  const s = raw.trim();
  if (!s) return { phone: null, kind: 'missing', raw: s };
  const digits = s.replace(/\D/g, '');
  if (s.startsWith('+')) {
    return digits.length >= 10 && digits.length <= 15
      ? { phone: '+' + digits, kind: 'intl', raw: s }
      : { phone: null, kind: 'bad', raw: s };
  }
  let x = digits;
  if (x.length === 12 && x.startsWith('91')) x = x.slice(2);
  if (x.length === 11 && x.startsWith('0')) x = x.slice(1);
  return /^[6-9]\d{9}$/.test(x)
    ? { phone: x, kind: 'ok', raw: s }
    : { phone: null, kind: 'bad', raw: s };
}

// -------------------------------------------------------------- plan types
export interface MemberRow {
  id: string;
  legacyId: string;
  legacyPhone: string | null;
  name: string;
  phone: string;
  email: string;
  gender: string | null;
  dob: string | null;
  age: number | null;
  address: string | null;
  branchId: string;
  onBoardCompleted: false;
  status: 'ACTIVE';
  onBoardingForm?: { legacy: { group: string } };
  createdAt: Date;
  updatedAt: Date;
}

export interface SubRow {
  year: number;
  seq: number;
  legacyId: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  memberEmail: string;
  rawPlan: string;
  packageKey: string;
  serviceName: string;
  subName: string | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  durationDays: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  intent: 'NEW' | 'EXTEND';
  packageAmount: number; // paise
  discountAmount: number;
  finalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  invoiceStatus: 'PENDING' | 'PARTIAL_PAID' | 'FULLY_PAID' | 'CANCELLED';
  paymentStatus: 'PAID' | 'VOIDED' | 'REFUNDED' | null;
  invoiceNumber: string;
  receiptNumber: string;
  invoiceId: string;
  subscriptionId: string;
  paymentId: string;
  notes: string;
}

export interface CatalogPackage {
  key: string;
  service: string;
  sub: string | null;
  name: string;
  days: number;
  pricePaise: number;
}

export interface ImportPlan {
  members: MemberRow[];
  /** existing live members that get legacyId attached instead of being re-created */
  memberUpdates: { id: string; legacyId: string; legacyPhone: string | null }[];
  subs: SubRow[];
  catalog: {
    services: string[];
    subs: { service: string; name: string }[];
    packages: CatalogPackage[];
  };
  exceptions: ExceptionRow[];
  stats: {
    membersTotal: number;
    membersNew: number;
    membersMerged: number;
    subs: number;
    revenueByYearPaise: Record<string, number>;
    revenueByServicePaise: Record<string, number>;
    voidedPaise: number;
    refundedPaise: number;
    outstandingBalancePaise: number;
  };
}

// --------------------------------------------------------------- the planner
export function buildPlan(
  masterRows: Row[],
  files: { year: number; rows: Row[] }[],
  opt: PlanOptions,
): ImportPlan {
  const exceptions: ExceptionRow[] = [];
  const ex = (type: string, legacyId: string, name: string, detail: string) =>
    exceptions.push({ type, legacyId, name, detail });

  // ---- read
  const masters = readTable(masterRows);
  const ids = new Set<string>();
  for (const m of masters) {
    if (ids.has(m['MEMBER ID'])) throw new Error(`Duplicate member id ${m['MEMBER ID']} in members file`);
    ids.add(m['MEMBER ID']);
  }

  interface RawSub { year: number; seq: number; rec: Rec }
  const rawSubs: RawSub[] = [];
  for (const f of files) {
    readTable(f.rows).forEach((rec, i) => rawSubs.push({ year: f.year, seq: i + 1, rec }));
  }

  // ---- per member aggregates from subscriptions (used for phone keeper + createdAt)
  const maxEnd = new Map<string, number>();
  const firstStart = new Map<string, YMD>();
  for (const s of rawSubs) {
    const sd = parseDate(s.rec['START DATE']);
    const ed = parseDate(s.rec['END DATE']);
    const id = s.rec['MEMBER ID'];
    if (ed) maxEnd.set(id, Math.max(maxEnd.get(id) ?? 0, utc(ed).getTime()));
    if (sd) {
      const cur = firstStart.get(id);
      if (!cur || utc(sd).getTime() < utc(cur).getTime()) firstStart.set(id, sd);
    }
  }

  // ---- phones
  const info = new Map<string, PhoneInfo>();
  const byPhone = new Map<string, string[]>();
  for (const m of masters) {
    const id = m['MEMBER ID'];
    const p = cleanPhone(m['CONTACT']);
    info.set(id, p);
    if (p.phone) byPhone.set(p.phone, [...(byPhone.get(p.phone) ?? []), id]);
  }

  // match live members: same phone AND same first name => same person (merge)
  const firstWord = (s: string) => cleanName(s).split(' ')[0].toLowerCase();
  const existingByPhone = new Map(opt.existingMembers.map((e) => [e.phone, e]));
  const merged = new Map<string, ExistingMember>(); // legacyId -> existing member
  const phoneTakenByDb = new Set<string>();
  for (const [phone, memberIds] of byPhone) {
    const e = existingByPhone.get(phone);
    if (!e) continue;
    phoneTakenByDb.add(phone);
    const same = memberIds.filter(
      (id) => firstWord(masters.find((m) => m['MEMBER ID'] === id)!['MEMBER NAME']) === firstWord(e.name),
    );
    if (same.length === 1) merged.set(same[0], e);
  }

  const finalPhone = new Map<string, string>();
  for (const m of masters) {
    const id = m['MEMBER ID'];
    const nm = cleanName(m['MEMBER NAME']);
    const p = info.get(id)!;
    const placeholder = id.padStart(10, '0');
    if (merged.has(id)) {
      finalPhone.set(id, merged.get(id)!.phone);
      ex('MERGED_INTO_EXISTING', id, nm, `Attached to live member "${merged.get(id)!.name}" (${merged.get(id)!.phone})`);
      continue;
    }
    if (!p.phone) {
      finalPhone.set(id, placeholder);
      ex(p.kind === 'missing' ? 'NO_PHONE' : 'BAD_PHONE', id, nm, `raw="${p.raw}" -> placeholder ${placeholder}`);
      continue;
    }
    const group = byPhone.get(p.phone)!.filter((x) => !merged.has(x));
    if (phoneTakenByDb.has(p.phone)) {
      finalPhone.set(id, placeholder);
      ex('PHONE_EXISTS_IN_DB', id, nm, `${p.phone} belongs to a different live member -> placeholder ${placeholder}`);
      continue;
    }
    if (group.length > 1) {
      // keeper = latest membership end date, tie -> higher (newer) legacy id
      const keeper = [...group].sort(
        (a, b) => (maxEnd.get(b) ?? 0) - (maxEnd.get(a) ?? 0) || Number(b) - Number(a),
      )[0];
      if (keeper === id) {
        finalPhone.set(id, p.phone);
        ex('SHARED_PHONE_KEEPER', id, nm, `${p.phone} shared with legacy ids ${group.filter((x) => x !== id).join(', ')}`);
      } else {
        finalPhone.set(id, placeholder);
        ex('SHARED_PHONE', id, nm, `${p.phone} kept by legacy id ${keeper} -> placeholder ${placeholder}`);
      }
      continue;
    }
    finalPhone.set(id, p.phone);
  }

  // ---- members
  const sortedIds = masters.map((m) => m['MEMBER ID']).sort((a, b) => Number(a) - Number(b));
  const created = new Map<string, Date>();
  for (const id of sortedIds) {
    const fs = firstStart.get(id);
    if (fs) created.set(id, noonIST(fs));
  }
  // members with no memberships: borrow the nearest lower id (else higher id) date
  let last: Date | null = null;
  for (const id of sortedIds) {
    if (created.has(id)) last = created.get(id)!;
    else if (last) created.set(id, last);
  }
  let next: Date | null = null;
  for (const id of [...sortedIds].reverse()) {
    if (created.has(id)) next = created.get(id)!;
    else if (next) created.set(id, next);
  }

  const members: MemberRow[] = [];
  const memberUpdates: ImportPlan['memberUpdates'] = [];
  const memberDbId = new Map<string, string>();
  const memberEmail = new Map<string, string>();
  const memberName = new Map<string, string>();

  for (const m of masters) {
    const id = m['MEMBER ID'];
    const nm = cleanName(m['MEMBER NAME']);
    memberName.set(id, nm);
    const p = info.get(id)!;
    const legacyPhone = p.phone ?? (p.raw || null);
    if (merged.has(id)) {
      const e = merged.get(id)!;
      memberDbId.set(id, e.id);
      memberEmail.set(id, '');
      memberUpdates.push({ id: e.id, legacyId: id, legacyPhone });
      continue;
    }
    const email = `legacy${id}@example.com`;
    memberEmail.set(id, email);
    const g = m['GENDER'].toUpperCase();
    const gender = g === 'M' ? 'Male' : g === 'F' ? 'Female' : null;
    let dob: string | null = null;
    let age: number | null = null;
    if (m['DATE OF BIRTH']) {
      const pd = parseDate(m['DATE OF BIRTH']);
      if (pd && pd.y >= 1920 && utc(pd).getTime() < opt.today.getTime()) {
        dob = iso(pd);
        const t = opt.today;
        age = t.getUTCFullYear() - pd.y - (t.getUTCMonth() < pd.m || (t.getUTCMonth() === pd.m && t.getUTCDate() < pd.d) ? 1 : 0);
      } else {
        ex('BAD_DOB', id, nm, `"${m['DATE OF BIRTH']}" ignored`);
      }
    }
    const when = created.get(id) ?? new Date(opt.today);
    const row: MemberRow = {
      id: genId(),
      legacyId: id,
      legacyPhone,
      name: nm,
      phone: finalPhone.get(id)!,
      email,
      gender,
      dob,
      age,
      address: m['ADDRESS'] || null,
      branchId: opt.branchId,
      onBoardCompleted: false,
      status: 'ACTIVE',
      createdAt: when,
      updatedAt: when,
    };
    if (m['GROUP']) row.onBoardingForm = { legacy: { group: m['GROUP'] } };
    memberDbId.set(id, row.id);
    members.push(row);
  }

  // ---- catalog
  const priceVotes = new Map<string, Map<number, number>>();
  const nameVotes = new Map<string, Map<string, number>>();
  const used = new Set<string>();
  for (const s of rawSubs) {
    const raw = cleanName(s.rec['MEMBERSHIP']);
    const key = norm(raw);
    used.add(key);
    const pv = priceVotes.get(key) ?? new Map<number, number>();
    const a = rupees(s.rec['ACTUAL AMT']);
    if (a > 0) pv.set(a, (pv.get(a) ?? 0) + 1);
    priceVotes.set(key, pv);
    const nv = nameVotes.get(key) ?? new Map<string, number>();
    nv.set(raw, (nv.get(raw) ?? 0) + 1);
    nameVotes.set(key, nv);
  }
  const top = <T,>(m: Map<T, number> | undefined): T | undefined =>
    m && m.size ? [...m.entries()].sort((a, b) => b[1] - a[1])[0][0] : undefined;

  const unmapped = [...used].filter((k) => !PLAN_DEFS[k]);
  if (unmapped.length) {
    throw new Error(`Unmapped membership names (add to PLAN_DEFS): ${unmapped.join(' | ')}`);
  }
  const packages: CatalogPackage[] = [...used].sort().map((key) => ({
    key,
    service: PLAN_DEFS[key].service,
    sub: PLAN_DEFS[key].sub,
    name: top(nameVotes.get(key))!,
    days: PLAN_DEFS[key].days,
    pricePaise: (top(priceVotes.get(key)) ?? 0) * 100,
  }));
  const services = [...new Set(packages.map((p) => p.service))];
  const subCats: { service: string; name: string }[] = [];
  for (const p of packages) {
    if (p.sub && !subCats.some((x) => x.service === p.service && x.name === p.sub)) {
      subCats.push({ service: p.service, name: p.sub });
    }
  }

  // ---- subscriptions / invoices / payments
  const subs: SubRow[] = [];
  for (const s of rawSubs) {
    const r = s.rec;
    const lid = r['MEMBER ID'];
    const nm = memberName.get(lid) ?? cleanName(r['MEMBER NAME']);
    if (!memberDbId.has(lid)) {
      ex('MEMBER_NOT_IN_MASTER', lid, nm, `${s.year} file row ${r.__row} skipped`);
      continue;
    }
    const sd = parseDate(r['START DATE']);
    const ed = parseDate(r['END DATE']);
    if (!sd || !ed || utc(ed).getTime() < utc(sd).getTime()) {
      ex('BAD_DATE', lid, nm, `${s.year} file row ${r.__row}: start="${r['START DATE']}" end="${r['END DATE']}" skipped`);
      continue;
    }
    const raw = cleanName(r['MEMBERSHIP']);
    const key = norm(raw);
    const def = PLAN_DEFS[key];
    const actual = rupees(r['ACTUAL AMT']);
    const disc = rupees(r['DISCOUNTED AMT']);
    const paid = rupees(r['PAID AMP'] || r['PAID AMT']);
    const bal = rupees(r['BALANCE']);

    // money: what was actually paid + what is still owed is the truth
    const fin = paid > 0 || bal > 0 ? paid + bal : disc;
    if (fin !== disc) {
      ex('AMOUNT_ADJUSTED', lid, nm, `${s.year} ${raw}: discounted=${disc} paid=${paid} balance=${bal} -> final=${fin}`);
    }
    const pkgAmt = Math.max(actual, fin);

    const rawStatus = r['STATUS'].toUpperCase();
    let status: SubRow['status'];
    if (rawStatus === 'CANCELLED' || rawStatus === 'REFUNDED') status = 'CANCELLED';
    else if (rawStatus === 'ACTIVE') {
      status = utc(ed).getTime() >= opt.today.getTime() ? 'ACTIVE' : 'EXPIRED';
      if (status === 'EXPIRED') ex('ACTIVE_BUT_ENDED', lid, nm, `${raw} ended ${iso(ed)} -> EXPIRED`);
    } else status = 'EXPIRED';

    let invoiceStatus: SubRow['invoiceStatus'];
    let balance = bal;
    if (status === 'CANCELLED') {
      invoiceStatus = 'CANCELLED';
      balance = 0;
    } else if (balance > 0) invoiceStatus = paid > 0 ? 'PARTIAL_PAID' : 'PENDING';
    else invoiceStatus = fin === 0 || paid > 0 ? 'FULLY_PAID' : 'PENDING';

    let paymentStatus: SubRow['paymentStatus'] = null;
    if (paid > 0) {
      paymentStatus =
        rawStatus === 'REFUNDED' ? 'REFUNDED' : status === 'CANCELLED' ? opt.cancelledPaymentStatus : 'PAID';
      if (status === 'CANCELLED') {
        ex('CANCELLED_WITH_PAYMENT', lid, nm, `${s.year} ${raw}: paid ${paid} on ${rawStatus} membership -> payment ${paymentStatus}`);
      }
    }

    const days = def.flexible ? Math.round((utc(ed).getTime() - utc(sd).getTime()) / 86400000) + 1 : def.days;
    const seq4 = String(s.seq).padStart(4, '0');
    subs.push({
      year: s.year,
      seq: s.seq,
      legacyId: lid,
      memberId: memberDbId.get(lid)!,
      memberName: nm,
      memberPhone: finalPhone.get(lid)!,
      memberEmail: memberEmail.get(lid) || `legacy${lid}@example.com`,
      rawPlan: raw,
      packageKey: key,
      serviceName: def.service,
      subName: def.sub,
      startDate: utc(sd),
      endDate: utc(ed),
      createdAt: noonIST(sd),
      durationDays: days,
      status,
      intent: 'NEW',
      packageAmount: pkgAmt * 100,
      discountAmount: (pkgAmt - fin) * 100,
      finalAmount: fin * 100,
      paidAmount: paid * 100,
      balanceAmount: balance * 100,
      invoiceStatus,
      paymentStatus,
      invoiceNumber: `LEGACY-${s.year}-${seq4}`,
      receiptNumber: `LEGACY-RC-${s.year}-${seq4}`,
      invoiceId: genId(),
      subscriptionId: genId(),
      paymentId: genId(),
      notes: `Legacy import (${s.year} file, row ${r.__row}). Original: actual=${actual}, discounted=${disc}, paid=${paid}, balance=${bal}, status=${rawStatus}`,
    });
  }

  // ---- intent: first membership NEW; later ones EXTEND if they start within 30 days of the previous end
  const byMember = new Map<string, SubRow[]>();
  for (const s of subs) byMember.set(s.legacyId, [...(byMember.get(s.legacyId) ?? []), s]);
  for (const list of byMember.values()) {
    list.sort((a, b) => a.startDate.getTime() - b.startDate.getTime() || a.year - b.year || a.seq - b.seq);
    let prevEnd = -Infinity;
    list.forEach((s, i) => {
      s.intent = i > 0 && s.startDate.getTime() <= prevEnd + 30 * 86400000 ? 'EXTEND' : 'NEW';
      prevEnd = Math.max(prevEnd, s.endDate.getTime());
    });
    const active = list.filter((s) => s.status === 'ACTIVE');
    if (active.length > 1) {
      ex('MULTIPLE_ACTIVE', list[0].legacyId, list[0].memberName, active.map((a) => `${a.rawPlan} ${iso(toYMD(a.startDate))}..${iso(toYMD(a.endDate))}`).join(' ; '));
    }
  }

  // ---- stats
  const revenueByYearPaise: Record<string, number> = {};
  const revenueByServicePaise: Record<string, number> = {};
  let voidedPaise = 0;
  let refundedPaise = 0;
  let outstandingBalancePaise = 0;
  for (const s of subs) {
    if (s.paymentStatus === 'PAID') {
      const y = String(s.createdAt.getUTCFullYear());
      revenueByYearPaise[y] = (revenueByYearPaise[y] ?? 0) + s.paidAmount;
      revenueByServicePaise[s.serviceName] = (revenueByServicePaise[s.serviceName] ?? 0) + s.paidAmount;
    } else if (s.paymentStatus === 'VOIDED') voidedPaise += s.paidAmount;
    else if (s.paymentStatus === 'REFUNDED') refundedPaise += s.paidAmount;
    outstandingBalancePaise += s.balanceAmount;
  }

  return {
    members,
    memberUpdates,
    subs,
    catalog: { services, subs: subCats, packages },
    exceptions,
    stats: {
      membersTotal: masters.length,
      membersNew: members.length,
      membersMerged: memberUpdates.length,
      subs: subs.length,
      revenueByYearPaise,
      revenueByServicePaise,
      voidedPaise,
      refundedPaise,
      outstandingBalancePaise,
    },
  };
}

function toYMD(dt: Date): YMD {
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}
