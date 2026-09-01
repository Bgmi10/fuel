import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================
   GET SUBCATEGORIES
========================= */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const { id: serviceId } = await params;

  try {
    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
      select: {
        id: true,
        name: true,
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

    const subCategories =
      await prisma.serviceSubCategory.findMany({
        where: {
          serviceId,
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
      });

    return NextResponse.json({
      success: true,
      service,
      subCategories,
    });
  } catch (error) {
    console.error(
      "Fetch subcategories error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch subcategories.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE SUBCATEGORY
========================= */
export async function POST(
  req: NextRequest,
  { params }: Params
) {
  const { id: serviceId } = await params;

  try {
    const service = await prisma.service.findUnique({
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

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;

    const image =
      typeof body.image === "string"
        ? body.image.trim()
        : null;

    const sortOrder =
      Number.isInteger(Number(body.sortOrder)) &&
      Number(body.sortOrder) >= 0
        ? Number(body.sortOrder)
        : 0;

    const isActive =
      body.isActive === undefined
        ? true
        : Boolean(body.isActive);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Subcategory name is required.",
        },
        { status: 400 }
      );
    }

    const subCategory =
      await prisma.serviceSubCategory.create({
        data: {
          serviceId,
          name,
          description: description || null,
          image: image || null,
          sortOrder,
          isActive,
        },
        include: {
          schedules: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        subCategory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create subcategory error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create subcategory.",
      },
      { status: 500 }
    );
  }
}
