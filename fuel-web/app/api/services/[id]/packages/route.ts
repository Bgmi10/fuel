import { MembershipUsageType } from "@prisma/client";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/prisma";

type Params = {
  params: Promise<{
    id: string;
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
   POST - CREATE PACKAGE
========================= */

export const POST = async (
  req: NextRequest,
  { params }: Params
) => {
  const { id: serviceId } =
    await params;

  try {
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
        ? true
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
       BASIC VALIDATION
    ========================= */

    if (!serviceId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service ID is required.",
        },
        { status: 400 }
      );
    }

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
       CHECK SERVICE
    ========================= */

    const service =
      await prisma.service.findUnique({
        where: {
          id: serviceId,
        },
        select: {
          id: true,
        },
      });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service not found.",
        },
        { status: 404 }
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
       CREATE PACKAGE
    ========================= */

    const servicePackage =
      await prisma.servicePackage.create({
        data: {
          serviceId,

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

          /*
           * If subCategoryIds is empty,
           * no relation rows are created.
           *
           * Therefore the package is
           * service-wide.
           */
          subCategories:
            subCategoryIds.length > 0
              ? {
                  create:
                    subCategoryIds.map(
                      (subCategoryId) => ({
                        subCategoryId,
                      })
                    ),
                }
              : undefined,
        },

        include: {
          subCategories: {
            include: {
              subCategory: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        servicePackage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create package error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to create package.",
      },
      { status: 500 }
    );
  }
};

/* =========================
   GET - FETCH PACKAGES
========================= */

export const GET = async (
  _req: NextRequest,
  { params }: Params
) => {
  const { id: serviceId } =
    await params;

  if (!serviceId) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Service ID is required.",
      },
      { status: 400 }
    );
  }

  try {
    const packages =
      await prisma.servicePackage.findMany({
        where: {
          serviceId,
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          subCategories: {
            include: {
              subCategory: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      packages,
    });
  } catch (error) {
    console.error(
      "Fetch packages error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch packages.",
      },
      { status: 500 }
    );
  }
};