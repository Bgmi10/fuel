import { prisma } from "@/prisma";

import { NextRequest, NextResponse } from "next/server";

export const POST = async (
  req: NextRequest
) => {
  try {
    const {
      invoiceId,
      amount,
      paymentMode,
      notes
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

    const invoiceTotal = Math.round(
      invoice.finalAmount +
        (invoice.totalTax || 0)
    );
    
    const currentBalance =
      Math.max(
        invoiceTotal -
          invoice.paidAmount,
        0
      );
    
    if (currentBalance <= 0) {
      return NextResponse.json({
        success: false,
        message:
          "Invoice already paid",
      });
    }
    
    if (amount > currentBalance) {
      return NextResponse.json({
        success: false,
        message:
          "Amount exceeds balance",
      });
    }

    // =====================================================
    // CALCULATIONS
    // =====================================================

    const updatedPaidAmount =
    invoice.paidAmount + amount;
  
  
  const updatedBalanceAmount =
    Math.max(
      invoiceTotal -
        updatedPaidAmount,
      0
    );

    const status =
      updatedBalanceAmount <= 0
        ? "FULLY_PAID"
        : updatedPaidAmount > 0
        ? "PARTIAL_PAID"
        : "PENDING";

    // =====================================================
    // TRANSACTION
    // =====================================================

    const payment =
      await prisma.$transaction(
        async (tx) => {
          // ===============================================
          // PAYMENT ENTRY
          // ===============================================

          const payment =
            await tx.payment.create({
              data: {
                receiptNumber: `BAL-${Date.now()}`,

                invoiceId:
                  invoice.id,

                memberId:
                  invoice.memberId,

                amount,

                paymentMode,

                paymentType:
                  "BALANCE",

                status: "PAID",

                paidAt:
                  new Date(),

                notes:
                  notes ||
                  "Balance collected",
              },
            });

          // ===============================================
          // UPDATE INVOICE
          // ===============================================

          await tx.invoice.update({
            where: {
              id: invoice.id,
            },

            data: {
              paidAmount:
                updatedPaidAmount,

              balanceAmount:
                updatedBalanceAmount,

              status,
            },
          });

          return payment;
        }
      );

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      payment,
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