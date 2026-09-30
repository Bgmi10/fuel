import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export const GET = async () => {
  try {
    const members = await prisma.member.findMany({
      where: {
        subscriptions: {
          some: {
            status: {
              notIn: ["FROZEN", "CANCELLED", "TRANSFERRED", "EXPIRED"],
            },
          },
        },
      },

      include: {
        branch: true,
        coach: true,

        subscriptions: true
      },
    });

    const enriched = members.map((m) => {
      const sub = m.subscriptions[0];

      return {
        ...m,
        currentStatus: "ACTIVE",
        currentPlan: sub?.packageId || null,
        endDate: sub?.endDate || null,
      };
    });

    return NextResponse.json({
      success: true,
      members: enriched,
    });
  } catch (e) {
    console.log(e);

    return NextResponse.json({
      success: false,
    });
  }
};