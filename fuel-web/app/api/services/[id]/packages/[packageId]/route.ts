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

export const PUT = async (
  req: NextRequest,
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

    const updatedPackage =
      await prisma.servicePackage.update({
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