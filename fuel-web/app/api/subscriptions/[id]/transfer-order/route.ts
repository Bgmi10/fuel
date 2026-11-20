// app/api/subscriptions/[id]/transfer-order/route.ts
//
// POST -> validate (same rules as the manual transfer), recalculate the
//         fee on the server, create the Razorpay order + TRANSFER_FEE
//         invoice + pending Payment row.
// GET  -> status polling for the transfer billing page.
//
// The actual transfer happens in the Razorpay webhook, using
// executeMembershipTransfer (same logic as the manual route).

import { getUserFromRequest } from "@/app/utils/auth";
import {
  TransferError,
  allowedTransferRoles,
  toPaise,
} from "@/app/utils/membership-transfer";
import { calculateMembershipTransferQuote } from "@/src/lib/membership-transfer-fee";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

const rp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Razorpay minimum order amount is 1 INR = 100 paise.
const RAZORPAY_MIN_PAISE = 100;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RequestBody = {
  toMemberId?: string;
  reason?: string;
  notes?: string | null;
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

    // ---------------------------------------------------------
    // SAME VALIDATION AS THE MANUAL TRANSFER
    // ---------------------------------------------------------

    const subscription = await prisma.subscription.findUnique({
      where: {
        id: subscriptionId,
      },

      select: {
        id: true,
        memberId: true,
        status: true,
        branchId: true,
        packageId: true,
        subCategoryId: true,
        serviceName: true,
        packageName: true,
        packageDurationInDays: true,
        branchName: true,

        member: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new TransferError("Subscription was not found.", 404);
    }

    if (subscription.status !== "ACTIVE" && subscription.status !== "FROZEN") {
      throw new TransferError(
        "Only active or frozen memberships can be transferred."
      );
    }

    if (subscription.memberId === toMemberId) {
      throw new TransferError(
        "The membership already belongs to the selected member."
      );
    }

    const receivingMember = await prisma.member.findUnique({
      where: {
        id: toMemberId,
      },

      select: {
        id: true,
        status: true,
      },
    });

    if (!receivingMember) {
      throw new TransferError("The receiving member was not found.", 404);
    }

    if (receivingMember.status !== "ACTIVE") {
      throw new TransferError("A blocked member cannot receive a membership.");
    }

    // ---------------------------------------------------------
    // FEE (server side, RUPEES -> PAISE)
    // ---------------------------------------------------------

    let quote;

    try {
      quote = await prisma.$transaction((tx) =>
        calculateMembershipTransferQuote(subscriptionId, tx)
      );
    } catch (error) {
      throw new TransferError(
        error instanceof Error
          ? error.message
          : "Unable to calculate the membership transfer fee."
      );
    }

    const totalPaise = toPaise(quote.transferFee);

    const basePaise = toPaise(quote.baseTransferFee);

    const cgstPaise = toPaise(quote.cgstAmount);

    const sgstPaise = toPaise(quote.sgstAmount);

    // Keep base + tax === total exactly (rounding safe)
    const taxPaise = totalPaise - basePaise;

    if (totalPaise < RAZORPAY_MIN_PAISE) {
      throw new TransferError(
        "The transfer fee is too low to be paid through Razorpay. Please use another payment method."
      );
    }

    // ---------------------------------------------------------
    // RAZORPAY ORDER
    // ---------------------------------------------------------

    const order = await rp.orders.create({
      amount: totalPaise,
      currency: "INR",
      receipt: `xfer_${Date.now()}`,

      notes: {
        purchaseType: "TRANSFER",
        subscriptionId,
        toMemberId,
      },
    });

    // ---------------------------------------------------------
    // SNAPSHOT: everything the webhook needs to perform the
    // transfer. The fee is the amount the customer actually
    // pays (the slab can change with remaining days later).
    // ---------------------------------------------------------

    const metadata = {
      purchaseType: "TRANSFER",
      subscriptionId,
      toMemberId,
      reason,
      transferNotes: body.notes?.trim() || null,
      transferredById: user.id,
      quote,
    };

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${Date.now()}`,

        // The payer is the member who currently owns the membership.
        memberId: subscription.memberId,

        branchId: subscription.branchId,

        packageId: subscription.packageId,

        subCategoryId: subscription.subCategoryId,

        linkedSubscriptionId: subscription.id,

        salesRepId: user.id,

        salesRepName: user.name ?? null,

        intent: "TRANSFER_FEE",

        serviceName: subscription.serviceName,

        packageName: subscription.packageName,

        packageDurationInDays: subscription.packageDurationInDays,

        branchName: subscription.branchName,

        memberName: subscription.member.name,

        memberPhone: subscription.member.phone,

        memberEmail: subscription.member.email,

        // finalAmount + totalTax === Razorpay amount (paise)
        packageAmount: basePaise,

        discountAmount: 0,

        finalAmount: basePaise,

        cgstPercentage: quote.cgstPercentage,

        sgstPercentage: quote.sgstPercentage,

        cgstAmount: cgstPaise,

        sgstAmount: sgstPaise,

        totalTax: taxPaise,

        paidAmount: 0,

        balanceAmount: totalPaise,

        status: "PENDING",

        notes: "Membership transfer fee",
      },
    });

    await prisma.payment.create({
      data: {
        receiptNumber: `RCPT-XFER-${Date.now()}`,

        invoiceId: invoice.id,

        memberId: subscription.memberId,

        amount: totalPaise,

        paymentMode: "Razorpay",

        paymentType: "TRANSFER",

        // Same convention as the subscribe flow: FAILED until the
        // webhook confirms the capture.
        status: "FAILED",

        razorpayOrderId: order.id,

        notes: JSON.stringify(metadata),
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: totalPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Transfer order failed:", error);

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

    return NextResponse.json(
      {
        success: false,
        message: "Unable to start the transfer payment.",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * Polling endpoint: GET ?orderId=order_xxx
 *
 * Returns:
 *   status       payment status (FAILED = not paid yet, PAID = captured)
 *   transferred  true once the membership has actually been transferred
 *   error        set when the money was captured but the transfer could
 *                not be completed (needs manual refund / review)
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json(
      {
        success: false,
        message: "orderId is required.",
      },
      {
        status: 400,
      }
    );
  }

  const payment = await prisma.payment.findFirst({
    where: {
      razorpayOrderId: orderId,
      paymentType: "TRANSFER",
    },

    select: {
      status: true,
      invoiceId: true,
      notes: true,
    },
  });

  if (!payment) {
    return NextResponse.json({
      status: "NOT_FOUND",
      transferred: false,
      error: null,
    });
  }

  const transfer = await prisma.membershipTransfer.findUnique({
    where: {
      transferInvoiceId: payment.invoiceId,
    },

    select: {
      id: true,
    },
  });

  let error: string | null = null;

  try {
    error = payment.notes ? JSON.parse(payment.notes).transferError ?? null : null;
  } catch {
    error = null;
  }

  return NextResponse.json({
    status: payment.status,
    transferred: Boolean(transfer),
    error,
  });
}