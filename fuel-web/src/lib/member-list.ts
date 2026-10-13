import { prisma } from "@/prisma";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import {
  getIndiaDateKey,
  indiaDayStartToUtc,
} from "@/src/lib/dashboard-range";

export type MemberListMode = "active" | "inactive";

/**
 * Subscription.status stays ACTIVE after the end date passes, so mark
 * those rows EXPIRED. Best effort: a failure must not break the list.
 */
async function syncExpiredSubscriptions(todayStart: Date) {
  try {
    await prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: { lt: todayStart },
      },
      data: { status: SubscriptionStatus.EXPIRED },
    });
  } catch (error) {
    console.error("Expired subscription sync failed:", error);
  }
}

export async function listMembers(
  mode: MemberListMode,
  branchId: string | null
) {
  const todayStart = indiaDayStartToUtc(getIndiaDateKey());

  await syncExpiredSubscriptions(todayStart);

  // A membership that is still running (end date counts through its day)
  const live: Prisma.SubscriptionWhereInput = {
    status: SubscriptionStatus.ACTIVE,
    endDate: { gte: todayStart },
  };

  const where: Prisma.MemberWhereInput = {
    ...(branchId ? { branchId } : {}),
    ...(mode === "active"
      ? { subscriptions: { some: live } }
      : { NOT: { subscriptions: { some: live } } }),
  };

  const members = await prisma.member.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      branch: true,
      coach: true,
      subscriptions: {
        orderBy: { createdAt: "asc" },
        include: {
          invoice: { select: { intent: true } },
          incomingTransfer: { select: { id: true } },
        },
      },
    },
  });

  return members.map((member) => {
    const {
      otpCode,
      otpType,
      otpExpiresAt,
      otpVerifiedAt,
      onBoardingForm,
      subscriptions,
      ...safe
    } = member;

    // Memberships that moved to someone else are not shown on this member
    const subs = subscriptions.filter(
      (s) => s.status !== SubscriptionStatus.TRANSFERRED
    );

    const latest = <T extends { endDate: Date }>(list: T[]) =>
      [...list].sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0] ??
      null;

    const liveSubs = subs.filter(
      (s) =>
        s.status === SubscriptionStatus.ACTIVE && s.endDate >= todayStart
    );

    const frozenSubs = subs.filter(
      (s) => s.status === SubscriptionStatus.FROZEN
    );

    const current = latest(liveSubs) ?? latest(frozenSubs) ?? latest(subs);

    let currentStatus = "NONE";

    if (current) {
      if (current.status === SubscriptionStatus.FROZEN) {
        currentStatus = "FROZEN";
      } else if (current.status === SubscriptionStatus.CANCELLED) {
        currentStatus = "CANCELLED";
      } else if (current.endDate < todayStart) {
        currentStatus = "EXPIRED";
      } else {
        currentStatus = "ACTIVE";
      }
    }

    // Renewals: EXTEND invoices, or (no invoice) any membership after the first
    const renewalCount = subs.reduce((count, sub, index) => {
      if (sub.incomingTransfer) return count;

      if (sub.invoice?.intent === "EXTEND") return count + 1;
      if (!sub.invoice && index > 0) return count + 1;

      return count;
    }, 0);

    return {
      ...safe,

      currentStatus,

      membershipName: current?.packageName ?? null,
      serviceName: current?.serviceName ?? null,
      startDate: current?.startDate ?? null,
      endDate: current?.endDate ?? null,

      renewalCount,
      membershipCount: subs.length,
    };
  });
}