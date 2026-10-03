import { prisma } from "@/prisma";

import { NextRequest, NextResponse } from "next/server";

import { addDaysUTC, nowUTC } from "@/app/utils/date";

import {
  calculateGSTBreakdownFormatted,
  formatDate,
  formatPaidAt,
  paiseToRupees,
} from "@/app/utils/helper";

import { whatsapp } from "@/src/lib/services/whatsapp";
import { sendEmail } from "@/src/lib/services/email";
import { getUserFromRequest } from "@/app/utils/auth";

export const POST = async (req: NextRequest) => {
  const user = await getUserFromRequest(req);

  try {
    const {
      branchId,
      memberId,

      // SERVICE HIERARCHY
      serviceId,
      subCategoryId,
      packageId,

      discountAmount = 0,
      paidAmount = 0,

      referralId = null,
      referralDiscountAmount = 0,

      paymentMode,
      notes,

      startDate,
      endDate,
    } = await req.json();

    // =====================================================
    // VALIDATE REQUIRED FIELDS
    // =====================================================


    if (
      !branchId ||
      !memberId ||
      !serviceId ||
      !packageId
    ) {
      return NextResponse.json({
        success: false,
        message:
          "Service, package, branch and member are required",
      });
    }

    // =====================================================
    // MEMBER
    // =====================================================

    const member = await prisma.member.findUnique({
      where: {
        id: memberId,
      },
    });

    if (!member) {
      return NextResponse.json({
        success: false,
        message: "Member not found",
      });
    }

    // =====================================================
    // REFERRAL
    // =====================================================

    let referral = null;

    if (referralId) {
      referral = await prisma.referral.findUnique({
        where: {
          id: referralId,
        },
      });

      if (!referral) {
        return NextResponse.json({
          success: false,
          message: "Referral reward not found",
        });
      }

      if (referral.referrerId !== member.id) {
        return NextResponse.json({
          success: false,
          message: "Invalid referral reward",
        });
      }

      if (referral.rewardClaimed) {
        return NextResponse.json({
          success: false,
          message: "Referral reward already claimed",
        });
      }

      if (
        referral.rewardType !== "FIXED_AMOUNT" &&
        referral.rewardType !== "PERCENTAGE_DISCOUNT"
      ) {
        return NextResponse.json({
          success: false,
          message: "Invalid referral reward type",
        });
      }
    }

    // =====================================================
    // SERVICE
    // =====================================================

    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
    });

    if (!service) {
      return NextResponse.json({
        success: false,
        message: "Service not found",
      });
    }

    // =====================================================
    // SUB CATEGORY
    //
    // Make sure sub category belongs to selected service.
    // =====================================================



   

    // =====================================================
    // PACKAGE
    //
    // Package must belong to:
    //
    // Service
    //      ↓
    // Sub Category
    //      ↓
    // Package
    //
    // We verify this before billing.
    // =====================================================

    const plan = await prisma.servicePackage.findFirst({
      where: {
        id: packageId,

        // Package must belong to selected service
        serviceId: serviceId,

        // Only active packages can be billed
        isActive: true,
      },

      include: {
        service: true,

        subCategories: {
          where: {
            subCategoryId: subCategoryId,
          },
          include: {
            subCategory: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({
        success: false,
        message:
          "Selected package does not belong to the selected service and sub category",
      });
    }

    // =====================================================


    // BRANCH
    // =====================================================

    const branch = await prisma.branch.findUnique({
      where: {
        id: branchId,
      },
    });

    if (!branch) {
      return NextResponse.json({
        success: false,
        message: "Branch not found",
      });
    }

    // =====================================================
    // PRICE CALCULATION
    // =====================================================

    const packageAmount = plan.price;

    const totalDiscount =
  Number(discountAmount) +
  Number(referralDiscountAmount);

  

    const finalAmount =
      packageAmount - totalDiscount;

    if (finalAmount < 0) {
      return NextResponse.json({
        success: false,
        message:
          "Discount cannot exceed package amount",
      });
    }

    // =====================================================
    // GST
    // =====================================================

    const setting = await prisma.setting.findFirst();

    const gstBreakdown =
      await calculateGSTBreakdownFormatted(
        finalAmount
      );

    const cgstAmount =
      Number(gstBreakdown.cgst);

    const sgstAmount =
      Number(gstBreakdown.sgst);

    const totalTax =
      Number(gstBreakdown.totalTax);

    // =====================================================
    // CUSTOMER PAYABLE
    // =====================================================

    const invoiceTotal = 
      finalAmount + totalTax

      const numericPaidAmount =
  Number(paidAmount) || 0;


    

    if (numericPaidAmount > invoiceTotal) {
      return NextResponse.json({
        success: false,
        message:
          "Paid amount cannot exceed invoice total",
      });
    }

    const balanceAmount = Number(
      invoiceTotal - numericPaidAmount
    );

    // =====================================================
    // INVOICE STATUS
    // =====================================================

    let invoiceStatus:
      | "PENDING"
      | "PARTIAL_PAID"
      | "FULLY_PAID" = "PENDING";

    if (
      numericPaidAmount > 0 &&
      balanceAmount > 0
    ) {
      invoiceStatus = "PARTIAL_PAID";
    }

    if (numericPaidAmount >= invoiceTotal) {
      invoiceStatus = "FULLY_PAID";
    }

    // =====================================================
    // DATES
    // =====================================================

    const subscriptionStartDate = startDate
      ? new Date(startDate)
      : nowUTC();

    const subscriptionEndDate = endDate
      ? new Date(endDate)
      : addDaysUTC(
          subscriptionStartDate,
          plan.durationInDays - 1
        );

    if (
      subscriptionEndDate <
      subscriptionStartDate
    ) {
      return NextResponse.json({
        success: false,
        message:
          "End date cannot be before start date",
      });
    }

    // =====================================================
    // INVOICE NUMBER
    // =====================================================

    const invoiceNumber = `INV-${Date.now()}`;

    // =====================================================
    // CREATE INVOICE
    // =====================================================

    const invoice =
      await prisma.invoice.create({
        data: {
          invoiceNumber,

          memberId: member.id,

          branchId: branch.id,

          packageId: plan.id,

          salesRepId: user?.id,

          salesRepName: user?.name,

          intent: "NEW",

          // =================================================
          // SERVICE HIERARCHY SNAPSHOT
          // =================================================

          serviceName: plan.service.name,
          packageName: plan.name,

          packageDurationInDays:
            plan.durationInDays,

          // =================================================
          // REFERRAL
          // =================================================

          referralDiscountAmount:
            Number(referralDiscountAmount),

          // =================================================
          // BRANCH SNAPSHOT
          // =================================================

          branchName: branch.name,

          // =================================================
          // MEMBER SNAPSHOT
          // =================================================

          memberName: member.name,

          memberPhone: member.phone,

          memberEmail: member.email,

          // =================================================
          // AMOUNTS
          // =================================================

          packageAmount: packageAmount,

          discountAmount:
            Number(discountAmount),

          finalAmount,

          paidAmount:
            numericPaidAmount,

          balanceAmount,

          // =================================================
          // GST
          // =================================================

          cgstPercentage:
            setting?.cgstPercentage,

          sgstPercentage:
            setting?.sgstPercentage,

          cgstAmount,

          sgstAmount,

          totalTax,

          // =================================================
          // STATUS
          // =================================================

          subCategoryId: subCategoryId === "" ? null : subCategoryId,
          status: invoiceStatus,

          notes,
        },
      });

    // =====================================================
    // CREATE PAYMENT
    // =====================================================

    let payment = null;

    if (numericPaidAmount > 0) {
      payment =
        await prisma.payment.create({
          data: {
            receiptNumber:
              `RCPT-${Date.now()}`,

            invoiceId: invoice.id,

            memberId: member.id,

            amount: numericPaidAmount,

            paymentMode,

            paymentType: "INITIAL",

            status: "PAID",

            paidAt: nowUTC(),

            notes,
          },
        });
    }

    // =====================================================
    // CREATE SUBSCRIPTION
    // =====================================================

    const subscription =
      await prisma.subscription.create({
        data: {
          memberId: member.id,

          packageId: plan.id,

          usageType: plan.usageType,

          totalSessions:
            plan.totalSessions,

          remainingSessions:
            plan.totalSessions,

          branchId: branch.id,
          subCategoryId: subCategoryId === "" ? null : subCategoryId,


          invoiceId: invoice.id,

          // =================================================
          // SERVICE HIERARCHY SNAPSHOT
          // =================================================

          serviceName:
            plan.service.name,


          packageName:
            plan.name,

          packageDurationInDays:
            plan.durationInDays,

          // =================================================
          // PRICE SNAPSHOT
          // =================================================

          originalPrice:
            plan.originalPrice,

          finalPrice:
            finalAmount,

          // =================================================
          // BRANCH
          // =================================================

          branchName:
            branch.name,

          // =================================================
          // DATES
          // =================================================

          startDate:
            subscriptionStartDate,

          endDate:
            subscriptionEndDate,

          status: "ACTIVE",
        },
      });

    // =====================================================
    // CLAIM REFERRAL
    // =====================================================

    if (
      referral &&
      paymentMode !== "Razorpay"
    ) {
      await prisma.referral.update({
        where: {
          id: referral.id,
        },

        data: {
          rewardClaimed: true,

          status: "REWARDED",

          claimedInvoiceId:
            invoice.id,
        },
      });
    }

    // =====================================================
    // WHATSAPP
    // =====================================================

    try {
      const memberPortal =
        process.env.NEXT_PUBLIC_SITE_URL +
        "/member/login";

      await whatsapp(
        member.phone,
        "subscription_success",
        [
          {
            type: "text",
            text: member.name,
          },
          {
            type: "text",
            text: plan.name,
          },
          {
            type: "text",
            text: formatDate(
              subscriptionEndDate
            ),
          },
          {
            type: "text",
            text: branch.name,
          },
          {
            type: "text",
            text: memberPortal,
          },
        ]
      );
    } catch (e) {
      console.log(
        "WhatsApp failed",
        e
      );
    }

    // =====================================================
    // EMAIL
    // =====================================================

    try {
      const memberPortal =
        process.env.NEXT_PUBLIC_SITE_URL +
        "/member/login";

      const invoiceUrl =
        `${process.env.NEXT_PUBLIC_APP_URL}/invoice/${invoice.id}`;

      const totalAmount =
        paiseToRupees(invoiceTotal);

      // ===================================================
      // PAYMENT HISTORY
      // ===================================================

      const paymentDate =
        formatPaidAt(
          payment?.paidAt
        );

      const paymentHistory =
        invoiceStatus === "PENDING"
          ? `
<tr>
<td
  colspan="3"
  style="
    padding:12px 15px;
    font-size:12px;
    color:#6b7280;
    text-align:center;
    border-bottom:1px solid #e5e7eb;
  "
>
  No payments available
</td>
</tr>
`
          : `
<tr>
<td
  style="
    padding:10px 15px;
    border-bottom:1px solid #e5e7eb;
    font-size:12px;
    color:#111827;
  "
>
  ${paymentMode || "-"}
</td>

<td
  style="
    padding:10px 15px;
    border-bottom:1px solid #e5e7eb;
    font-size:12px;
    color:#111827;
  "
>
  ₹ ${paiseToRupees(
    numericPaidAmount
  )}
</td>

<td
  align="right"
  style="
    padding:10px 15px;
    border-bottom:1px solid #e5e7eb;
    font-size:12px;
    color:#111827;
  "
>
  ${paymentDate}
</td>
</tr>
`;

      // ===================================================
      // SEND EMAIL
      // ===================================================

      await sendEmail({
        to: member.email,
        name: member.name,
        templateId: 1,

        params: {
          // =================================================
          // MEMBER
          // =================================================

          invoiceNo:
            invoiceNumber,

          amount:
            paiseToRupees(
              invoice.packageAmount
            ),

          referralDiscountAmount:
            paiseToRupees(
              invoice.referralDiscountAmount
            ),

          memberName:
            member.name || "-",

          memberPhone:
            member.phone || "-",

          memberEmail:
            member.email || "-",

          memberAddress:
            member.address || "-",

          // =================================================
          // INVOICE
          // =================================================

          invoiceNumber:
            invoice.invoiceNumber,

          invoiceDate:
            formatDate(
              invoice.createdAt
            ),

          salesRepName:
            user?.name || "System",

          // =================================================
          // BRANCH
          // =================================================

          branchName:
            branch.name || "-",

          branch: {
            gstNumber:
              branch.gstNumber ||
              "-",

            address:
              branch.address || "-",

            supportEmail:
              branch.supportEmail ||
              "-",

            supportPhone:
              branch.supportPhone ||
              "-",

            terms: (
              branch.terms ||
              "Standard terms apply."
            ).slice(0, 300),
          },

          // =================================================
          // SERVICE HIERARCHY
          // =================================================

          serviceName:
            invoice.serviceName,


          packageName:
            invoice.packageName,

          startDate:
            formatDate(
              subscriptionStartDate
            ),

          endDate:
            formatDate(
              subscriptionEndDate
            ),

          // =================================================
          // GST
          // =================================================

          baseFee:
            paiseToRupees(
              Number(
                gstBreakdown.baseFee
              )
            ),

          cgst:
            paiseToRupees(
              Number(
                gstBreakdown.cgst
              )
            ),

          sgst:
            paiseToRupees(
              Number(
                gstBreakdown.sgst
              )
            ),

          totalTax:
            paiseToRupees(
              Number(
                gstBreakdown.totalTax
              )
            ),

          cgstPercentage:
            setting?.cgstPercentage?.toFixed(
              2
            ) || "0.00",

          sgstPercentage:
            setting?.sgstPercentage?.toFixed(
              2
            ) || "0.00",

          // =================================================
          // TOTALS
          // =================================================

          finalAmount:
            paiseToRupees(
              invoice.finalAmount
            ),

          invoiceTotal:
            totalAmount.toFixed(2),

          packageAmount:
            paiseToRupees(
              invoice.packageAmount
            ),

          discountAmount:
            paiseToRupees(
              invoice.discountAmount
            ),

          paidAmount:
            paiseToRupees(
              invoice.paidAmount
            ),

          balanceAmount:
            paiseToRupees(
              invoice.balanceAmount
            ),

          // =================================================
          // PAYMENT
          // =================================================

          paymentMode:
            paymentMode || "-",

          paymentDate,

          paymentHistory,

          // =================================================
          // LINKS
          // =================================================

          invoiceUrl,

          portalUrl:
            memberPortal,
        },
      });
    } catch (e) {
      console.log(
        "Email failed",
        e
      );
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      invoice,

      payment,

      subscription,
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