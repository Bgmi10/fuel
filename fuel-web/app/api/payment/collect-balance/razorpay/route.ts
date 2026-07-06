import { prisma } from "@/prisma";

import { NextRequest, NextResponse } from "next/server";

import Razorpay from "razorpay";

const rp = new Razorpay({
  key_id:
    process.env
      .RAZORPAY_KEY_ID!,

  key_secret:
    process.env
      .RAZORPAY_KEY_SECRET!,
});

export const POST = async (
  req: NextRequest
) => {
  try {
    const {
      invoiceId,
      amount,
      notes,
    } = await req.json();

    // =====================================================
    // VALIDATION
    // =====================================================

    if (
      !invoiceId ||
      !amount ||
      amount <= 0
    ) {
      return NextResponse.json({
        success: false,
        message:
          "Invalid request",
      });
    }

    // =====================================================
    // INVOICE
    // =====================================================

    const invoice =
      await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
        },

        include: {
          member: true,
        },
      });

    if (!invoice) {
      return NextResponse.json({
        success: false,
        message:
          "Invoice not found",
      });
    }

    // =====================================================
    // CHECK BALANCE
    // =====================================================

    if (
      invoice.balanceAmount <= 0
    ) {
      return NextResponse.json({
        success: false,
        message:
          "Invoice already paid",
      });
    }

    if (
      amount >
      invoice.balanceAmount
    ) {
      return NextResponse.json({
        success: false,
        message:
          "Amount exceeds balance",
      });
    }

    // =====================================================
    // CREATE RAZORPAY ORDER
    // =====================================================

    const razorpayOrder =
      await rp.orders.create({
        amount,

        currency: "INR",

        receipt: `bal_${Date.now()}`,
      });

    // =====================================================
    // CREATE PENDING PAYMENT
    // =====================================================

    await prisma.payment.create({
      data: {
        receiptNumber: `BAL-RZP-${Date.now()}`,

        invoiceId: invoice.id,

        memberId:
          invoice.memberId,

        amount,

        paymentMode:
          "Razorpay",

        paymentType:
          "BALANCE",

        status: "FAILED",

        razorpayOrderId:
          razorpayOrder.id,

        notes:
          notes ||
          "Pending balance payment",
      },
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      key:
        process.env
          .RAZORPAY_KEY_ID,

      orderId:
        razorpayOrder.id,

      amount,

      member: {
        name:
          invoice.member.name,

        phone:
          invoice.member.phone,

        email:
          invoice.member.email,
      },
    });
  } catch (e) {
    console.log(e);

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong",
      },
      {
        status: 500,
      }
    );
  }
};