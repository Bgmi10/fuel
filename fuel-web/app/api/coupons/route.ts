import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();

    const {
      code,

      isPrivate = false,
      isActive = true,

      discountPercent,
      discountFlatAmount,

      usageLimit,
      expiresAt,

      packageIds = [],
    } = body;

    // =========================================
    // VALIDATION
    // =========================================

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Coupon code required",
        },
        { status: 400 }
      );
    }

    if (
      !discountPercent &&
      !discountFlatAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Provide discountPercent or discountFlatAmount",
        },
        { status: 400 }
      );
    }

    if (
      discountPercent &&
      discountFlatAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Use either percentage or flat discount",
        },
        { status: 400 }
      );
    }

    // =========================================
    // EXISTING
    // =========================================

    const existing =
      await prisma.coupon.findUnique({
        where: {
          code: code.toUpperCase(),
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Coupon already exists",
        },
        { status: 400 }
      );
    }

    // =========================================
    // VALIDATE PACKAGE IDS
    // =========================================

    if (
      packageIds &&
      packageIds.length > 0
    ) {
      const packages =
        await prisma.servicePackage.findMany({
          where: {
            id: {
              in: packageIds,
            },
          },
          select: {
            id: true,
          },
        });

      if (
        packages.length !==
        packageIds.length
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Some selected packages are invalid",
          },
          { status: 400 }
        );
      }
    }

    // =========================================
    // CREATE
    // =========================================

    const coupon =
      await prisma.coupon.create({
        data: {
          code: code.toUpperCase(),

          isPrivate,
          isActive,

          discountPercent:
            discountPercent || null,

          discountFlatAmount:
            discountFlatAmount || null,

          usageLimit:
            usageLimit || null,

          expiresAt: expiresAt
            ? new Date(expiresAt)
            : null,

          ...(packageIds?.length > 0 && {
            packages: {
              connect: packageIds.map(
                (id: string) => ({
                  id,
                })
              ),
            },
          }),
        },

        include: {
          packages: true,
        },
      });

    return NextResponse.json({
      success: true,
      coupon,
    });
  } catch (e) {
    console.log(e);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      {
        status: 500,
      }
    );
  }
};

export const GET = async () => {
    try {
      const coupons =
        await prisma.coupon.findMany({
          orderBy: {
            createdAt: "desc",
          },
          include: {
            packages: {
              include: {
                service: true
              }
            }
          }
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