import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
    subCategoryId: string;
  }>;
};

/* =========================
   GET SINGLE SUBCATEGORY
========================= */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const {
    id: serviceId,
    subCategoryId,
  } = await params;

  try {
    const subCategory =
      await prisma.serviceSubCategory.findFirst({
        where: {
          id: subCategoryId,
          serviceId,
        },
        include: {
          schedules: {
            orderBy: {
              sortOrder: "asc",
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    if (!subCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Subcategory not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      subCategory,
    });
  } catch (error) {
    console.error(
      "Fetch subcategory error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch subcategory.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   UPDATE SUBCATEGORY
========================= */
export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  const {
    id: serviceId,
    subCategoryId,
  } = await params;

  try {
    const existingSubCategory =
      await prisma.serviceSubCategory.findFirst({
        where: {
          id: subCategoryId,
          serviceId,
        },
        select: {
          id: true,
        },
      });

    if (!existingSubCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Subcategory not found.",
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
        : null;

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

    if (sortOrder === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "sortOrder must be a zero or positive whole number.",
        },
        { status: 400 }
      );
    }

    const updatedSubCategory =
      await prisma.serviceSubCategory.update({
        where: {
          id: subCategoryId,
        },
        data: {
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

    return NextResponse.json({
      success: true,
      subCategory: updatedSubCategory,
    });
  } catch (error) {
    console.error(
      "Update subcategory error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update subcategory.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE SUBCATEGORY
========================= */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  const {
    id: serviceId,
    subCategoryId,
  } = await params;

  try {
    const existingSubCategory =
      await prisma.serviceSubCategory.findFirst({
        where: {
          id: subCategoryId,
          serviceId,
        },
        select: {
          id: true,
        },
      });

    if (!existingSubCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Subcategory not found.",
        },
        { status: 404 }
      );
    }

    await prisma.serviceSubCategory.delete({
      where: {
        id: subCategoryId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subcategory deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete subcategory error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete subcategory.",
      },
      { status: 500 }
    );
  }
}
