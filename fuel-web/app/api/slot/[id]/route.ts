import { prisma } from "@/prisma";
import { SlotWeekday } from "@prisma/client";
import { NextResponse } from "next/server";

const TIME_PATTERN =
  /^([01]\d|2[0-3]):[0-5]\d$/;

const WEEKDAY_ORDER: SlotWeekday[] = [
  SlotWeekday.MONDAY,
  SlotWeekday.TUESDAY,
  SlotWeekday.WEDNESDAY,
  SlotWeekday.THURSDAY,
  SlotWeekday.FRIDAY,
  SlotWeekday.SATURDAY,
  SlotWeekday.SUNDAY,
];

const VALID_WEEKDAYS =
  new Set<SlotWeekday>(WEEKDAY_ORDER);

function normalizeWeekdays(
  value: unknown
): SlotWeekday[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0
  ) {
    return null;
  }

  const selectedDays =
    new Set<SlotWeekday>();

  for (const item of value) {
    if (
      typeof item !== "string" ||
      !VALID_WEEKDAYS.has(
        item as SlotWeekday
      )
    ) {
      return null;
    }

    selectedDays.add(
      item as SlotWeekday
    );
  }

  return WEEKDAY_ORDER.filter((day) =>
    selectedDays.has(day)
  );
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// GET one slot
export async function GET(
  _req: Request,
  { params }: RouteContext
) {
  const { id } = await params;

  try {
    const slot =
      await prisma.slot.findUnique({
        where: {
          id,
        },

        include: {
          branch: true,
          service: true,

          bookings: {
            include: {
              member: true,
              branch: true,

              package: {
                include: {
                  service: true,
                },
              },

              subscription: true,
            },

            orderBy: {
              bookingDate: "desc",
            },
          },

          _count: {
            select: {
              bookings: true,
            },
          },
        },
      });

    if (!slot) {
      return NextResponse.json(
        {
          message:
            "Slot not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(slot);
  } catch (error) {
    console.error(
      `GET /api/slot/${id} error:`,
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to fetch slot",
      },
      {
        status: 500,
      }
    );
  }
}

// UPDATE one slot
export async function PUT(
  req: Request,
  { params }: RouteContext
) {
  const { id } = await params;

  try {
    const body = await req.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const startTime =
      typeof body.startTime === "string"
        ? body.startTime.trim()
        : "";

    const endTime =
      typeof body.endTime === "string"
        ? body.endTime.trim()
        : "";

    const branchId =
      typeof body.branchId === "string"
        ? body.branchId.trim()
        : "";

    const serviceId =
      typeof body.serviceId === "string"
        ? body.serviceId.trim()
        : "";

    const capacity = Number(
      body.capacity
    );

    const daysOfWeek =
      normalizeWeekdays(
        body.daysOfWeek
      );

    if (
      !name ||
      !startTime ||
      !endTime ||
      !branchId ||
      !serviceId
    ) {
      return NextResponse.json(
        {
          message:
            "All slot fields are required",
        },
        {
          status: 400,
        }
      );
    }

    if (!daysOfWeek) {
      return NextResponse.json(
        {
          message:
            "Please select at least one valid operating day",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !TIME_PATTERN.test(startTime) ||
      !TIME_PATTERN.test(endTime)
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid start time or end time",
        },
        {
          status: 400,
        }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        {
          message:
            "End time must be after start time",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(capacity) ||
      capacity <= 0
    ) {
      return NextResponse.json(
        {
          message:
            "Maximum booking capacity must be greater than zero",
        },
        {
          status: 400,
        }
      );
    }

    const existingSlot =
      await prisma.slot.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
        },
      });

    if (!existingSlot) {
      return NextResponse.json(
        {
          message:
            "Slot not found",
        },
        {
          status: 404,
        }
      );
    }

    const branch =
      await prisma.branch.findUnique({
        where: {
          id: branchId,
        },

        select: {
          id: true,
        },
      });

    if (!branch) {
      return NextResponse.json(
        {
          message:
            "Branch not found",
        },
        {
          status: 404,
        }
      );
    }

    const service =
      await prisma.service.findFirst({
        where: {
          id: serviceId,

          branches: {
            some: {
              id: branchId,
            },
          },
        },

        select: {
          id: true,
        },
      });

    if (!service) {
      return NextResponse.json(
        {
          message:
            "The selected service is not available at this branch",
        },
        {
          status: 400,
        }
      );
    }

    const updatedSlot =
      await prisma.slot.update({
        where: {
          id,
        },

        data: {
          name,
          startTime,
          endTime,
          capacity,
          branchId,
          serviceId,
          daysOfWeek,
        },

        include: {
          branch: true,
          service: true,

          _count: {
            select: {
              bookings: true,
            },
          },
        },
      });

    return NextResponse.json({
      message:
        "Slot updated successfully",

      slot: updatedSlot,
    });
  } catch (error) {
    console.error(
      `PUT /api/slot/${id} error:`,
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to update slot",
      },
      {
        status: 500,
      }
    );
  }
}

// SOFT DELETE
export async function DELETE(
  _req: Request,
  { params }: RouteContext
) {
  const { id } = await params;

  try {
    const existingSlot =
      await prisma.slot.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          isActive: true,
        },
      });

    if (!existingSlot) {
      return NextResponse.json(
        {
          message:
            "Slot not found",
        },
        {
          status: 404,
        }
      );
    }

    if (!existingSlot.isActive) {
      return NextResponse.json({
        message:
          "Slot is already inactive",
      });
    }

    const deactivatedSlot =
      await prisma.slot.update({
        where: {
          id,
        },

        data: {
          isActive: false,
        },
      });

    return NextResponse.json({
      message:
        "Slot deactivated successfully",

      slot: deactivatedSlot,
    });
  } catch (error) {
    console.error(
      `DELETE /api/slot/${id} error:`,
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to deactivate slot",
      },
      {
        status: 500,
      }
    );
  }
}