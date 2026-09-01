import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================
   GET SERVICE
========================= */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const { id } = await params;

  try {
    const service = await prisma.service.findUnique({
      where: {
        id,
      },
      include: {
        branches: true,

        websiteContent: true,

        subCategories: {
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
          include: {
            schedules: {
              orderBy: [
                {
                  sortOrder: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
            },
          },
        },

        packages: {
          include: {
            coupons: {
              where: {
                isPrivate: false,
                isActive: true,
                expiresAt: {
                  gte: new Date(),
                },
              },
            },
            _count: {
              select: {
                subscriptions: true,
                slotBookings: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        slots: {
          include: {
            branch: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        _count: {
          select: {
            packages: true,
            subCategories: true,
            slots: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      service,
    });
  } catch (error) {
    console.error(
      "Fetch service error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch service.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   UPDATE SERVICE
========================= */
export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  const { id } = await params;

  try {
    const existingService =
      await prisma.service.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
        },
      });

    if (!existingService) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    const body = await req.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const thumbnailImage =
      typeof body.thumbnailImage === "string"
        ? body.thumbnailImage.trim() || null
        : body.thumbnailImage === null
          ? null
          : undefined;

    const coverImage =
      typeof body.coverImage === "string"
        ? body.coverImage.trim() || null
        : body.coverImage === null
          ? null
          : undefined;

    const branchIds = body.branchIds;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Service name is required.",
        },
        { status: 400 }
      );
    }

    if (
      branchIds !== undefined &&
      !Array.isArray(branchIds)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "branchIds must be an array.",
        },
        { status: 400 }
      );
    }

    const cleanedBranchIds =
      Array.isArray(branchIds)
        ? branchIds
            .filter(
              (branchId): branchId is string =>
                typeof branchId === "string" &&
                branchId.trim().length > 0
            )
            .map((branchId) => branchId.trim())
        : undefined;

    if (
      cleanedBranchIds !== undefined &&
      cleanedBranchIds.length > 0
    ) {
      const branches =
        await prisma.branch.findMany({
          where: {
            id: {
              in: cleanedBranchIds,
            },
          },
          select: {
            id: true,
          },
        });

      if (
        branches.length !==
        new Set(cleanedBranchIds).size
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more branch IDs are invalid.",
          },
          { status: 400 }
        );
      }
    }

    const updatedService =
      await prisma.service.update({
        where: {
          id,
        },
        data: {
          name,

          ...(thumbnailImage !== undefined && {
            thumbnailImage,
          }),

          ...(coverImage !== undefined && {
            coverImage,
          }),

          ...(cleanedBranchIds !== undefined && {
            branches: {
              set: cleanedBranchIds.map(
                (branchId) => ({
                  id: branchId,
                })
              ),
            },
          }),
        },

        include: {
          branches: true,
          websiteContent: true,
        },
      });

    return NextResponse.json({
      success: true,
      message: "Service updated successfully.",
      service: updatedService,
    });
  } catch (error) {
    console.error(
      "Update service error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update service.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE SERVICE
========================= */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  const { id } = await params;

  try {
    const existingService =
      await prisma.service.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
        },
      });

    if (!existingService) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    await prisma.service.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete service error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to delete service. It may still be referenced by packages or slots.",
      },
      { status: 409 }
    );
  }
}
