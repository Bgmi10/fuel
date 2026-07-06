import { prisma } from "@/prisma";

import { NextRequest, NextResponse } from "next/server";

import { calculateGSTBreakdownFormatted } from "@/app/utils/helper";

export const PATCH = async (
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      invoiceId: string;
    }>;
  }
) => {
  try {
    const { invoiceId } =
      await params;

    const body =
      await req.json();

    const {
      discountAmount,
      notes,
      startDate,
      endDate,
      packageId,
    } = body;



    let packageData = null;

if (packageId) {
  packageData =
    await prisma.servicePackage.findUnique({
      where: {
        id: packageId,
      },
      include: {
        service: true,
      },
    });

  if (!packageData) {
    return NextResponse.json(
      {
        success: false,
        message: "Package not found",
      },
      {
        status: 404,
      }
    );
  }
}


    // =====================================================
    // FIND INVOICE
    // =====================================================

    const invoice =
      await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
        },

        include: {
          payments: {
            where: {
              status: "PAID",
            },
          },

          subscription: true,
        },
      });

      
    const packageChanged = !!packageData && packageData.id !== invoice?.packageId;

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invoice not found",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // BLOCK CANCELLED
    // =====================================================

    if (
      invoice.status ===
      "CANCELLED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cancelled invoice cannot be edited",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // FIND PACKAGE
    // =====================================================


    // =====================================================
    // TOTAL PAID
    // =====================================================

    const totalPaid =
      invoice.payments.reduce(
        (
          total,
          payment
        ) =>
          total +
          payment.amount,
        0
      );

    // =====================================================
    // PACKAGE AMOUNT
    // =====================================================

    const packageAmount =
      packageData?.price ||
      invoice.packageAmount;

    // =====================================================
    // DISCOUNT
    // =====================================================

    const finalDiscount =
      typeof discountAmount ===
      "number"
        ? discountAmount
        : invoice.discountAmount;

    // =====================================================
    // FINAL AMOUNT
    // =====================================================

    const finalAmount =
      packageAmount -
      finalDiscount;


      if (totalPaid > finalAmount) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Cannot reduce invoice amount below amount already paid",
          },
          {
            status: 400,
          }
        );
      }

    if (finalAmount < 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Final amount cannot be negative",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // BALANCE
    // =====================================================

    const balanceAmount =
      finalAmount - totalPaid;

    // =====================================================
    // STATUS
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

    if (
      balanceAmount <= 0
    ) {
      invoiceStatus =
        "FULLY_PAID";
    }

    // =====================================================
    // GST
    // =====================================================

    const gstBreakdown =
      await calculateGSTBreakdownFormatted(
        finalAmount
      );

    // =====================================================
    // SUBSCRIPTION DATES
    // =====================================================
    let subscriptionStartDate =
    invoice.subscription?.startDate;
  
  let subscriptionEndDate =
    invoice.subscription?.endDate;
  
  // START DATE
  
  if (startDate) {
    subscriptionStartDate =
      new Date(startDate);
  
    if (
      isNaN(
        subscriptionStartDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid start date",
        },
        {
          status: 400,
        }
      );
    }
  }
  
  // END DATE PROVIDED BY USER
  
  if (endDate) {
    subscriptionEndDate =
      new Date(endDate);
  
    if (
      isNaN(
        subscriptionEndDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid end date",
        },
        {
          status: 400,
        }
      );
    }
  }
  
  // PACKAGE CHANGED
  // AUTO CALCULATE END DATE
  // ONLY IF USER DID NOT PROVIDE END DATE
  
  if (
    packageChanged &&
    !endDate &&
    subscriptionStartDate
  ) {
    subscriptionEndDate =
      new Date(
        subscriptionStartDate
      );
  
    subscriptionEndDate.setDate(
      subscriptionEndDate.getDate() +
        (packageData?.durationInDays || 0)
    );
  }
  
  // VALIDATION
  
  if (
    subscriptionStartDate &&
    subscriptionEndDate &&
    subscriptionEndDate <=
      subscriptionStartDate
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "End date must be greater than start date",
      },
      {
        status: 400,
      }
    );
  }
    // =====================================================
    // UPDATE INVOICE
    // =====================================================

    const updatedInvoice =
      await prisma.invoice.update({
        where: {
          id: invoice.id,
        },

        data: {
          packageId:
            packageData?.id ||
            invoice.packageId,

          serviceName:
            packageData?.service
              .name ||
            invoice.serviceName,

          packageName:
            packageData?.name ||
            invoice.packageName,

          packageDurationInDays:
            packageData?.durationInDays ||
            invoice.packageDurationInDays,

          packageAmount,

          discountAmount:
            finalDiscount,

          finalAmount,

          paidAmount:
            totalPaid,

          balanceAmount,

          cgstAmount:
            Number(
              gstBreakdown.cgst
            ) || 0,

          sgstAmount:
            Number(
              gstBreakdown.sgst
            ) || 0,

          totalTax:
            Number(
              gstBreakdown.totalTax
            ) || 0,

          status:
            invoiceStatus,

          notes:
            notes ??
            invoice.notes,
        },
      });

    // =====================================================
    // UPDATE SUBSCRIPTION
    // =====================================================

    if (
      invoice.subscription
    ) {
      await prisma.subscription.update(
        {
          where: {
            id: invoice
              .subscription.id,
          },

          data: {
            packageId:
              packageData?.id ||
              invoice.packageId,

            serviceName:
              packageData
                ?.service.name ||
              invoice.serviceName,

            packageName:
              packageData?.name ||
              invoice.packageName,

            packageDurationInDays:
              packageData?.durationInDays ||
              invoice.packageDurationInDays,

            originalPrice:
              packageData?.originalPrice ||
              invoice.subscription
                .originalPrice,

            finalPrice:
              finalAmount,

            startDate:
              subscriptionStartDate,

            endDate:
              subscriptionEndDate,
          },
        }
      );
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      message:
        "Invoice updated successfully",

      invoice:
        updatedInvoice,
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

export const DELETE = async (
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      invoiceId: string;
    }>;
  }
) => {
  try {
    const { invoiceId } =
      await params;

    // =====================================================
    // FIND INVOICE
    // =====================================================

    const invoice =
      await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
        },

        include: {
          payments: true,
          subscription: true,
        },
      });

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invoice not found",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // ALREADY CANCELLED
    // =====================================================

    if (
      invoice.status ===
      "CANCELLED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invoice already cancelled",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // CHECK BALANCE PAYMENTS
    // =====================================================

    const hasBalancePayments =
      invoice.payments.some(
        (payment) =>
          payment.paymentType ===
            "BALANCE" &&
          payment.status ===
            "PAID"
      );

    if (
      hasBalancePayments
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invoice cannot be cancelled because balance payments exist",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // CANCEL INVOICE
    // =====================================================

    await prisma.invoice.update({
      where: {
        id: invoice.id,
      },

      data: {
        status:
          "CANCELLED",

        balanceAmount: 0,
      },
    });

    // =====================================================
    // VOID PAYMENTS
    // =====================================================

    await prisma.payment.updateMany(
      {
        where: {
          invoiceId:
            invoice.id,
        },

        data: {
          status:
            "VOIDED",
        },
      }
    );

    // =====================================================
    // CANCEL SUBSCRIPTION
    // =====================================================

    if (
      invoice.subscription
    ) {
      await prisma.subscription.update(
        {
          where: {
            id: invoice
              .subscription.id,
          },

          data: {
            status:
              "CANCELLED",
          },
        }
      );
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      message:
        "Invoice cancelled successfully",
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