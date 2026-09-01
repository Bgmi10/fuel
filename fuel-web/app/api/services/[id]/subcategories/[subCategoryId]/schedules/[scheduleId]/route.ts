import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
    subCategoryId: string;
    scheduleId: string;
  }>;
};

/* =========================
   GET SINGLE SCHEDULE
========================= */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const {
    id: serviceId,
    subCategoryId,
    scheduleId,
  } = await params;

  try {
    const schedule =
      await prisma.serviceSchedule.findFirst({
        where: {
          id: scheduleId,
          subCategoryId,
          subCategory: {
            serviceId,
          },
        },
        include: {
          subCategory: {
            select: {
              id: true,
              name: true,
              serviceId: true,
            },
          },
        },
      });

    if (!schedule) {
      return NextResponse.json(
        {
          success: false,
          message: "Schedule not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      schedule,
    });
  } catch (error) {
    console.error(
      "Fetch schedule error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch schedule.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   UPDATE SCHEDULE
========================= */
export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  const {
    id: serviceId,
    subCategoryId,
    scheduleId,
  } = await params;

  try {
    /*
     * Make sure the schedule belongs to:
     * Service -> SubCategory -> Schedule
     */
    const existingSchedule =
      await prisma.serviceSchedule.findFirst({
        where: {
          id: scheduleId,
          subCategoryId,
          subCategory: {
            serviceId,
          },
        },
        select: {
          id: true,
        },
      });

    if (!existingSchedule) {
      return NextResponse.json(
        {
          success: false,
          message: "Schedule not found.",
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
        : null;

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

    if (sortOrder === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "sortOrder must be a positive or zero whole number.",
        },
        { status: 400 }
      );
    }

    const updatedSchedule =
      await prisma.serviceSchedule.update({
        where: {
          id: scheduleId,
        },
        data: {
          label,
          times,
          sortOrder,
        },
      });

    return NextResponse.json({
      success: true,
      schedule: updatedSchedule,
    });
  } catch (error) {
    console.error(
      "Update schedule error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update schedule.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE SCHEDULE
========================= */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  const {
    id: serviceId,
    subCategoryId,
    scheduleId,
  } = await params;

  try {
    /*
     * Verify ownership before deleting.
     */
    const existingSchedule =
      await prisma.serviceSchedule.findFirst({
        where: {
          id: scheduleId,
          subCategoryId,
          subCategory: {
            serviceId,
          },
        },
        select: {
          id: true,
        },
      });

    if (!existingSchedule) {
      return NextResponse.json(
        {
          success: false,
          message: "Schedule not found.",
        },
        { status: 404 }
      );
    }

    await prisma.serviceSchedule.delete({
      where: {
        id: scheduleId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Schedule deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete schedule error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete schedule.",
      },
      { status: 500 }
    );
  }
}
