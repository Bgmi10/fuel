import { prisma } from "@/prisma";
import { getUserFromRequest } from "@/app/utils/auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type MembershipType = "NEW" | "RENEWAL";

const invoiceTotalPaise = (invoice: {
  finalAmount: number;
  totalTax: number | null;
  discountAmount: number;
}) =>
  Math.max(
    invoice.finalAmount +
      Math.round(invoice.totalTax ?? 0) -
      invoice.discountAmount,
    0
  );

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          count: 0,
          memberships: [],
          message: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const subscriptions = await prisma.subscription.findMany({
      // branch-scoped users only see their own branch
      where: user.branchId ? { branchId: user.branchId } : undefined,

      include: {
        member: {
          include: {
            branch: true,
            coach: true,
          },
        },
        branch: true,
        invoice: {
          select: {
            invoiceNumber: true,
            intent: true,
            finalAmount: true,
            totalTax: true,
            discountAmount: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    // Earliest membership per member (fallback for Type when no invoice)
    const firstCreatedAt = new Map<string, number>();

    for (const subscription of subscriptions) {
      const time = subscription.createdAt.getTime();
      const current = firstCreatedAt.get(subscription.memberId);

      if (current === undefined || time < current) {
        firstCreatedAt.set(subscription.memberId, time);
      }
    }

    const enriched = subscriptions.map((subscription) => {
      const member = subscription.member;
      const invoice = subscription.invoice;

      const usedSessions =
        subscription.totalSessions != null &&
        subscription.remainingSessions != null
          ? Math.max(
              0,
              subscription.totalSessions - subscription.remainingSessions
            )
          : null;

      let type: MembershipType;

      if (invoice?.intent === "EXTEND") {
        type = "RENEWAL";
      } else if (invoice?.intent === "NEW") {
        type = "NEW";
      } else {
        const first = firstCreatedAt.get(subscription.memberId);

        type =
          first !== undefined && first < subscription.createdAt.getTime()
            ? "RENEWAL"
            : "NEW";
      }

      return {
        id: subscription.id,

        type,

        // Subscription
        status: subscription.status,
        serviceName: subscription.serviceName,
        packageName: subscription.packageName,
        packageDurationInDays: subscription.packageDurationInDays,

        usageType: subscription.usageType,

        totalSessions: subscription.totalSessions,
        remainingSessions: subscription.remainingSessions,
        usedSessions,

        startDate: subscription.startDate,
        endDate: subscription.endDate,

        originalPrice: subscription.originalPrice,
        finalPrice: subscription.finalPrice,

        // PAISE. Invoice total payable (GST included) when available.
        amountPaise: invoice
          ? invoiceTotalPaise(invoice)
          : subscription.finalPrice,

        invoiceNumber: invoice?.invoiceNumber ?? null,

        branchName:
          subscription.branchName ||
          subscription.branch?.name ||
          member?.branch?.name ||
          null,

        // Member
        member: member
          ? {
              id: member.id,
              name: member.name,
              phone: member.phone,
              email: member.email,
              profileImage: member.profileImage,
              gender: member.gender,
              age: member.age,
              weight: member.weight,
              height: member.height,
              emergencyContact: member.emergencyContact,
              address: member.address,
              referralCode: member.referralCode,
              status: member.status,
              onBoardCompleted: member.onBoardCompleted,

              branch: member.branch
                ? { id: member.branch.id, name: member.branch.name }
                : null,

              coach: member.coach
                ? { id: member.coach.id, name: member.coach.name }
                : null,
            }
          : null,

        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      count: enriched.length,
      memberships: enriched,
    });
  } catch (error) {
    console.error("Failed to fetch memberships:", error);

    return NextResponse.json(
      {
        success: false,
        count: 0,
        memberships: [],
        message: "Failed to fetch memberships",
      },
      { status: 500 }
    );
  }
}