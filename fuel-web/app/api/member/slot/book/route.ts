import { getMemberFromRequest } from "@/app/utils/memberAuth";
import { prisma } from "@/prisma";
import {
  Prisma,
  SlotBookingEnum,
} from "@prisma/client";
import {
  NextRequest,
  NextResponse,
} from "next/server";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const convertTimeToMinutes = (time: string) => {
  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
};

const doTimesOverlap = (
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string
) => {
  const firstStartMinutes =
    convertTimeToMinutes(firstStart);

  const firstEndMinutes =
    convertTimeToMinutes(firstEnd);

  const secondStartMinutes =
    convertTimeToMinutes(secondStart);

  const secondEndMinutes =
    convertTimeToMinutes(secondEnd);

  return (
    firstStartMinutes < secondEndMinutes &&
    firstEndMinutes > secondStartMinutes
  );
};

export async function POST(
  req: NextRequest
) {
  try {
    const member =
      await getMemberFromRequest(req);

    if (!member) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body = await req.json();

    const subscriptionId =
      typeof body.subscriptionId === "string"
        ? body.subscriptionId.trim()
        : "";

    const slotId =
      typeof body.slotId === "string"
        ? body.slotId.trim()
        : "";

    const rawBookingDate =
      typeof body.bookingDate === "string"
        ? body.bookingDate.trim()
        : "";

    if (
      !subscriptionId ||
      !slotId ||
      !rawBookingDate
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Supports both:
     * 2026-07-16
     * 2026-07-16T00:00:00.000Z
     */
    const bookingDay =
      rawBookingDate.split("T")[0];

    if (!DATE_PATTERN.test(bookingDay)) {
      return NextResponse.json(
        {
          error: "Invalid booking date",
        },
        {
          status: 400,
        }
      );
    }

    const bookingDate = new Date(
      `${bookingDay}T00:00:00.000Z`
    );

    const bookingDayStart = new Date(
      `${bookingDay}T00:00:00.000Z`
    );

    const bookingDayEnd = new Date(
      `${bookingDay}T23:59:59.999Z`
    );

    if (
      Number.isNaN(bookingDate.getTime())
    ) {
      return NextResponse.json(
        {
          error: "Invalid booking date",
        },
        {
          status: 400,
        }
      );
    }

    // Find the selected slot first
    const slot = await prisma.slot.findFirst({
      where: {
        id: slotId,
        isActive: true,
      },

      select: {
        id: true,
        branchId: true,
        serviceId: true,
        startTime: true,
        endTime: true,
        capacity: true,

        branch: {
          select: {
            id: true,
            name: true,
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

    if (!slot) {
      return NextResponse.json(
        {
          error:
            "Slot not found or is no longer active",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * The subscription must:
     * - Belong to this member
     * - Be active
     * - Be valid on the selected booking date
     * - Include its package's service
     */
    const subscription =
      await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          memberId: member.id,
          status: "ACTIVE",

          startDate: {
            lte: bookingDayEnd,
          },

          endDate: {
            gte: bookingDayStart,
          },
        },

        select: {
          id: true,
          branchId: true,
          packageId: true,

          package: {
            select: {
              id: true,
              name: true,
              serviceId: true,
            },
          },
        },
      });

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "The selected membership is invalid or expired for this date",
        },
        {
          status: 400,
        }
      );
    }

    // Validate the branch
    if (
      slot.branchId !==
      subscription.branchId
    ) {
      return NextResponse.json(
        {
          error:
            "This slot is not available for your membership branch",
        },
        {
          status: 400,
        }
      );
    }

    // Validate service access through the package
    if (
      slot.serviceId !==
      subscription.package.serviceId
    ) {
      return NextResponse.json(
        {
          error:
            "Your membership does not provide access to this service",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Serializable transaction helps prevent two members
     * from taking the final available spot simultaneously.
     */
    const booking =
      await prisma.$transaction(
        async (tx) => {
          // Check all the member's bookings on that day
          const existingBookings =
            await tx.slotBooking.findMany({
              where: {
                memberId: member.id,
                bookingDay,

                status: {
                  in: [
                    SlotBookingEnum.BOOKED,
                    SlotBookingEnum.ATTENDED,
                  ],
                },
              },

              select: {
                id: true,
                slotId: true,

                slot: {
                  select: {
                    startTime: true,
                    endTime: true,
                  },
                },
              },
            });

          const conflictingBooking =
            existingBookings.find(
              (existingBooking) =>
                doTimesOverlap(
                  slot.startTime,
                  slot.endTime,
                  existingBooking.slot
                    .startTime,
                  existingBooking.slot.endTime
                )
            );

          if (conflictingBooking) {
            throw new Error(
              "BOOKING_TIME_CONFLICT"
            );
          }

          // Count bookings for this slot and date
          const bookedCount =
            await tx.slotBooking.count({
              where: {
                slotId: slot.id,
                bookingDay,

                status: {
                  in: [
                    SlotBookingEnum.BOOKED,
                    SlotBookingEnum.ATTENDED,
                  ],
                },
              },
            });

          if (
            bookedCount >= slot.capacity
          ) {
            throw new Error(
              "SLOT_CAPACITY_REACHED"
            );
          }

          return tx.slotBooking.create({
            data: {
              memberId: member.id,

              subscriptionId:
                subscription.id,

              slotId: slot.id,

              bookingDay,
              bookingDate,

              // Derive these on the server
              branchId: slot.branchId,

              packageId:
                subscription.packageId,

              status:
                SlotBookingEnum.BOOKED,
            },

            include: {
              slot: {
                include: {
                  service: true,
                  branch: true,
                },
              },

              package: true,
              subscription: true,
            },
          });
        },
        {
          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
              timeout: 20000
        }
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Slot booked successfully",
        booking,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/slot/book error:",
      error
    );

    if (
      error instanceof Error &&
      error.message ===
        "BOOKING_TIME_CONFLICT"
    ) {
      return NextResponse.json(
        {
          error:
            "You already have another booking during this time",
        },
        {
          status: 409,
        }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "SLOT_CAPACITY_REACHED"
    ) {
      return NextResponse.json(
        {
          error:
            "This slot is already full",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Unique constraint:
     * @@unique([memberId, slotId, bookingDate])
     */
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "You have already booked this slot for the selected date",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * A serializable transaction may fail when two
     * bookings happen at exactly the same time.
     */
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          error:
            "The slot availability changed. Please try booking again",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to create booking",
      },
      {
        status: 500,
      }
    );
  }
}