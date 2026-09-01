import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
    subCategoryId: string;
  }>;
};

/* =========================
   GET SCHEDULES
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
        select: {
          id: true,
          name: true,
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

    const schedules =
      await prisma.serviceSchedule.findMany({
        where: {
          subCategoryId,
        },
        orderBy: {
          sortOrder: "asc",
        },
      });

    return NextResponse.json({
      success: true,
      subCategory,
      schedules,
    });
  } catch (error) {
    console.error(
      "Fetch schedules error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch schedules.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE SCHEDULE
========================= */
export async function POST(
  req: NextRequest,
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
        select: {
          id: true,
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

    const body = await req.json();

    const label =
      typeof body.label === "string"
        ? body.label.trim()
        : "";

    const times = body.times;

    const sortOrder =
      Number.isInteger(Number(body.sortOrder)) &&
      Number(body.sortOrder) >= 0
        ? Number(body.sortOrder)
        : 0;

    if (!label) {
      return NextResponse.json(
        {
          success: false,
          message: "Schedule label is required.",
        },
        { status: 400 }
      );
    }

    if (
      times === undefined ||
      times === null ||
      !Array.isArray(times)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "times must be an array.",
        },
        { status: 400 }
      );
    }

    const schedule =
      await prisma.serviceSchedule.create({
        data: {
          subCategoryId,
          label,
          times,
          sortOrder,
        },
      });

    return NextResponse.json(
      {
        success: true,
        schedule,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create schedule error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create schedule.",
      },
      { status: 500 }
    );
  }
}
