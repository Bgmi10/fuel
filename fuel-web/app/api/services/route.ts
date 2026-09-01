import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

/* =========================
   CREATE SERVICE
========================= */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const branchIds = Array.isArray(body.branchIds)
      ? body.branchIds
      : [];

    const thumbnailImage =
      typeof body.thumbnailImage === "string"
        ? body.thumbnailImage.trim() || null
        : null;

    const coverImage =
      typeof body.coverImage === "string"
        ? body.coverImage.trim() || null
        : null;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Service name is required.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(branchIds)) {
      return NextResponse.json(
        {
          success: false,
          message: "branchIds must be an array.",
        },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        name,
        thumbnailImage,
        coverImage,

        branches: {
          connect: branchIds.map((id: string) => ({
            id,
          })),
        },
      },

      include: {
        branches: true,

        websiteContent: true,

        subCategories: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            schedules: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },

        packages: {
          include: {
            coupons: {
              where: {
                isPrivate: false,
                isActive: true,
                OR: [
                  {
                    expiresAt: null,
                  },
                  {
                    expiresAt: {
                      gte: new Date(),
                    },
                  },
                ],
              },
            },
          },
        },

        _count: {
          select: {
            packages: true,
            subCategories: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: service,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create service error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create service.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   GET SERVICES
========================= */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");

  try {
    const services = await prisma.service.findMany({
      where: branchId
        ? {
            branches: {
              some: {
                id: branchId,
              },
            },
          }
        : undefined,

      include: {
        branches: true,

        websiteContent: true,

        subCategories: {
          where: {
            isActive: true,
          },

          orderBy: {
            sortOrder: "asc",
          },

          include: {
            schedules: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },

        packages: {
          include: {
            coupons: {
              where: {
                isPrivate: false,
                isActive: true,
                OR: [
                  {
                    expiresAt: null,
                  },
                  {
                    expiresAt: {
                      gte: new Date(),
                    },
                  },
                ],
              },
            },
          },
        },

        _count: {
          select: {
            packages: true,
            subCategories: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      services,
    });
  } catch (error) {
    console.error("Fetch services error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch services.",
      },
      { status: 500 }
    );
  }
}
