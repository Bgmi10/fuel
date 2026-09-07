import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    const serviceIds = body.serviceIds;

    if (!Array.isArray(serviceIds)) {
      return NextResponse.json(
        {
          success: false,
          message: "serviceIds must be an array.",
        },
        { status: 400 }
      );
    }

    if (
      !serviceIds.every(
        (id): id is string =>
          typeof id === "string" && id.trim().length > 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid service IDs.",
        },
        { status: 400 }
      );
    }

    const uniqueIds = [...new Set(serviceIds)];

    if (uniqueIds.length !== serviceIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Duplicate service IDs are not allowed.",
        },
        { status: 400 }
      );
    }

    const existingServices = await prisma.service.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingServices.length !== uniqueIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more services were not found.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      serviceIds.map((serviceId, index) =>
        prisma.service.update({
          where: {
            id: serviceId,
          },
          data: {
            sortOrder: index,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: "Service order updated successfully.",
    });
  } catch (error) {
    console.error("Reorder services error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to reorder services.",
      },
      { status: 500 }
    );
  }
}