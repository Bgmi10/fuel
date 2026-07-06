import { prisma } from "@/prisma";
import { addDaysUTC } from "@/app/utils/date";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest
) {
  try {
    const {
      referralId,
      subscriptionId,
    } = await req.json();

    const referral =
      await prisma.referral.findUnique({
        where: {
          id: referralId,
        },
      });

    if (!referral) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reward not found",
        },
        { status: 404 }
      );
    }

    if (
      referral.rewardClaimed
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reward already claimed",
        },
        { status: 400 }
      );
    }

    if (
      referral.rewardType !==
      "MEMBERSHIP_DAYS"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid reward type",
        },
        { status: 400 }
      );
    }

    const subscription =
      await prisma.subscription.findUnique(
        {
          where: {
            id: subscriptionId,
          },
        }
      );

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Subscription not found",
        },
        { status: 404 }
      );
    }

    if (
        subscription.memberId !==
        referral.referrerId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Unauthorized subscription",
          },
          {
            status: 403,
          }
        );
      }

      if (!referral.rewardMembershipDays) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid membership reward",
          },
          { status: 400 }
        );
      }

    const newEndDate =
      addDaysUTC(
        subscription.endDate,
        referral.rewardMembershipDays ||
          0
      );

      await prisma.$transaction(
        async (tx) => {
          await tx.subscription.update({
            where: {
              id: subscription.id,
            },
            data: {
              endDate: newEndDate,
            },
          });
      
          await tx.referral.update({
            where: {
              id: referral.id,
            },
            data: {
              rewardClaimed: true,
              claimedSubscriptionId:
                subscription.id,
            },
          });
        }
      );
    return NextResponse.json({
      success: true,
      message:
        "Reward claimed successfully",
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong",
      },
      {
        status: 500,
      }
    );
  }
}