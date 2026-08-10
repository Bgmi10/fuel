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
  startDate?: string;
  endDate?: string;
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

  /*
   * Prevent invalid normalized dates such as
   * 2026-02-31 becoming a March date.
   */
  if (
    formatIndiaDate(parsedDate) !== value
  ) {
    return null;
  }

  return parsedDate;
}

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
          invoice: {
            include: {
              payments: true,
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

    const startDate = parseIndiaDate(
      body.startDate
    );

    const endDate = parseIndiaDate(
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

    const currentSubscription =
      await prisma.subscription.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          status: true,
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
     * Preserve CANCELLED and FROZEN states.
     *
     * ACTIVE/EXPIRED is recalculated using
     * the newly selected end date.
     */
    let updatedStatus =
      currentSubscription.status;

    if (
      currentSubscription.status !==
        "CANCELLED" &&
      currentSubscription.status !==
        "FROZEN"
    ) {
      const today = parseIndiaDate(
        formatIndiaDate(new Date())
      );

      if (!today) {
        throw new Error(
          "Unable to calculate the current date."
        );
      }

      updatedStatus =
        endDate.getTime() <
        today.getTime()
          ? "EXPIRED"
          : "ACTIVE";
    }

    const updatedSubscription =
      await prisma.subscription.update({
        where: {
          id,
        },

        data: {
          startDate,
          endDate,
          status: updatedStatus,
        },

        include: {
          invoice: {
            include: {
              payments: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Membership dates updated successfully.",
      subscription:
        updatedSubscription,
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
          "Unable to update membership.",
      },
      {
        status: 500,
      }
    );
  }
};