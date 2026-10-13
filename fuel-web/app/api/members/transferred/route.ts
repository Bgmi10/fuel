import { prisma } from "@/prisma";
import { getUserFromRequest } from "@/app/utils/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  getIndiaDateKey,
  indiaDayStartToUtc,
} from "@/src/lib/dashboard-range";

export const dynamic = "force-dynamic";

type PaymentStatus = "PAID" | "PARTIAL" | "PENDING" | "NO_FEE";

export const GET = async (request: NextRequest) => {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    const todayStart = indiaDayStartToUtc(getIndiaDateKey());

    const transfers = await prisma.membershipTransfer.findMany({
      where: user.branchId
        ? { subscription: { branchId: user.branchId } }
        : undefined,

      orderBy: { createdAt: "desc" },

      include: {
        fromMember: {
          select: { id: true, name: true, phone: true, email: true },
        },
        toMember: {
          include: { branch: true },
        },
        transferredBy: { select: { id: true, name: true } },
        subscription: {
          select: {
            id: true,
            memberId: true,
            status: true,
            packageName: true,
            serviceName: true,
            branchName: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    const rows = transfers.map((t) => {
      const sub = t.subscription;

      // Only the latest transfer is the current holder of the membership
      const isCurrent = sub.memberId === t.toMemberId;

      let status = "TRANSFERRED";

      if (isCurrent) {
        status =
          sub.status === "ACTIVE" && sub.endDate < todayStart
            ? "EXPIRED"
            : sub.status;
      }

      const total = Math.max(t.transferFee || 0, 0);
      const collected = Math.max(t.amountCollected ?? 0, 0);

      const paymentStatus: PaymentStatus =
        total === 0
          ? "NO_FEE"
          : collected >= total
          ? "PAID"
          : collected > 0
          ? "PARTIAL"
          : "PENDING";

      return {
        id: t.id,
        subscriptionId: sub.id,
        isCurrent,

        // receiving member (current holder)
        memberId: t.toMember.id,
        name: t.toMember.name,
        phone: t.toMember.phone,
        email: t.toMember.email,
        profileImage: t.toMember.profileImage,

        branchName: sub.branchName || t.toMember.branch?.name || null,

        packageName: sub.packageName,
        serviceName: sub.serviceName,
        startDate: sub.startDate,
        endDate: sub.endDate,

        from: {
          id: t.fromMember.id,
          name: t.fromMember.name,
          phone: t.fromMember.phone,
        },

        // PAISE
        transferFeePaise: total,
        baseFeePaise: t.baseTransferFee,
        amountCollectedPaise: collected,
        paymentStatus,
        paymentMode: t.paymentMode,

        status,

        remainingDays: t.remainingDays,
        feeSlabLabel: t.feeSlabLabel,
        reason: t.reason,
        transferredByName: t.transferredBy?.name ?? null,
        transferredAt: t.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      count: rows.length,
      transfers: rows,
    });
  } catch (error) {
    console.error("Failed to fetch transferred memberships:", error);

    return NextResponse.json(
      {
        success: false,
        count: 0,
        transfers: [],
        message: "Failed to fetch transferred memberships",
      },
      { status: 500 }
    );
  }
};