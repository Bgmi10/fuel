import { MembershipUsageType } from "@prisma/client";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma";

type Params = {
  params: Promise<{
    id: string;
    packageId: string;
  }>;
};

const allowedUsageTypes = new Set<MembershipUsageType>([
  "DURATION_BASED",
  "SESSION_BASED",
]);

const toPositiveInteger = (
  value: unknown
): number | null => {
  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : null;
};

const toOptionalAmount = (
  value: unknown
): number | null | undefined => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 0
  ) {
    return undefined;
  }

  return parsed;
};

/* =========================
   NORMALIZE SUBCATEGORY IDS
========================= */

const normalizeSubCategoryIds = (
  value: unknown
): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (id): id is string =>
          typeof id === "string" &&
          id.trim().length > 0
      )
    ),
  ];
};

/* =========================
   PUT - UPDATE PACKAGE
========================= */

export const PUT = async (
  req: NextRequest,
  { params }: Params
) => {
  const {
    id: serviceId,
    packageId,
  } = await params;

  try {
    /* =========================
       FIND EXISTING PACKAGE
    ========================= */

    const existingPackage =
      await prisma.servicePackage.findFirst({
        where: {
          id: packageId,
          serviceId,
        },
      });

    if (!existingPackage) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Package not found.",
        },
        { status: 404 }
      );
    }

    /* =========================
       READ BODY
    ========================= */

    const body = await req.json();

    const name =
      String(body.name || "").trim();

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const durationInDays =
      toPositiveInteger(
        body.durationInDays
      );

    const price =
      toPositiveInteger(body.price);

    const originalPrice =
      toOptionalAmount(
        body.originalPrice
      );

    const usageType =
      String(
        body.usageType ||
          "DURATION_BASED"
      ) as MembershipUsageType;

    const totalSessions =
      usageType === "SESSION_BASED"
        ? toPositiveInteger(
            body.totalSessions
          )
        : null;

    const isActive =
      body.isActive === undefined
        ? existingPackage.isActive
        : Boolean(body.isActive);

    /*
     * Empty array means:
     * package applies to the entire service.
     */
    const subCategoryIds =
      normalizeSubCategoryIds(
        body.subCategoryIds
      );

    /* =========================
       VALIDATION
    ========================= */

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Package name is required.",
        },
        { status: 400 }
      );
    }

    if (!durationInDays) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Duration must be a positive whole number.",
        },
        { status: 400 }
      );
    }

    if (!price) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Price must be greater than zero.",
        },
        { status: 400 }
      );
    }

    if (originalPrice === undefined) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Original price must be a valid amount.",
        },
        { status: 400 }
      );
    }

    if (
      originalPrice !== null &&
      originalPrice < price
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Original price cannot be lower than selling price.",
        },
        { status: 400 }
      );
    }

    if (
      !allowedUsageTypes.has(
        usageType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid membership usage type.",
        },
        { status: 400 }
      );
    }

    if (
      usageType === "SESSION_BASED" &&
      !totalSessions
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter the number of sessions.",
        },
        { status: 400 }
      );
    }

    /* =========================
       VALIDATE SUBCATEGORIES
    ========================= */

    if (subCategoryIds.length > 0) {
      const validSubCategories =
        await prisma.serviceSubCategory.findMany({
          where: {
            id: {
              in: subCategoryIds,
            },

            serviceId,
          },

          select: {
            id: true,
          },
        });

      const validSubCategoryIds =
        new Set(
          validSubCategories.map(
            (subCategory) =>
              subCategory.id
          )
        );

      const invalidSubCategoryIds =
        subCategoryIds.filter(
          (id) =>
            !validSubCategoryIds.has(id)
        );

      if (
        invalidSubCategoryIds.length > 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more selected subcategories do not belong to this service.",
          },
          { status: 400 }
        );
      }
    }

    /* =========================
       UPDATE PACKAGE + RELATIONS
    ========================= */

    const updatedPackage =
      await prisma.$transaction(
        async (tx) => {
          /*
           * First update the package itself.
           */
          const packageRecord =
            await tx.servicePackage.update({
              where: {
                id: packageId,
              },

              data: {
                name,

                description:
                  description || null,

                durationInDays,

                price,

                originalPrice,

                isActive,

                usageType,

                totalSessions:
                  usageType ===
                  "SESSION_BASED"
                    ? totalSessions
                    : null,
              },
            });

          /*
           * Remove all existing
           * subcategory relations.
           *
           * This is important because
           * the user may have changed:
           *
           * Yoga + PT
           *
           * to:
           *
           * Cardio
           */
          await tx.servicePackageSubCategory.deleteMany({
            where: {
              packageId,
            },
          });

          /*
           * Re-create relations based
           * on the latest selection.
           *
           * If the array is empty,
           * nothing is created.
           *
           * Therefore the package becomes
           * service-wide.
           */
          if (subCategoryIds.length > 0) {
            await tx.servicePackageSubCategory.createMany({
              data: subCategoryIds.map(
                (subCategoryId) => ({
                  packageId,
                  subCategoryId,
                })
              ),
            });
          }

          /*
           * Return the complete package
           * including its subcategories.
           */
          return tx.servicePackage.findUnique({
            where: {
              id: packageId,
            },

            include: {
              subCategories: {
                include: {
                  subCategory: true,
                },
              },
            },
          });
        }
      );

    return NextResponse.json({
      success: true,
      servicePackage:
        updatedPackage,
    });
  } catch (error) {
    console.error(
      "Update package error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update package.",
      },
      { status: 500 }
    );
  }
};

/* =========================
   DELETE PACKAGE
========================= */

export const DELETE = async (
  _req: NextRequest,
  { params }: Params
) => {
  const {
    id: serviceId,
    packageId,
  } = await params;

  try {
    const existingPackage =
      await prisma.servicePackage.findFirst({
        where: {
          id: packageId,
          serviceId,
        },

        select: {
          id: true,
        },
      });

    if (!existingPackage) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Package not found.",
        },
        { status: 404 }
      );
    }

    await prisma.servicePackage.delete({
      where: {
        id: packageId,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Package deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete package error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "This package may already be used by memberships or invoices. Make it inactive instead.",
      },
      { status: 409 }
    );
  }
};

/* =========================
   GET - SINGLE PACKAGE
========================= */

export const GET = async (
  _req: NextRequest,
  { params }: Params
) => {
  const {
    id: serviceId,
    packageId,
  } = await params;

  try {
    const servicePackage =
      await prisma.servicePackage.findFirst({
        where: {
          id: packageId,
          serviceId,
        },

        include: {
          subCategories: {
            include: {
              subCategory: true,
            },
          },
        },
      });

    if (!servicePackage) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Package not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      servicePackage,
    });
  } catch (error) {
    console.error(
      "Fetch package error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch package.",
      },
      { status: 500 }
    );
  }
};