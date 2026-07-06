import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

import {
  addDaysUTC,
  diffDaysUTC,
  toUTC,
} from "@/app/utils/date";

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          message: "Subscription not found",
        },
        { status: 404 }
      );
    }

    // 🔥 Must be frozen
    if (
      subscription.status !== "FROZEN" ||
      !subscription.freezeStart ||
      !subscription.freezeEnd
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Subscription is not frozen",
        },
        { status: 400 }
      );
    }

    // 🔥 UTC SAFE
    const freezeStart = toUTC(subscription.freezeStart);
    const freezeEnd = toUTC(subscription.freezeEnd);

    // 🔥 Exclusive freeze duration
    const freezeDays = diffDaysUTC(
      freezeStart,
      freezeEnd
    );

    // 🔥 Extend subscription
    const newEndDate = addDaysUTC(
      subscription.endDate,
      freezeDays
    );

    await prisma.subscription.update({
      where: { id },
      data: {
        status: "ACTIVE",

        // clear freeze
        freezeStart: null,
        freezeEnd: null,

        // extend membership
        endDate: newEndDate,
      },
    });

    return NextResponse.json({
      success: true,
      freezeDays,
      newEndDate,
    });
  } catch (e) {
    console.log(e);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
};