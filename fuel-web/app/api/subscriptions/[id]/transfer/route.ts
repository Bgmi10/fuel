// app/api/subscriptions/[id]/transfer/route.ts
//
// Manual transfers (CASH / UPI / CARD).
// Behaviour is unchanged: the transfer itself now lives in
// executeMembershipTransfer so Razorpay uses the exact same logic.

import { getUserFromRequest } from "@/app/utils/auth";
import {
  TransferError,
  allowedTransferRoles,
  executeMembershipTransfer,
  toPaise,
} from "@/app/utils/membership-transfer";
import { prisma } from "@/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type RequestBody = {
  toMemberId?: string;
  paymentMode?: string;
  /** RUPEES, as entered in the transfer modal. Converted to paise below. */
  paidAmount?: number;
  notes?: string;
  reason?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: subscriptionId } = await context.params;

    const user = await getUserFromRequest(request);

    if (!user?.id) {
      throw new TransferError(
        "You must be logged in to transfer a membership.",
        401
      );
    }

    if (user.role && !allowedTransferRoles.has(user.role)) {
      throw new TransferError(
        "You do not have permission to transfer memberships.",
        403
      );
    }

    if (!subscriptionId) {
      throw new TransferError("Subscription ID is required.");
    }

    const body = (await request.json()) as RequestBody;

    const toMemberId = body.toMemberId?.trim();

    const reason = body.reason?.trim();

    if (!toMemberId) {
      throw new TransferError("Please select the receiving member.");
    }

    if (!reason) {
      throw new TransferError("Please enter the reason for the transfer.");
    }

    // Amount collected: rupees from the modal -> paise for the DB.
    const amountCollectedPaise =
      typeof body.paidAmount === "number" &&
      Number.isFinite(body.paidAmount) &&
      body.paidAmount >= 0
        ? toPaise(body.paidAmount)
        : null;

    const result = await prisma.$transaction(
      (tx) =>
        executeMembershipTransfer(tx, {
          subscriptionId,
          toMemberId,
          reason,
          notes: body.notes,
          paymentMode: body.paymentMode,
          amountCollectedPaise,
          transferredById: user.id,
        }),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,

        timeout: 20_000,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Membership transferred successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Membership transfer failed:", error);

    if (error instanceof TransferError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: error.status,
        }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The membership was changed by another request. Please refresh and try again.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to transfer the membership. No records were changed.",
      },
      {
        status: 500,
      }
    );
  }
}