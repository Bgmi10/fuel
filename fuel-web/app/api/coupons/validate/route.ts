import { prisma } from "@/prisma";
import {
  NextRequest,
  NextResponse,
} from "next/server";

export const POST = async (
  req: NextRequest
) => {
  try {
    const {
      code,
      packageId,
    } = await req.json();

    // =========================================
    // VALIDATION
    // =========================================

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Coupon code required",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // FIND COUPON
    // =========================================

    const coupon =
      await prisma.coupon.findUnique({
        where: {
          code: code.toUpperCase(),
        },

        include: {
          packages: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    if (!coupon) {
      return NextResponse.json({
        success: false,
        message: "Invalid coupon",
      });
    }

    // =========================================
    // ACTIVE
    // =========================================

    if (!coupon.isActive) {
      return NextResponse.json({
        success: false,
        message: "Coupon inactive",
      });
    }

    // =========================================
    // EXPIRED
    // =========================================

    if (
      coupon.expiresAt &&
      new Date(coupon.expiresAt) <
        new Date()
    ) {
      return NextResponse.json({
        success: false,
        message: "Coupon expired",
      });
    }

    // =========================================
    // USAGE LIMIT
    // =========================================

    if (
      coupon.usageLimit &&
      coupon.usedCount >=
        coupon.usageLimit
    ) {
      return NextResponse.json({
        success: false,
        message:
          "Coupon usage limit reached",
      });
    }

    // =========================================
    // PACKAGE VALIDATION
    // =========================================

    // if coupon has linked packages,
    // current package must exist inside it

    if (
      coupon.packages.length > 0
    ) {
      if (!packageId) {
        return NextResponse.json({
          success: false,
          message:
            "Package required for this coupon",
        });
      }

      const allowed =
        coupon.packages.some(
          (pkg) =>
            pkg.id === packageId
        );

      if (!allowed) {
        return NextResponse.json({
          success: false,
          message:
            "Coupon not applicable for selected package",
        });
      }
    }

    // =========================================
    // SUCCESS
    // =========================================

    return NextResponse.json({
      success: true,

      coupon: {
        id: coupon.id,

        code: coupon.code,

        isPrivate:
          coupon.isPrivate,

        discountPercent:
          coupon.discountPercent,

        discountFlatAmount:
          coupon.discountFlatAmount,

        expiresAt:
          coupon.expiresAt,

        packages:
          coupon.packages,
      },
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