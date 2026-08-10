import { prisma } from "@/prisma";
import { SlotWeekday } from "@prisma/client";
import { NextResponse } from "next/server";

type SessionInput = {
  name?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number | string;
};

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

  /*
   * Store the weekdays in normal
   * Monday-to-Sunday order.
   */
  return WEEKDAY_ORDER.filter((day) =>
    selectedDays.has(day)
  );
}

// GET all active slots
export async function GET() {
  try {
    const slots =
      await prisma.slot.findMany({
        where: {
          isActive: true,
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

        orderBy: [
          {
            createdAt: "desc",
          },
          {
            startTime: "asc",
          },
        ],
      });

    return NextResponse.json(slots);
  } catch (error) {
    console.error(
      "GET /api/slot error:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to fetch slots",
      },
      {
        status: 500,
      }
    );
  }
}

// CREATE multiple sessions
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const branchId =
      typeof body.branchId === "string"
        ? body.branchId.trim()
        : "";

    const serviceId =
      typeof body.serviceId === "string"
        ? body.serviceId.trim()
        : "";

    const daysOfWeek =
      normalizeWeekdays(
        body.daysOfWeek
      );

    const sessions: SessionInput[] =
      Array.isArray(body.sessions)
        ? body.sessions
        : [];

    if (!branchId) {
      return NextResponse.json(
        {
          message:
            "Branch is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        {
          message:
            "Service is required",
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

    if (sessions.length === 0) {
      return NextResponse.json(
        {
          message:
            "At least one session is required",
        },
        {
          status: 400,
        }
      );
    }

    if (sessions.length > 20) {
      return NextResponse.json(
        {
          message:
            "A maximum of 20 sessions can be created at once",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedSessions =
      sessions.map(
        (session, index) => {
          const name =
            typeof session.name ===
            "string"
              ? session.name.trim()
              : "";

          const startTime =
            typeof session.startTime ===
            "string"
              ? session.startTime.trim()
              : "";

          const endTime =
            typeof session.endTime ===
            "string"
              ? session.endTime.trim()
              : "";

          const capacity = Number(
            session.capacity
          );

          return {
            name:
              name ||
              `Session ${index + 1}`,

            startTime,
            endTime,
            capacity,
          };
        }
      );

    for (
      let index = 0;
      index <
      normalizedSessions.length;
      index += 1
    ) {
      const session =
        normalizedSessions[index];

      if (
        !TIME_PATTERN.test(
          session.startTime
        ) ||
        !TIME_PATTERN.test(
          session.endTime
        )
      ) {
        return NextResponse.json(
          {
            message: `Session ${
              index + 1
            } has an invalid time`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        session.startTime >=
        session.endTime
      ) {
        return NextResponse.json(
          {
            message: `Session ${
              index + 1
            } end time must be after start time`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isInteger(
          session.capacity
        ) ||
        session.capacity <= 0
      ) {
        return NextResponse.json(
          {
            message: `Session ${
              index + 1
            } must have a valid maximum booking capacity`,
          },
          {
            status: 400,
          }
        );
      }
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
          name: true,
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

    const createdSlots =
      await prisma.$transaction(
        normalizedSessions.map(
          (session) =>
            prisma.slot.create({
              data: {
                branchId,
                serviceId,

                name: session.name,

                startTime:
                  session.startTime,

                endTime:
                  session.endTime,

                capacity:
                  session.capacity,

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
            })
        )
      );

    return NextResponse.json(
      {
        message: `${
          createdSlots.length
        } ${
          createdSlots.length === 1
            ? "session"
            : "sessions"
        } created successfully`,

        createdCount:
          createdSlots.length,

        slots: createdSlots,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/slot error:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to create sessions",
      },
      {
        status: 500,
      }
    );
  }
}