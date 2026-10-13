import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: serviceId } = await params;

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("packageIds" in body) ||
      !Array.isArray(body.packageIds)
    ) {
      return NextResponse.json(
        { error: "packageIds must be an array of package IDs" },
        { status: 400 }
      );
    }

    const packageIds: unknown[] = body.packageIds;

    if (
      packageIds.some(
        (id) => typeof id !== "string" || id.trim().length === 0
      )
    ) {
      return NextResponse.json(
        { error: "Every package ID must be a non-empty string" },
        { status: 400 }
      );
    }

    const ids = packageIds as string[];

    if (new Set(ids).size !== ids.length) {
      return NextResponse.json(
        { error: "Duplicate package IDs are not allowed" },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const existingPackages = await tx.servicePackage.findMany({
        where: { serviceId },
        select: { id: true },
      });

      const existingIds = new Set(
        existingPackages.map((pkg) => pkg.id)
      );

      // Require the full package list for this service.
      // This prevents updating only part of the order accidentally.
      if (
        ids.length !== existingIds.size ||
        ids.some((id) => !existingIds.has(id))
      ) {
        throw new Error("INVALID_PACKAGE_ORDER");
      }

      // Move all packages to temporary negative positions first.
      // Then assign their final positions from 0 onwards.
      // Both steps run inside the same transaction.
      for (let index = 0; index < ids.length; index++) {
        await tx.servicePackage.update({
          where: { id: ids[index] },
          data: { sortOrder: -(index + 1) },
        });
      }

      for (let index = 0; index < ids.length; index++) {
        await tx.servicePackage.update({
          where: { id: ids[index] },
          data: { sortOrder: index },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Package order updated successfully",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_PACKAGE_ORDER"
    ) {
      return NextResponse.json(
        {
          error:
            "The package list is incomplete or contains packages from another service",
        },
        { status: 400 }
      );
    }

    console.error("Package reorder error:", error);

    return NextResponse.json(
      { error: "Failed to reorder packages" },
      { status: 500 }
    );
  }
}