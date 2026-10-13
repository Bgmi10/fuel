import {
    InvoiceIntent,
    InvoicePaymentStatus,
    InvoiceStatus,
    MemberStatus,
    Prisma,
    SubscriptionStatus,
  } from "@prisma/client";
  
  import { NextRequest, NextResponse } from "next/server";
  
  import { getUserFromRequest } from "@/app/utils/auth";
  import { prisma } from "@/prisma";
  
  import {
    addDaysToDateKey,
    diffDays,
    getIndiaDateKey,
    getWeekStartKey,
    indiaDayEndToUtc,
    indiaDayStartToUtc,
    invoiceTotalPaise,
    parsePeriod,
    resolveDateRange,
  } from "@/src/lib/dashboard-range";
  
  export const dynamic = "force-dynamic";
  
  const PAGE_SIZE = 10;
  const EXPIRY_DAYS = 7;
  const OVERDUE_LOOKBACK_DAYS = 60;
  
  type Column = {
    key: string;
    label: string;
    type?: "text" | "money" | "date" | "datetime" | "days" | "badge";
    align?: "right";
  };
  
  type Summary = { label: string; value: number | string; kind: "money" | "count" };
  
  type Range = {
    fromKey: string;
    toKey: string;
    startDate: Date;
    endDate: Date;
  };
  
  export async function GET(req: NextRequest) {
    try {
      const user = await getUserFromRequest(req);
  
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }
  
      const sp = req.nextUrl.searchParams;
      const type = sp.get("type") || "";
  
      const requestedPage = Math.floor(Number(sp.get("page") || "1"));
      const page =
        Number.isFinite(requestedPage) && requestedPage >= 1 ? requestedPage : 1;
  
      const skip = (page - 1) * PAGE_SIZE;
      const take = PAGE_SIZE;
  
      const branchId = user.branchId || sp.get("branchId")?.trim() || null;
      const branchFilter = branchId ? { branchId } : {};
  
      const todayKey = getIndiaDateKey();
      const todayStart = indiaDayStartToUtc(todayKey);
      const todayEnd = indiaDayEndToUtc(todayKey);
      const weekStart = indiaDayStartToUtc(getWeekStartKey(todayKey));
      const monthStart = indiaDayStartToUtc(`${todayKey.slice(0, 8)}01`);
      const expiryEnd = indiaDayEndToUtc(addDaysToDateKey(todayKey, EXPIRY_DAYS));
      const overdueStart = indiaDayStartToUtc(
        addDaysToDateKey(todayKey, -OVERDUE_LOOKBACK_DAYS)
      );
  
      const liveStatuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN];
  
      const send = (body: {
        title: string;
        subtitle: string;
        summary?: Summary[];
        columns: Column[];
        rows: Record<string, unknown>[];
        total: number;
      }) =>
        NextResponse.json(
          {
            success: true,
            summary: [],
            page,
            pageSize: PAGE_SIZE,
            totalPages: Math.max(1, Math.ceil(body.total / PAGE_SIZE)),
            ...body,
          },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );
  
      const getRange = (): Range => {
        const period = parsePeriod(sp.get("period"), "month");
  
        if (!period) throw new Error("INVALID_PERIOD");
  
        return resolveDateRange({
          period,
          from: sp.get("from"),
          to: sp.get("to"),
        });
      };
  
      const rangeText = (r: Range) =>
        r.fromKey === r.toKey ? r.fromKey : `${r.fromKey} to ${r.toKey}`;
  
      /* ---------------- shared builders ---------------- */
  
      const collection = async (title: string, range: Range) => {
        const where: Prisma.PaymentWhereInput = {
          status: InvoicePaymentStatus.PAID,
          paidAt: { gte: range.startDate, lte: range.endDate },
          ...(branchId ? { invoice: { branchId } } : {}),
        };
  
        const [agg, items] = await Promise.all([
          prisma.payment.aggregate({
            where,
            _sum: { amount: true },
            _count: true,
          }),
          prisma.payment.findMany({
            where,
            orderBy: { paidAt: "desc" },
            skip,
            take,
            select: {
              id: true,
              memberId: true,
              receiptNumber: true,
              paymentMode: true,
              paymentType: true,
              amount: true,
              paidAt: true,
              invoice: {
                select: {
                  invoiceNumber: true,
                  memberName: true,
                  packageName: true,
                },
              },
            },
          }),
        ]);
  
        return send({
          title,
          subtitle: rangeText(range),
          summary: [
            { label: "Total collected", value: agg._sum.amount || 0, kind: "money" },
            { label: "Payments", value: agg._count, kind: "count" },
          ],
          columns: [
            { key: "member", label: "Member" },
            { key: "receipt", label: "Receipt" },
            { key: "invoice", label: "Invoice" },
            { key: "package", label: "Package" },
            { key: "mode", label: "Mode", type: "badge" },
            { key: "paidAt", label: "Paid on", type: "datetime" },
            { key: "amount", label: "Amount", type: "money", align: "right" },
          ],
          rows: items.map((p) => ({
            id: p.id,
            memberId: p.memberId,
            member: p.invoice.memberName,
            receipt: p.receiptNumber,
            invoice: p.invoice.invoiceNumber,
            package: p.invoice.packageName,
            mode: p.paymentMode,
            paidAt: p.paidAt,
            amount: p.amount,
          })),
          total: agg._count,
        });
      };
  
      const subscriptionRows = async (
        title: string,
        subtitle: string,
        where: Prisma.SubscriptionWhereInput,
        mode: "today" | "upcoming" | "overdue"
      ) => {
        const [total, items] = await Promise.all([
          prisma.subscription.count({ where }),
          prisma.subscription.findMany({
            where,
            orderBy: [
              { endDate: mode === "overdue" ? "desc" : "asc" },
              { member: { name: "asc" } },
            ],
            skip,
            take,
            select: {
              id: true,
              serviceName: true,
              packageName: true,
              startDate: true,
              endDate: true,
              status: true,
              member: { select: { id: true, name: true, phone: true } },
            },
          }),
        ]);
  
        const columns: Column[] = [
          { key: "member", label: "Member" },
          { key: "phone", label: "Phone" },
          { key: "plan", label: "Plan" },
          { key: "start", label: "Start", type: "date" },
          { key: "end", label: "End", type: "date" },
        ];
  
        if (mode !== "today") {
          columns.push({
            key: "days",
            label: mode === "overdue" ? "Overdue by" : "Days left",
            type: "days",
            align: "right",
          });
        } else {
          columns.push({ key: "status", label: "Status", type: "badge" });
        }
  
        return send({
          title,
          subtitle,
          summary: [{ label: "Memberships", value: total, kind: "count" }],
          columns,
          rows: items.map((s) => {
            const endKey = getIndiaDateKey(s.endDate);
  
            return {
              id: s.id,
              memberId: s.member.id,
              member: s.member.name,
              phone: s.member.phone,
              plan: `${s.serviceName} · ${s.packageName}`,
              start: s.startDate,
              end: s.endDate,
              status: s.status,
              days:
                mode === "overdue"
                  ? diffDays(endKey, todayKey)
                  : diffDays(todayKey, endKey),
            };
          }),
          total,
        });
      };
  
      /* ---------------- DISPATCH ---------------- */
  
      switch (type) {
        case "active-members": {
          const where: Prisma.MemberWhereInput = {
            status: MemberStatus.ACTIVE,
            ...branchFilter,
            subscriptions: {
              some: {
                status: SubscriptionStatus.ACTIVE,
                endDate: { gte: todayStart },
              },
            },
          };
  
          const [total, items] = await Promise.all([
            prisma.member.count({ where }),
            prisma.member.findMany({
              where,
              orderBy: { name: "asc" },
              skip,
              take,
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                subscriptions: {
                  where: {
                    status: SubscriptionStatus.ACTIVE,
                    endDate: { gte: todayStart },
                  },
                  orderBy: { endDate: "desc" },
                  take: 1,
                  select: { serviceName: true, packageName: true, endDate: true },
                },
              },
            }),
          ]);
  
          return send({
            title: "Active Members",
            subtitle: "Members with a currently active membership",
            summary: [{ label: "Active members", value: total, kind: "count" }],
            columns: [
              { key: "member", label: "Member" },
              { key: "phone", label: "Phone" },
              { key: "email", label: "Email" },
              { key: "plan", label: "Current plan" },
              { key: "end", label: "Ends on", type: "date" },
            ],
            rows: items.map((m) => {
              const sub = m.subscriptions[0];
  
              return {
                id: m.id,
                memberId: m.id,
                member: m.name,
                phone: m.phone,
                email: m.email,
                plan: sub ? `${sub.serviceName} · ${sub.packageName}` : "-",
                end: sub?.endDate ?? null,
              };
            }),
            total,
          });
        }
  
        case "new-members": {
          const where: Prisma.MemberWhereInput = {
            createdAt: { gte: monthStart, lte: todayEnd },
            ...branchFilter,
          };
  
          const [total, items] = await Promise.all([
            prisma.member.count({ where }),
            prisma.member.findMany({
              where,
              orderBy: { createdAt: "desc" },
              skip,
              take,
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                createdAt: true,
              },
            }),
          ]);
  
          return send({
            title: "New Members This Month",
            subtitle: `Joined since ${todayKey.slice(0, 8)}01`,
            summary: [{ label: "New members", value: total, kind: "count" }],
            columns: [
              { key: "member", label: "Member" },
              { key: "phone", label: "Phone" },
              { key: "email", label: "Email" },
              { key: "joined", label: "Joined", type: "datetime" },
            ],
            rows: items.map((m) => ({
              id: m.id,
              memberId: m.id,
              member: m.name,
              phone: m.phone,
              email: m.email,
              joined: m.createdAt,
            })),
            total,
          });
        }
  
        case "renewals": {
          const where: Prisma.InvoiceWhereInput = {
            intent: InvoiceIntent.EXTEND,
            status: {
              in: [InvoiceStatus.PARTIAL_PAID, InvoiceStatus.FULLY_PAID],
            },
            payments: {
              some: {
                status: InvoicePaymentStatus.PAID,
                paidAt: { gte: monthStart, lte: todayEnd },
              },
            },
            ...branchFilter,
          };
  
          const [total, items] = await Promise.all([
            prisma.invoice.count({ where }),
            prisma.invoice.findMany({
              where,
              orderBy: { createdAt: "desc" },
              skip,
              take,
              select: {
                id: true,
                memberId: true,
                memberName: true,
                memberPhone: true,
                invoiceNumber: true,
                packageName: true,
                branchName: true,
                finalAmount: true,
                totalTax: true,
                discountAmount: true,
                status: true,
                createdAt: true,
              },
            }),
          ]);
  
          return send({
            title: "Membership Renewals This Month",
            subtitle: "Renewal invoices with a payment received this month",
            summary: [{ label: "Renewals", value: total, kind: "count" }],
            columns: [
              { key: "member", label: "Member" },
              { key: "phone", label: "Phone" },
              { key: "invoice", label: "Invoice" },
              { key: "package", label: "Package" },
              { key: "status", label: "Status", type: "badge" },
              { key: "date", label: "Date", type: "date" },
              { key: "amount", label: "Total", type: "money", align: "right" },
            ],
            rows: items.map((i) => ({
              id: i.id,
              memberId: i.memberId,
              member: i.memberName,
              phone: i.memberPhone,
              invoice: i.invoiceNumber,
              package: i.packageName,
              status: i.status.replace("_", " "),
              date: i.createdAt,
              amount: invoiceTotalPaise(i),
            })),
            total,
          });
        }
  
        case "today-collection":
          return collection("Today's Collection", {
            fromKey: todayKey,
            toKey: todayKey,
            startDate: todayStart,
            endDate: todayEnd,
          });
  
        case "week-collection":
          return collection("This Week's Collection", {
            fromKey: getWeekStartKey(todayKey),
            toKey: todayKey,
            startDate: weekStart,
            endDate: todayEnd,
          });
  
        case "collection":
          return collection("Collection", getRange());
  
        case "expenses": {
          const range = getRange();
  
          const where: Prisma.ExpenseWhereInput = {
            date: { gte: range.startDate, lte: range.endDate },
            ...(branchId ? { byUser: { branchId } } : {}),
          };
  
          const [agg, items] = await Promise.all([
            prisma.expense.aggregate({
              where,
              _sum: { amount: true },
              _count: true,
            }),
            prisma.expense.findMany({
              where,
              orderBy: { date: "desc" },
              skip,
              take,
              select: {
                id: true,
                description: true,
                date: true,
                amount: true,
                byUser: { select: { name: true } },
              },
            }),
          ]);
  
          return send({
            title: "Expenses",
            subtitle: rangeText(range),
            summary: [
              { label: "Total expenses", value: agg._sum.amount || 0, kind: "money" },
              { label: "Entries", value: agg._count, kind: "count" },
            ],
            columns: [
              { key: "date", label: "Date", type: "date" },
              { key: "description", label: "Description" },
              { key: "by", label: "Added by" },
              { key: "amount", label: "Amount", type: "money", align: "right" },
            ],
            rows: items.map((e) => ({
              id: e.id,
              date: e.date,
              description: e.description || "-",
              by: e.byUser?.name || "-",
              amount: e.amount || 0,
            })),
            total: agg._count,
          });
        }
  
        case "pending-dues": {
          const where: Prisma.InvoiceWhereInput = {
            status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL_PAID] },
            balanceAmount: { gt: 0 },
            ...branchFilter,
          };
  
          const [agg, items] = await Promise.all([
            prisma.invoice.aggregate({
              where,
              _sum: { balanceAmount: true },
              _count: true,
            }),
            prisma.invoice.findMany({
              where,
              orderBy: { balanceAmount: "desc" },
              skip,
              take,
              select: {
                id: true,
                memberId: true,
                memberName: true,
                memberPhone: true,
                invoiceNumber: true,
                packageName: true,
                status: true,
                paidAmount: true,
                balanceAmount: true,
                createdAt: true,
              },
            }),
          ]);
  
          return send({
            title: "Pending Dues",
            subtitle: "Invoices with an outstanding balance",
            summary: [
              {
                label: "Total outstanding",
                value: agg._sum.balanceAmount || 0,
                kind: "money",
              },
              { label: "Invoices", value: agg._count, kind: "count" },
            ],
            columns: [
              { key: "member", label: "Member" },
              { key: "phone", label: "Phone" },
              { key: "invoice", label: "Invoice" },
              { key: "package", label: "Package" },
              { key: "status", label: "Status", type: "badge" },
              { key: "date", label: "Created", type: "date" },
              { key: "paid", label: "Paid", type: "money", align: "right" },
              { key: "balance", label: "Balance", type: "money", align: "right" },
            ],
            rows: items.map((i) => ({
              id: i.id,
              memberId: i.memberId,
              member: i.memberName,
              phone: i.memberPhone,
              invoice: i.invoiceNumber,
              package: i.packageName,
              status: i.status.replace("_", " "),
              date: i.createdAt,
              paid: i.paidAmount,
              balance: i.balanceAmount,
            })),
            total: agg._count,
          });
        }
  
        case "today-expiries":
          return subscriptionRows(
            "Today's Expiries",
            "Memberships ending today",
            {
              endDate: { gte: todayStart, lte: todayEnd },
              status: { in: liveStatuses },
              ...branchFilter,
            },
            "today"
          );
  
        case "expiring":
          return subscriptionRows(
            "Expiring in the Next 7 Days",
            "Active memberships ending within a week",
            {
              endDate: { gte: todayStart, lte: expiryEnd },
              status: { in: liveStatuses },
              ...branchFilter,
              member: { status: MemberStatus.ACTIVE },
            },
            "upcoming"
          );
  
        case "overdue":
          return subscriptionRows(
            "Overdue Memberships",
            `Expired in the last ${OVERDUE_LOOKBACK_DAYS} days and not renewed`,
            {
              endDate: { gte: overdueStart, lt: todayStart },
              status: {
                in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED],
              },
              ...branchFilter,
              member: {
                status: MemberStatus.ACTIVE,
                subscriptions: {
                  none: {
                    status: { in: liveStatuses },
                    endDate: { gte: todayStart },
                  },
                },
              },
            },
            "overdue"
          );
  
        case "present-today": {
          const where: Prisma.MemberAttendanceWhereInput = {
            dateKey: todayKey,
            ...branchFilter,
          };
  
          const [groups, items] = await Promise.all([
            prisma.memberAttendance.groupBy({ by: ["memberId"], where }),
            prisma.memberAttendance.findMany({
              where,
              distinct: ["memberId"],
              orderBy: { checkInAt: "desc" },
              skip,
              take,
              select: {
                id: true,
                memberId: true,
                checkInAt: true,
                member: { select: { name: true, phone: true } },
                branch: { select: { name: true } },
              },
            }),
          ]);
  
          return send({
            title: "Today's Present Members",
            subtitle: `Checked in on ${todayKey}`,
            summary: [{ label: "Present today", value: groups.length, kind: "count" }],
            columns: [
              { key: "member", label: "Member" },
              { key: "phone", label: "Phone" },
              { key: "branch", label: "Branch" },
              { key: "checkIn", label: "Check-in", type: "datetime" },
            ],
            rows: items.map((a) => ({
              id: a.id,
              memberId: a.memberId,
              member: a.member.name,
              phone: a.member.phone,
              branch: a.branch.name,
              checkIn: a.checkInAt,
            })),
            total: groups.length,
          });
        }
  
        case "sales": {
          const range = getRange();
  
          const where: Prisma.InvoiceWhereInput = {
            intent: {
              in: [
                InvoiceIntent.NEW,
                InvoiceIntent.EXTEND,
                InvoiceIntent.UPGRADE,
              ],
            },
            status: { not: InvoiceStatus.CANCELLED },
            createdAt: { gte: range.startDate, lte: range.endDate },
            ...branchFilter,
          };
  
          const [totals, count, items] = await Promise.all([
            prisma.invoice.findMany({
              where,
              select: { finalAmount: true, totalTax: true, discountAmount: true },
            }),
            prisma.invoice.count({ where }),
            prisma.invoice.findMany({
              where,
              orderBy: { createdAt: "desc" },
              skip,
              take,
              select: {
                id: true,
                memberId: true,
                memberName: true,
                invoiceNumber: true,
                intent: true,
                packageName: true,
                serviceName: true,
                finalAmount: true,
                totalTax: true,
                discountAmount: true,
                createdAt: true,
              },
            }),
          ]);
  
          const salesTotal = totals.reduce((t, i) => t + invoiceTotalPaise(i), 0);
  
          return send({
            title: "Membership Sales",
            subtitle: rangeText(range),
            summary: [
              { label: "Total sales", value: salesTotal, kind: "money" },
              { label: "Invoices", value: count, kind: "count" },
            ],
            columns: [
              { key: "member", label: "Member" },
              { key: "invoice", label: "Invoice" },
              { key: "intent", label: "Type", type: "badge" },
              { key: "plan", label: "Plan" },
              { key: "date", label: "Date", type: "date" },
              { key: "amount", label: "Total", type: "money", align: "right" },
            ],
            rows: items.map((i) => ({
              id: i.id,
              memberId: i.memberId,
              member: i.memberName,
              invoice: i.invoiceNumber,
              intent: i.intent,
              plan: `${i.serviceName} · ${i.packageName}`,
              date: i.createdAt,
              amount: invoiceTotalPaise(i),
            })),
            total: count,
          });
        }
  
        default:
          return NextResponse.json(
            { success: false, message: "Unknown dashboard view." },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error("GET /api/dashboard/details error:", error);
  
      if (
        error instanceof Error &&
        (error.message === "INVALID_CUSTOM_RANGE" ||
          error.message === "INVALID_PERIOD")
      ) {
        return NextResponse.json(
          { success: false, message: "Choose a valid date range." },
          { status: 400 }
        );
      }
  
      return NextResponse.json(
        { success: false, message: "Failed to load details." },
        { status: 500 }
      );
    }
  }