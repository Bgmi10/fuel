import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

type SessionInput = {
  name?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number | string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// GET all active slots
export async function GET() {
  try {
    const slots = await prisma.slot.findMany({
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
    console.error("GET /api/slot error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch slots",
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

    const sessions: SessionInput[] = Array.isArray(
      body.sessions
    )
      ? body.sessions
      : [];

    if (!branchId) {
      return NextResponse.json(
        {
          error: "Branch is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        {
          error: "Service is required",
        },
        {
          status: 400,
        }
      );
    }

    if (sessions.length === 0) {
      return NextResponse.json(
        {
          error: "At least one session is required",
        },
        {
          status: 400,
        }
      );
    }

    if (sessions.length > 20) {
      return NextResponse.json(
        {
          error: "A maximum of 20 sessions can be created at once",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedSessions = sessions.map(
      (session, index) => {
        const name =
          typeof session.name === "string"
            ? session.name.trim()
            : "";

        const startTime =
          typeof session.startTime === "string"
            ? session.startTime.trim()
            : "";

        const endTime =
          typeof session.endTime === "string"
            ? session.endTime.trim()
            : "";

        const capacity = Number(session.capacity);

        return {
          name: name || `Session ${index + 1}`,
          startTime,
          endTime,
          capacity,
        };
      }
    );

    for (
      let index = 0;
      index < normalizedSessions.length;
      index++
    ) {
      const session = normalizedSessions[index];

      if (
        !TIME_PATTERN.test(session.startTime) ||
        !TIME_PATTERN.test(session.endTime)
      ) {
        return NextResponse.json(
          {
            error: `Session ${
              index + 1
            } has an invalid time`,
          },
          {
            status: 400,
          }
        );
      }

      if (session.startTime >= session.endTime) {
        return NextResponse.json(
          {
            error: `Session ${
              index + 1
            } end time must be after start time`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isInteger(session.capacity) ||
        session.capacity <= 0
      ) {
        return NextResponse.json(
          {
            error: `Session ${
              index + 1
            } must have a valid maximum booking capacity`,
          },
          {
            status: 400,
          }
        );
      }
    }

    const branch = await prisma.branch.findUnique({
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
          error: "Branch not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * This also verifies that the selected service is assigned
     * to the selected branch.
     *
     * If your Service ↔ Branch relationship is not used for
     * access validation, replace this with service.findUnique().
     */
    const service = await prisma.service.findFirst({
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
          error:
            "The selected service is not available at this branch",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * prisma.$transaction ensures that either every session
     * is created or none of them are created.
     */
    const createdSlots = await prisma.$transaction(
      normalizedSessions.map((session) =>
        prisma.slot.create({
          data: {
            branchId,
            serviceId,
            name: session.name,
            startTime: session.startTime,
            endTime: session.endTime,
            capacity: session.capacity,
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
        message: `${createdSlots.length} ${
          createdSlots.length === 1
            ? "session"
            : "sessions"
        } created successfully`,

        createdCount: createdSlots.length,
        slots: createdSlots,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST /api/slot error:", error);

    return NextResponse.json(
      {
        error: "Failed to create sessions",
      },
      {
        status: 500,
      }
    );
  }
}