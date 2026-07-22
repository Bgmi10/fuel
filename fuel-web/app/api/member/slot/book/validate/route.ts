import {
  getMemberFromRequest,
} from "@/app/utils/memberAuth";

import { prisma } from "@/prisma";

import {
  Prisma,
  SlotBookingEnum,
} from "@prisma/client";

import {
  NextRequest,
  NextResponse,
} from "next/server";

const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

const TRANSACTION_MAX_WAIT_MS =
  10_000;

const TRANSACTION_TIMEOUT_MS =
  15_000;

class BookingError extends Error {
  code: string;

  constructor(
    code: string,
    message: string
  ) {
    super(message);

    this.name =
      "BookingError";

    this.code =
      code;
  }
}

const convertTimeToMinutes = (
  time: string
) => {
  const [
    hours,
    minutes,
  ] = time
    .split(":")
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
};

const doTimesOverlap = (
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string
) => {
  const firstStartMinutes =
    convertTimeToMinutes(
      firstStart
    );

  const firstEndMinutes =
    convertTimeToMinutes(
      firstEnd
    );

  const secondStartMinutes =
    convertTimeToMinutes(
      secondStart
    );

  const secondEndMinutes =
    convertTimeToMinutes(
      secondEnd
    );

  return (
    firstStartMinutes <
      secondEndMinutes &&
    firstEndMinutes >
      secondStartMinutes
  );
};

export async function POST(
  req: NextRequest
) {
  try {
    const member =
      await getMemberFromRequest(
        req
      );

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await req.json();

    const subscriptionId =
      typeof body.subscriptionId ===
      "string"
        ? body.subscriptionId.trim()
        : "";

    const slotId =
      typeof body.slotId ===
      "string"
        ? body.slotId.trim()
        : "";

    const rawBookingDate =
      typeof body.bookingDate ===
      "string"
        ? body.bookingDate.trim()
        : "";

    if (
      !subscriptionId ||
      !slotId ||
      !rawBookingDate
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Supports:
     * 2026-07-21
     * 2026-07-21T00:00:00.000Z
     */
    const bookingDay =
      rawBookingDate.split(
        "T"
      )[0];

    if (
      !DATE_PATTERN.test(
        bookingDay
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid booking date",
        },
        {
          status: 400,
        }
      );
    }

    const bookingDate =
      new Date(
        `${bookingDay}T00:00:00.000Z`
      );

    const bookingDayStart =
      new Date(
        `${bookingDay}T00:00:00.000Z`
      );

    const bookingDayEnd =
      new Date(
        `${bookingDay}T23:59:59.999Z`
      );

    if (
      Number.isNaN(
        bookingDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid booking date",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Read data that does not need to stay
     * locked before entering the interactive
     * transaction.
     */
    const [
      slot,
      subscription,
    ] = await Promise.all([
      prisma.slot.findFirst({
        where: {
          id:
            slotId,

          isActive:
            true,
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
      }),

      prisma.subscription
        .findFirst({
          where: {
            id:
              subscriptionId,

            memberId:
              member.id,

            status:
              "ACTIVE",

            startDate: {
              lte:
                bookingDayEnd,
            },

            endDate: {
              gte:
                bookingDayStart,
            },
          },

          select: {
            id: true,
            branchId: true,
            packageId: true,

            usageType:
              true,

            totalSessions:
              true,

            remainingSessions:
              true,

            package: {
              select: {
                id: true,
                name: true,
                serviceId: true,
              },
            },
          },
        }),
    ]);

    if (!slot) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Slot not found or is no longer active",
        },
        {
          status: 404,
        }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,

          error:
            "The selected membership is invalid or expired for this date",
        },
        {
          status: 400,
        }
      );
    }

    if (
      slot.branchId !==
      subscription.branchId
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "This slot is not available for your membership branch",
        },
        {
          status: 400,
        }
      );
    }

    if (
      slot.serviceId !==
      subscription.package
        .serviceId
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Your membership does not provide access to this service",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Booking does not deduct a session.
     * This prevents a member with zero balance
     * from creating an unusable booking.
     *
     * The QR scanner must still recheck the
     * balance and perform the actual deduction.
     */
    if (
      subscription.usageType ===
        "SESSION_BASED" &&
      (
        subscription
          .remainingSessions ===
          null ||
        subscription
          .remainingSessions <=
          0
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          reason:
            "NO_SESSIONS_REMAINING",

          error:
            "You do not have any sessions remaining.",
        },
        {
          status: 400,
        }
      );
    }

    const runBookingTransaction =
      () =>
        prisma.$transaction(
          async (tx) => {
            /*
             * Check this member's bookings
             * on the selected day.
             *
             * The new composite index below
             * makes this query much faster.
             */
            const existingBookings =
              await tx.slotBooking
                .findMany({
                  where: {
                    memberId:
                      member.id,

                    bookingDay,

                    status: {
                      in: [
                        SlotBookingEnum
                          .BOOKED,

                        SlotBookingEnum
                          .ATTENDED,
                      ],
                    },
                  },

                  select: {
                    id: true,
                    slotId: true,

                    slot: {
                      select: {
                        startTime:
                          true,

                        endTime:
                          true,
                      },
                    },
                  },
                });

            const conflictingBooking =
              existingBookings.find(
                (
                  existingBooking
                ) =>
                  doTimesOverlap(
                    slot.startTime,
                    slot.endTime,

                    existingBooking
                      .slot.startTime,

                    existingBooking
                      .slot.endTime
                  )
              );

            if (
              conflictingBooking
            ) {
              throw new BookingError(
                "BOOKING_TIME_CONFLICT",

                "You already have another booking during this time"
              );
            }

            /*
             * Count occupied positions for
             * this exact slot and day.
             *
             * The new slotId + bookingDay +
             * status index supports this.
             */
            const bookedCount =
              await tx.slotBooking
                .count({
                  where: {
                    slotId:
                      slot.id,

                    bookingDay,

                    status: {
                      in: [
                        SlotBookingEnum
                          .BOOKED,

                        SlotBookingEnum
                          .ATTENDED,
                      ],
                    },
                  },
                });

            if (
              bookedCount >=
              slot.capacity
            ) {
              throw new BookingError(
                "SLOT_CAPACITY_REACHED",

                "This slot is already full"
              );
            }

            return tx.slotBooking
              .create({
                data: {
                  memberId:
                    member.id,

                  subscriptionId:
                    subscription.id,

                  slotId:
                    slot.id,

                  bookingDay,
                  bookingDate,

                  branchId:
                    slot.branchId,

                  packageId:
                    subscription
                      .packageId,

                  status:
                    SlotBookingEnum
                      .BOOKED,
                },

                include: {
                  slot: {
                    include: {
                      service:
                        true,

                      branch:
                        true,
                    },
                  },

                  package:
                    true,

                  subscription:
                    true,
                },
              });
          },
          {
            isolationLevel:
              Prisma
                .TransactionIsolationLevel
                .Serializable,

            /*
             * Prisma's interactive transaction
             * defaults to a 5-second timeout.
             * The previous request reached 7.5s.
             */
            maxWait:
              TRANSACTION_MAX_WAIT_MS,

            timeout:
              TRANSACTION_TIMEOUT_MS,
          }
        );

    let booking;

    try {
      booking =
        await runBookingTransaction();
    } catch (error) {
      /*
       * Serializable transactions can conflict
       * when two members attempt the final place
       * simultaneously. Retry once with fresh data.
       */
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code ===
          "P2034"
      ) {
        booking =
          await runBookingTransaction();
      } else {
        throw error;
      }
    }

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
      "POST /api/member/slot/book error:",
      error
    );

    if (
      error instanceof
      BookingError
    ) {
      return NextResponse.json(
        {
          success: false,

          reason:
            error.code,

          error:
            error.message,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Unique constraint:
     * @@unique([
     *   memberId,
     *   slotId,
     *   bookingDate
     * ])
     */
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code ===
        "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "You have already booked this slot for the selected date",
        },
        {
          status: 409,
        }
      );
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code ===
        "P2034"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "The slot availability changed. Please try booking again",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * P2028 is the expired interactive
     * transaction error shown in the log.
     */
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code ===
        "P2028"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "The booking request took too long. Please try again.",
        },
        {
          status: 503,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,

        error:
          "Failed to create booking",
      },
      {
        status: 500,
      }
    );
  }
}