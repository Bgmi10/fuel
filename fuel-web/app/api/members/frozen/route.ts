import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const members = await prisma.member.findMany({
      where: {
        subscriptions: {
          some: {
            status: "FROZEN",
          },
        },
      },

      include: {
        branch: true,
        coach: true,

        // Only return the frozen subscription(s)
        subscriptions: {
          where: {
            status: "FROZEN",
          },
          orderBy: {
            endDate: "desc",
          },
          take: 1,
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    const enriched = members.map(({ subscriptions, ...member }) => {
      const subscription = subscriptions[0] ?? null;

      return {
        ...member,

        currentStatus: "FROZEN",

        currentPlan: subscription?.packageId ?? null,

        endDate: subscription?.endDate ?? null,

        frozenSubscription: subscription,
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
      {
        status: 500,
      }
    );
  }
}