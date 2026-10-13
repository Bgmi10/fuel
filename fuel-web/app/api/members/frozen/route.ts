import { prisma } from "@/prisma";
import { getUserFromRequest } from "@/app/utils/auth";
import { SubscriptionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          count: 0,
          members: [],
          message: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const members = await prisma.member.findMany({
      where: {
        ...(user.branchId ? { branchId: user.branchId } : {}),
        subscriptions: {
          some: { status: SubscriptionStatus.FROZEN },
        },
      },

      include: {
        branch: true,
        coach: true,

        // only the frozen subscription(s)
        subscriptions: {
          where: { status: SubscriptionStatus.FROZEN },
        },
      },

      orderBy: { createdAt: "desc" },
    });

    const time = (value: Date | null) => (value ? value.getTime() : 0);

    const enriched = members.map((member) => {
      const {
        otpCode,
        otpType,
        otpExpiresAt,
        otpVerifiedAt,
        onBoardingForm,
        subscriptions,
        ...safe
      } = member;

      // If a member has several frozen memberships, show the most recent freeze
      const subscription =
        [...subscriptions].sort(
          (a, b) =>
            time(b.freezeStart) - time(a.freezeStart) ||
            b.endDate.getTime() - a.endDate.getTime()
        )[0] ?? null;

      return {
        ...safe,

        currentStatus: "FROZEN",

        membershipName: subscription?.packageName ?? null,
        serviceName: subscription?.serviceName ?? null,
        freezeStart: subscription?.freezeStart ?? null,
        freezeEnd: subscription?.freezeEnd ?? null,
        endDate: subscription?.endDate ?? null,
        frozenCount: subscriptions.length,

        frozenSubscription: subscription
          ? {
              id: subscription.id,
              packageId: subscription.packageId,
              status: subscription.status,
              endDate: subscription.endDate,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      count: enriched.length,
      members: enriched,
    });
  } catch (error) {
    console.error("Failed to fetch frozen members:", error);

    return NextResponse.json(
      {
        success: false,
        count: 0,
        members: [],
        message: "Failed to fetch frozen members",
      },
      { status: 500 }
    );
  }
}