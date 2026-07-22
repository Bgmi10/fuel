import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/prisma";

const GYM_TIME_ZONE =
  "Asia/Kolkata";

class ScannerError extends Error {
  reason: string;
  status: number;
  details?: Record<
    string,
    unknown
  >;

  constructor({
    reason,
    message,
    status = 400,
    details,
  }: {
    reason: string;
    message: string;
    status?: number;

    details?: Record<
      string,
      unknown
    >;
  }) {
    super(message);

    this.name =
      "ScannerError";

    this.reason =
      reason;

    this.status =
      status;

    this.details =
      details;
  }
}

const getDateKey = (
  date: Date,
  timeZone: string
) => {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ]
      )
    );

  return (
    `${values.year}-` +
    `${values.month}-` +
    `${values.day}`
  );
};

const isTodayAtGym = (
  date: Date
) => {
  return (
    getDateKey(
      date,
      GYM_TIME_ZONE
    ) ===
    getDateKey(
      new Date(),
      GYM_TIME_ZONE
    )
  );
};

export async function POST(
  req: NextRequest
) {
  try {
    const body =
      await req.json();

    const bookingId =
      typeof body.bookingId ===
      "string"
        ? body.bookingId.trim()
        : "";

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,

          reason:
            "BOOKING_ID_REQUIRED",

          message:
            "Booking id is required.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const booking =
            await tx.slotBooking
              .findUnique({
                where: {
                  id: bookingId,
                },

                include: {
                  member: true,
                  slot: true,
                  package: true,
                  branch: true,
                  subscription:
                    true,
                },
              });

          if (!booking) {
            throw new ScannerError({
              reason:
                "NOT_FOUND",

              message:
                "Invalid QR Code.",

              status: 404,
            });
          }

          const now =
            new Date();

          // =========================================
          // BOOKING DATE
          // =========================================

          if (
            !isTodayAtGym(
              booking.bookingDate
            )
          ) {
            throw new ScannerError({
              reason:
                "INVALID_DATE",

              message:
                "Booking is not valid today.",
            });
          }

          // =========================================
          // MEMBER
          // =========================================

          if (
            booking.member.status ===
            "BLOCKED"
          ) {
            throw new ScannerError({
              reason:
                "BLOCKED",

              message:
                "Member account is blocked.",
            });
          }

          // =========================================
          // SUBSCRIPTION VALIDITY
          // =========================================

          const subscription =
            booking.subscription;

          if (
            subscription.status !==
            "ACTIVE"
          ) {
            throw new ScannerError({
              reason:
                "SUBSCRIPTION_INACTIVE",

              message:
                subscription.status ===
                "FROZEN"
                  ? "Membership is currently frozen."
                  : "Membership is not active.",
            });
          }

          if (
            subscription.startDate >
            now
          ) {
            throw new ScannerError({
              reason:
                "SUBSCRIPTION_NOT_STARTED",

              message:
                "Membership has not started yet.",
            });
          }

          if (
            subscription.endDate <
            now
          ) {
            throw new ScannerError({
              reason:
                "SUBSCRIPTION_EXPIRED",

              message:
                "Membership has expired.",
            });
          }

          // =========================================
          // BOOKING RELATION VALIDATION
          // =========================================

          if (
            booking.memberId !==
            subscription.memberId
          ) {
            throw new ScannerError({
              reason:
                "MEMBER_MISMATCH",

              message:
                "Booking does not belong to this membership.",
            });
          }

          if (
            booking.branchId !==
            subscription.branchId
          ) {
            throw new ScannerError({
              reason:
                "BRANCH_MISMATCH",

              message:
                "Booking is not valid for this branch.",
            });
          }

          if (
            booking.packageId !==
            subscription.packageId
          ) {
            throw new ScannerError({
              reason:
                "PACKAGE_MISMATCH",

              message:
                "Booking package does not match the membership.",
            });
          }

          if (
            booking.slot.serviceId !==
            booking.package.serviceId
          ) {
            throw new ScannerError({
              reason:
                "SERVICE_MISMATCH",

              message:
                "This membership cannot be used for the selected session.",
            });
          }

          // =========================================
          // FRIENDLY DUPLICATE CHECK
          // =========================================

          if (
            booking.status ===
              "ATTENDED" ||
            booking.checkedInAt !==
              null
          ) {
            throw new ScannerError({
              reason:
                "ALREADY_CHECKED_IN",

              message:
                "Session already verified.",

              status: 409,

              details: {
                checkedInAt:
                  booking.checkedInAt,
              },
            });
          }

          // =========================================
          // SESSION BALANCE PRE-CHECK
          // =========================================

          const isSessionBased =
            subscription.usageType ===
            "SESSION_BASED";

          if (
            isSessionBased &&
            subscription
              .remainingSessions ===
              null
          ) {
            throw new ScannerError({
              reason:
                "SESSION_BALANCE_NOT_CONFIGURED",

              message:
                "Session balance is not configured for this membership.",

              status: 500,
            });
          }

          if (
            isSessionBased &&
            Number(
              subscription
                .remainingSessions
            ) <= 0
          ) {
            throw new ScannerError({
              reason:
                "NO_SESSIONS_REMAINING",

              message:
                "No sessions remaining in this membership.",
            });
          }

          // =========================================
          // ATOMICALLY CLAIM THE BOOKING
          // =========================================

          /*
           * Two scanners may submit the same QR
           * at almost the same time.
           *
           * Only one request can change:
           * BOOKED + checkedInAt null
           * into ATTENDED.
           */
          const attendanceClaim =
            await tx.slotBooking
              .updateMany({
                where: {
                  id:
                    booking.id,

                  status:
                    "BOOKED",

                  checkedInAt:
                    null,
                },

                data: {
                  status:
                    "ATTENDED",

                  checkedInAt:
                    now,
                },
              });

          if (
            attendanceClaim.count ===
            0
          ) {
            throw new ScannerError({
              reason:
                "ALREADY_CHECKED_IN",

              message:
                "Session already verified.",

              status: 409,
            });
          }

          // =========================================
          // ATOMIC SESSION DEDUCTION
          // =========================================

          let sessionDeducted =
            false;

          if (isSessionBased) {
            /*
             * This update is atomic.
             *
             * With one session remaining and two
             * different QR scans arriving together,
             * only one request can decrement 1 → 0.
             */
            const deduction =
              await tx.subscription
                .updateMany({
                  where: {
                    id:
                      subscription.id,

                    status:
                      "ACTIVE",

                    remainingSessions:
                      {
                        gt: 0,
                      },
                  },

                  data: {
                    remainingSessions:
                      {
                        decrement: 1,
                      },
                  },
                });

            if (
              deduction.count === 0
            ) {
              /*
               * Throwing here rolls back the earlier
               * attendance claim as well.
               */
              throw new ScannerError({
                reason:
                  "NO_SESSIONS_REMAINING",

                message:
                  "No sessions remaining in this membership.",
              });
            }

            sessionDeducted =
              true;
          }

          // =========================================
          // FRESH RESULT
          // =========================================

          const updatedBooking =
            await tx.slotBooking
              .findUnique({
                where: {
                  id:
                    booking.id,
                },

                include: {
                  member: true,
                  slot: true,
                  package: true,
                  branch: true,
                  subscription:
                    true,
                },
              });

          if (!updatedBooking) {
            throw new ScannerError({
              reason:
                "BOOKING_REFRESH_FAILED",

              message:
                "Unable to refresh booking details.",

              status: 500,
            });
          }

          const updatedSubscription =
            updatedBooking.subscription;

          const totalSessions =
            updatedSubscription
              .totalSessions;

          const remainingSessions =
            updatedSubscription
              .remainingSessions;

          const usedSessions =
            totalSessions !== null &&
            remainingSessions !==
              null
              ? Math.max(
                  totalSessions -
                    remainingSessions,

                  0
                )
              : null;

          return {
            updatedBooking,

            sessionDeducted,

            totalSessions,
            remainingSessions,
            usedSessions,
          };
        }
      );

    const {
      updatedBooking,
      sessionDeducted,
      totalSessions,
      remainingSessions,
      usedSessions,
    } = result;

    return NextResponse.json({
      success: true,

      message:
        sessionDeducted
          ? "Session verified and one session deducted."
          : "Session verified successfully.",

      sessionDeducted,

      booking: {
        id:
          updatedBooking.id,

        bookingDate:
          updatedBooking
            .bookingDate,

        checkedInAt:
          updatedBooking
            .checkedInAt,

        status:
          updatedBooking.status,
      },

      member: {
        id:
          updatedBooking.member.id,

        name:
          updatedBooking
            .member.name,

        phone:
          updatedBooking
            .member.phone,

        email:
          updatedBooking
            .member.email,

        profileImage:
          updatedBooking
            .member.profileImage,
      },

      slot: {
        id:
          updatedBooking.slot.id,

        name:
          updatedBooking.slot.name,

        startTime:
          updatedBooking
            .slot.startTime,

        endTime:
          updatedBooking
            .slot.endTime,
      },

      package: {
        id:
          updatedBooking.package.id,

        name:
          updatedBooking
            .package.name,

        usageType:
          updatedBooking
            .package.usageType,

        totalSessions:
          updatedBooking
            .package.totalSessions,
      },

      subscription: {
        id:
          updatedBooking
            .subscription.id,

        usageType:
          updatedBooking
            .subscription
            .usageType,

        startDate:
          updatedBooking
            .subscription
            .startDate,

        endDate:
          updatedBooking
            .subscription
            .endDate,

        totalSessions,

        usedSessions,

        remainingSessions,
      },

      branch: {
        id:
          updatedBooking.branch.id,

        name:
          updatedBooking
            .branch.name,
      },
    });
  } catch (error) {
    if (
      error instanceof
      ScannerError
    ) {
      return NextResponse.json(
        {
          success: false,

          reason:
            error.reason,

          message:
            error.message,

          ...(error.details ||
            {}),
        },
        {
          status:
            error.status,
        }
      );
    }

    console.error(
      "QR verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        reason:
          "SERVER_ERROR",

        message:
          "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}