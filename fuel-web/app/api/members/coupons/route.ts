import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export const GET = async () => {
    try {
      const coupons =
        await prisma.coupon.findMany({
            where: { 
                isPrivate: false,
                isActive: true,
                expiresAt: {
                    gte: new Date(),
                  },
            },
          orderBy: {
            createdAt: "desc",
          },
        });
  
      return NextResponse.json({
        success: true,
        coupons,
      });
    } catch (e) {
      console.log(e);
  
      return NextResponse.json(
        {
          success: false,
        },
        {
          status: 500,
        }
      );
    }
  };