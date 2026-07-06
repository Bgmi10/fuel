import { prisma } from "@/prisma";
import { getUserFromRequest } from "@/app/utils/auth";
import {
  NextRequest,
  NextResponse,
} from "next/server";

export const PATCH = async (
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      paymentId: string;
    }>;
  }
) => {
  try {
    const { paymentId } =
      await params;

    const body =
      await req.json();

    const {
      amount,
      paymentMode,
      paidAt,
      notes,
    } = body;

    // =====================================================
    // FIND PAYMENT
    // =====================================================

    const payment =
      await prisma.payment.findUnique({
        where: {
          id: paymentId,
        },

        include: {
          invoice: true,
        },
      });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment not found",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // BLOCK VOIDED PAYMENTS
    // =====================================================

    if (
      payment.status ===
      "VOIDED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cannot edit voided payment",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // EXISTING VALUES
    // =====================================================

    const oldAmount =
      payment.amount;

    const newAmount =
      amount ?? oldAmount;

    // =====================================================
    // VALIDATIONS
    // =====================================================

    if (newAmount < 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment amount",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // RECALCULATE INVOICE
    // =====================================================

    const invoice =
      payment.invoice;

    const updatedPaidAmount =
      invoice.paidAmount -
      oldAmount +
      newAmount;

    const updatedBalance =
      invoice.finalAmount -
      updatedPaidAmount;

    // =====================================================
    // PREVENT OVERPAYMENT
    // =====================================================

    if (
      updatedPaidAmount >
      invoice.finalAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment exceeds invoice total",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // STATUS LOGIC
    // =====================================================

    let updatedStatus:
      | "PENDING"
      | "PARTIAL_PAID"
      | "FULLY_PAID" =
      "PENDING";

    if (
      updatedPaidAmount > 0 &&
      updatedBalance > 0
    ) {
      updatedStatus =
        "PARTIAL_PAID";
    }

    if (
      updatedBalance <= 0
    ) {
      updatedStatus =
        "FULLY_PAID";
    }

    // =====================================================
    // TRANSACTION
    // =====================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          // ===============================================
          // UPDATE PAYMENT
          // ===============================================

          const updatedPayment =
            await tx.payment.update(
              {
                where: {
                  id: payment.id,
                },

                data: {
                  amount:
                    newAmount,

                  paymentMode:
                    paymentMode ??
                    payment.paymentMode,

                  paidAt: paidAt
                    ? new Date(
                        paidAt
                      )
                    : payment.paidAt,

                  notes:
                    notes ??
                    payment.notes,
                },
              }
            );

          // ===============================================
          // UPDATE INVOICE
          // ===============================================

          const updatedInvoice =
            await tx.invoice.update(
              {
                where: {
                  id: invoice.id,
                },

                data: {
                  paidAmount:
                    updatedPaidAmount,

                  balanceAmount:
                    updatedBalance,

                  status:
                    updatedStatus,
                },
              }
            );

          return {
            updatedPayment,
            updatedInvoice,
          };
        }
      );

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      message:
        "Payment updated successfully",

      payment:
        result.updatedPayment,

      invoice:
        result.updatedInvoice,
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

type Params = Promise<{
  paymentId: string;
}>;

export const DELETE = async (
  req: NextRequest,
  {
    params,
  }: {
    params: Params;
  }
) => {
  const user = await getUserFromRequest(req);

  try {
    const { paymentId: id } = await params;

    // =====================================================
    // FIND PAYMENT
    // =====================================================

    const payment =
      await prisma.payment.findUnique({
        where: {
          id,
        },

        include: {
          invoice: true,
        },
      });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment not found",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // BLOCK DELETED/CANCELLED
    // =====================================================

    if (
      payment.status === "VOIDED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment already cancelled",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // SOFT DELETE PAYMENT
    // =====================================================

    await prisma.payment.update({
      where: {
        id: payment.id,
      },

      data: {
        status: "VOIDED",

        notes: payment.notes
          ? `${payment.notes}

[CANCELLED BY ${
              user?.name || "System"
            }]`
          : `[CANCELLED BY ${
              user?.name || "System"
            }]`,
      },
    });

    // =====================================================
    // RECALCULATE INVOICE TOTALS
    // =====================================================

    const validPayments =
      await prisma.payment.findMany({
        where: {
          invoiceId:
            payment.invoiceId,

          status: "PAID",
        },
      });

    const totalPaid =
      validPayments.reduce(
        (sum, item) =>
          sum + item.amount,
        0
      );

    const balanceAmount =
      payment.invoice.finalAmount -
      totalPaid;

    // =====================================================
    // DETERMINE STATUS
    // =====================================================

    let invoiceStatus:
      | "PENDING"
      | "PARTIAL_PAID"
      | "FULLY_PAID" =
      "PENDING";

    if (
      totalPaid > 0 &&
      balanceAmount > 0
    ) {
      invoiceStatus =
        "PARTIAL_PAID";
    }

    if (balanceAmount <= 0) {
      invoiceStatus =
        "FULLY_PAID";
    }

    // =====================================================
    // UPDATE INVOICE
    // =====================================================

    await prisma.invoice.update({
      where: {
        id: payment.invoiceId,
      },

      data: {
        paidAmount: totalPaid,

        balanceAmount,

        status: invoiceStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Payment cancelled successfully",
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