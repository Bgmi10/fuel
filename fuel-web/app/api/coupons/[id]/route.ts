
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";
export const PATCH = async (
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) => {
  try {
    const { id } = await params;

    const body = await req.json();

    const {
      code,

      isPrivate,
      isActive,

      discountPercent,
      discountFlatAmount,

      usageLimit,
      expiresAt,

      packageIds = [],
    } = body;

    // =========================================
    // EXISTING
    // =========================================

    const existing =
      await prisma.coupon.findUnique({
        where: { id },

        include: {
          packages: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Coupon not found",
        },
        {
          status: 404,
        }
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
          {
            status: 400,
          }
        );
      }
    }

    // =========================================
    // UPDATE
    // =========================================

    const updated =
      await prisma.coupon.update({
        where: { id },

        data: {
          code: code?.toUpperCase(),

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

          packages: {
            set: [],

            ...(packageIds?.length > 0 && {
              connect: packageIds.map(
                (pkgId: string) => ({
                  id: pkgId,
                })
              ),
            }),
          },
        },

        include: {
          packages: {
            include: {
              service: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      coupon: updated,
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

export const DELETE = async (
    req: NextRequest,
    {
      params,
    }: {
      params: Promise<{ id: string }>;
    }
  ) => {
    try {
      const { id } = await params;
  
      await prisma.coupon.delete({
        where: { id },
      });
  
      return NextResponse.json({
        success: true,
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