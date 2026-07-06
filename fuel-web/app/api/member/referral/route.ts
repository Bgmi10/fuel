// /api/member/referral-rewards

import { getMemberFromRequest } from "@/app/utils/memberAuth";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest
) {
  try {
    const member =
      await getMemberFromRequest(req);

    if (!member) {
      return NextResponse.json(
        {
          success: false,
        },
        {
          status: 401,
        }
      );
    }

    const rewards =
      await prisma.referral.findMany({
        where: {
          referrerId: member.id,
rewardClaimed: false,
          rewardIssued: true, 
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    const subscriptions =
      await prisma.subscription.findMany({
        where: {
          memberId: member.id,

          status: "ACTIVE",
        },

        orderBy: {
          endDate: "asc",
        },

        select: {
          id: true,

          packageName: true,
          serviceName: true,
          branchName: true,

          startDate: true,

          endDate: true,
        },
      });

    return NextResponse.json({
      success: true,
      rewards,
      subscriptions,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}