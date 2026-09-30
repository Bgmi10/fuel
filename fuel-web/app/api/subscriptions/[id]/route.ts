import { getUserFromRequest } from "@/app/utils/auth";
import { prisma } from "@/prisma";
import {
  NextRequest,
  NextResponse,
} from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateSubscriptionBody = {
  serviceId?: string;
  subCategoryId?: string | null;
  packageId?: string;
  branchId?: string;

  startDate?: string;
  endDate?: string;

  paymentMode?: string;

  additionalPayment?: number;

  notes?: string;
};

const allowedRoles = new Set([
  "ADMIN",
  "MANAGER",
]);

const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

function formatIndiaDate(date: Date) {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

function parseIndiaDate(
  value: unknown
): Date | null {
  if (
    typeof value !== "string" ||
    !DATE_PATTERN.test(value)
  ) {
    return null;
  }

  const parsedDate = new Date(
    `${value}T00:00:00.000+05:30`
  );

  if (
    Number.isNaN(parsedDate.getTime())
  ) {
    return null;
  }

  if (
    formatIndiaDate(parsedDate) !== value
  ) {
    return null;
  }

  return parsedDate;
}

/*
 * ============================================================
 * GET
 * ============================================================
 */

export const GET = async (
  _request: NextRequest,
  { params }: RouteContext
) => {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Subscription ID is required.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const subscription =
      await prisma.subscription.findUnique({
        where: {
          id,
        },

        include: {
          branch: true,

          subCategory: true,

          package: {
            include: {
              service: true,

              subCategories: {
                include: {
                  subCategory: true,
                },
              },
            },
          },

          invoice: {
            include: {
              payments: {
                orderBy: {
                  paidAt: "asc",
                },
              },
            },
          },
        },
      });

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Membership was not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error(
      "Get subscription error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load membership.",
      },
      {
        status: 500,
      }
    );
  }
};

/*
 * ============================================================
 * PUT
 * ============================================================
 */

export const PUT = async (
  request: NextRequest,
  { params }: RouteContext
) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Subscription ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const user =
      await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      !user.role ||
      !allowedRoles.has(user.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to edit memberships.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as UpdateSubscriptionBody;

    /*
     * ============================================================
     * VALIDATE DATES
     * ============================================================
     */

    const startDate =
      parseIndiaDate(
        body.startDate
      );

    const endDate =
      parseIndiaDate(
        body.endDate
      );

    if (!startDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid start date.",
        },
        {
          status: 400,
        }
      );
    }

    if (!endDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid end date.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      endDate.getTime() <
      startDate.getTime()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "End date cannot be before the start date.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * LOAD CURRENT SUBSCRIPTION
     * ============================================================
     */

    const currentSubscription =
      await prisma.subscription.findUnique({
        where: {
          id,
        },

        include: {
          member: true,

          package: {
            include: {
              service: true,
              subCategories: true,
            },
          },

          branch: true,

          subCategory: true,

          invoice: {
            include: {
              payments: true,
            },
          },
        },
      });

    if (!currentSubscription) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Membership was not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ============================================================
     * VALIDATE PACKAGE
     * ============================================================
     */

    const packageId =
      body.packageId ||
      currentSubscription.packageId;

    const selectedPackage =
      await prisma.servicePackage.findUnique(
        {
          where: {
            id: packageId,
          },

          include: {
            service: true,

            subCategories: true,
          },
        }
      );

    if (!selectedPackage) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected package was not found.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * VALIDATE SERVICE
     * ============================================================
     */

    const serviceId =
      body.serviceId ||
      selectedPackage.serviceId;

    if (
      selectedPackage.serviceId !==
      serviceId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected package does not belong to the selected service.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * VALIDATE SUB CATEGORY
     * ============================================================
     */

    const subCategoryId =
      body.subCategoryId ===
      undefined
        ? currentSubscription.subCategoryId
        : body.subCategoryId;

    if (subCategoryId) {
      const belongsToPackage =
        selectedPackage.subCategories.some(
          (item) =>
            item.subCategoryId ===
            subCategoryId
        );

      if (!belongsToPackage) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected sub-category is not available for this package.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * ============================================================
     * VALIDATE BRANCH
     * ============================================================
     */

    const branchId =
      body.branchId ||
      currentSubscription.branchId;

    const selectedBranch =
      await prisma.branch.findUnique({
        where: {
          id: branchId,
        },
      });

    if (!selectedBranch) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected branch was not found.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * PAYMENT
     * ============================================================
     */

    const requestedPayment = Math.max(
      0,
      Math.floor(
        Number(
          body.additionalPayment || 0
        )
      )
    );

    const existingInvoice =
      currentSubscription.invoice;

    const existingBalance =
      existingInvoice?.balanceAmount ||
      0;

    if (
      requestedPayment >
      existingBalance
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment cannot exceed the remaining invoice balance.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * STATUS
     * ============================================================
     */

    let updatedStatus =
      currentSubscription.status;

    if (
      currentSubscription.status !==
        "CANCELLED" &&
      currentSubscription.status !==
        "FROZEN"
    ) {
      const today =
        parseIndiaDate(
          formatIndiaDate(
            new Date()
          )
        );

      if (!today) {
        throw new Error(
          "Unable to calculate current date."
        );
      }

      updatedStatus =
        endDate.getTime() <
        today.getTime()
          ? "EXPIRED"
          : "ACTIVE";
    }

    /*
     * ============================================================
     * TRANSACTION
     * ============================================================
     */

    const result =
      await prisma.$transaction(
        async (tx) => {
          /*
           * UPDATE SUBSCRIPTION
           */

          const updatedSubscription =
            await tx.subscription.update({
              where: {
                id,
              },

              data: {
                branchId,

                packageId,

                subCategoryId,

                serviceName:
                  selectedPackage
                    .service.name,

                packageName:
                  selectedPackage.name,

                packageDurationInDays:
                  selectedPackage.durationInDays,

                originalPrice:
                  selectedPackage.originalPrice,

                finalPrice:
                  selectedPackage.price,

                branchName:
                  selectedBranch.name,

                usageType:
                  selectedPackage.usageType,

                totalSessions:
                  selectedPackage.totalSessions,

                /*
                 * If changing package,
                 * session balance should be
                 * initialized from the new package.
                 *
                 * If the package remains same,
                 * preserve existing balance.
                 */

                remainingSessions:
                  packageId ===
                  currentSubscription.packageId
                    ? currentSubscription.remainingSessions
                    : selectedPackage.usageType ===
                        "SESSION_BASED"
                      ? selectedPackage.totalSessions
                      : null,

                startDate,

                endDate,

                status:
                  updatedStatus,
              },
            });

          /*
           * ======================================================
           * NO INVOICE
           *
           * Normally this should not happen for a membership,
           * but don't crash if old data has no invoice.
           * ======================================================
           */

          if (!existingInvoice) {
            if (
              requestedPayment > 0
            ) {
              throw new Error(
                "This membership has no invoice, so a payment cannot be added."
              );
            }

            return updatedSubscription;
          }

          /*
           * ======================================================
           * UPDATE INVOICE MEMBERSHIP SNAPSHOT
           *
           * We preserve the original invoice amount here.
           * Changing package on an existing membership should
           * NOT silently rewrite historical billing.
           *
           * If you want package changes to recalculate invoice,
           * that should be a separate upgrade/downgrade flow.
           * ======================================================
           */

          if (
            requestedPayment >
            0
          ) {
            const newPaidAmount =
              existingInvoice.paidAmount +
              requestedPayment;

            const newBalanceAmount =
              Math.max(
                existingInvoice.finalAmount -
                  newPaidAmount,
                0
              );

            const invoiceStatus =
              newPaidAmount <= 0
                ? "PENDING"
                : newBalanceAmount <= 0
                  ? "FULLY_PAID"
                  : "PARTIAL_PAID";

            await tx.invoice.update(
              {
                where: {
                  id: existingInvoice.id,
                },

                data: {
                  paidAmount:
                    newPaidAmount,

                  balanceAmount:
                    newBalanceAmount,

                  status:
                    invoiceStatus,

                  notes:
                    body.notes ||
                    existingInvoice.notes,
                },
              }
            );

            /*
             * ====================================================
             * CREATE NEW PAYMENT
             * ====================================================
             */

            await tx.payment.create({
              data: {
                receiptNumber:
                  `REC-${Date.now()}-${Math.floor(
                    Math.random() * 10000
                  )}`,

                invoiceId:
                  existingInvoice.id,

                memberId:
                  currentSubscription.memberId,

                amount:
                  requestedPayment,

                paymentMode:
                  body.paymentMode ||
                  "Cash",

                paymentType:
                  "BALANCE",

                status:
                  "PAID",

                notes:
                  body.notes ||
                  null,
              },
            });
          } else if (
            body.notes
          ) {
            await tx.invoice.update(
              {
                where: {
                  id: existingInvoice.id,
                },

                data: {
                  notes:
                    body.notes,
                },
              }
            );
          }

          return updatedSubscription;
        }
      );

    /*
     * ============================================================
     * RETURN FRESH DATA
     * ============================================================
     */

    const freshSubscription =
      await prisma.subscription.findUnique(
        {
          where: {
            id,
          },

          include: {
            branch: true,

            subCategory: true,

            package: {
              include: {
                service: true,

                subCategories: {
                  include: {
                    subCategory: true,
                  },
                },
              },
            },

            invoice: {
              include: {
                payments: {
                  orderBy: {
                    paidAt: "asc",
                  },
                },
              },
            },
          },
        }
      );

    return NextResponse.json({
      success: true,

      message:
        requestedPayment > 0
          ? "Membership and payment updated successfully."
          : "Membership updated successfully.",

      subscription:
        freshSubscription,

      paymentAdded:
        requestedPayment,
    });
  } catch (error) {
    console.error(
      "Update subscription error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to update membership.",
      },
      {
        status: 500,
      }
    );
  }
};
