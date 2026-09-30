import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const memberships = await prisma.subscription.findMany({
      include: {
        member: {
          include: {
            branch: true,
            coach: true,
          },
        },
        branch: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    const enriched = memberships.map((subscription) => {
      const member = subscription.member;

      const usedSessions =
        subscription.totalSessions != null &&
        subscription.remainingSessions != null
          ? Math.max(
              0,
              subscription.totalSessions -
                subscription.remainingSessions
            )
          : null;

      return {
        id: subscription.id,

        // Subscription
        status: subscription.status,
        serviceName: subscription.serviceName,
        packageName: subscription.packageName,
        packageDurationInDays:
          subscription.packageDurationInDays,

        usageType: subscription.usageType,

        totalSessions: subscription.totalSessions,
        remainingSessions:
          subscription.remainingSessions,
        usedSessions,

        startDate: subscription.startDate,
        endDate: subscription.endDate,

        originalPrice: subscription.originalPrice,
        finalPrice: subscription.finalPrice,

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
              emergencyContact:
                member.emergencyContact,
              address: member.address,
              referralCode: member.referralCode,
              status: member.status,
              onBoardCompleted:
                member.onBoardCompleted,

              branch: member.branch
                ? {
                    id: member.branch.id,
                    name: member.branch.name,
                  }
                : null,

              coach: member.coach
                ? {
                    id: member.coach.id,
                    name: member.coach.name,
                  }
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
    console.error(
      "Failed to fetch memberships:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        count: 0,
        memberships: [],
        message: "Failed to fetch memberships",
      },
      {
        status: 500,
      }
    );
  }
}