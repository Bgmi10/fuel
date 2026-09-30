import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export const GET = async () => {

    try {
        const members = await prisma.member.findMany({
          where: {
            OR: [
              // Case 1: No subscriptions
              {
                subscriptions: {
                  none: {},
                },
              },
        
              // Case 2: Has subscriptions, but no active subscription
              {
                subscriptions: {
                  some: {},
                  none: {
                    status: {
                      notIn: ["FROZEN", "CANCELLED", "EXPIRED", "TRANSFERRED"],
                    },
                  },
                },
              },
            ],
          },
        
          include: {
            branch: true,
            coach: true,
            subscriptions: {
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        });
  
      const enriched = members.map((m) => {
  
        const sub = m.subscriptions[0];
  
        let status = "NONE";
  
        if (sub) {
  
          const now = new Date();
  
          const isExpired =
            new Date(sub.endDate) <= now;
  
          if (sub.status === "FROZEN") {
            status = "FROZEN";
          }
  
          else if (sub.status === "CANCELLED") {
            status = "CANCELLED";
          }
  
          else if (!isExpired) {
            status = "ACTIVE";
          }
  
          else {
            status = "EXPIRED";
          }
        }
  
        return {
          ...m,
          currentStatus: status,
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