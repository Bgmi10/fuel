import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export const GET = async () => {
  try {
    const members = await prisma.member.findMany({
      where: {
        subscriptions: {
          some: {
            status: "TRANSFERRED",
          },
        },
      },

      include: {
        branch: true,
        coach: true,

        subscriptions: {
          where: {
            status: "TRANSFERRED",
          },

          orderBy: {
            updatedAt: "desc",
          },
        },
      },
    });

    const enriched = members.map((member) => {
      /**
       * Because the relation itself is filtered to
       * TRANSFERRED subscriptions, this is guaranteed
       * to be a transferred subscription.
       */
      const transferredSubscription =
        member.subscriptions[0] || null;

      return {
        ...member,

        currentStatus: "TRANSFERRED",

        currentPlan:
          transferredSubscription?.packageId || null,

        endDate:
          transferredSubscription?.endDate || null,

        transferredSubscription,
      };
    });

    return NextResponse.json({
      success: true,
      members: enriched,
    });
  } catch (error) {
    console.error(
      "Failed to fetch transferred members:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch transferred members",
      },
      {
        status: 500,
      }
    );
  }
};