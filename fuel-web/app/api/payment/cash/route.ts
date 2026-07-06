import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

import { addDaysUTC, nowUTC } from "@/app/utils/date";

import {
  calculateGSTBreakdownFormatted,
  formatDate,
  formatPaidAt,
  paiseToRupees,
} from "@/app/utils/helper";

import { whatsapp } from "@/app/services/whatsapp";
import { sendEmail } from "@/app/services/email";

import { getUserFromRequest } from "@/app/utils/auth";

export const POST = async (req: NextRequest) => {
  const user = await getUserFromRequest(req);

  try {
    const {
      branchId,
      memberId,
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

    if (
      !branchId ||
      !memberId ||
      !packageId
    ) {
      return NextResponse.json({
        success: false,
        message: "Missing required fields",
      });
    }

    // MEMBER
    const member =
      await prisma.member.findUnique({
        where: { id: memberId },
      });

    if (!member) {
      return NextResponse.json({
        success: false,
        message: "Member not found",
      });
    }

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

    // PACKAGE
    const plan =
      await prisma.servicePackage.findUnique({
        where: { id: packageId },
        include: {
          service: true,
        },
      });

    if (!plan) {
      return NextResponse.json({
        success: false,
        message: "Package not found",
      });
    }

    // BRANCH
    const branch =
      await prisma.branch.findUnique({
        where: { id: branchId },
      });

    if (!branch) {
      return NextResponse.json({
        success: false,
        message: "Branch not found",
      });
    }

    // PRICE CALCULATION
   // =====================================================
// PRICE CALCULATION
// =====================================================

const packageAmount = plan.price;
const totalDiscount =
  discountAmount +
  referralDiscountAmount;

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

const setting =
  await prisma.setting.findFirst();

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

// CUSTOMER PAYABLE AMOUNT

const invoiceTotal =
  Math.round(
    finalAmount + totalTax
  );

const balanceAmount =
  invoiceTotal - paidAmount;

if (paidAmount > invoiceTotal) {
  return NextResponse.json({
    success: false,
    message:
      "Paid amount cannot exceed invoice total",
  });
}

    // STATUS
    let invoiceStatus:
      | "PENDING"
      | "PARTIAL_PAID"
      | "FULLY_PAID" = "PENDING";

    if (
      paidAmount > 0 &&
      balanceAmount > 0
    ) {
      invoiceStatus = "PARTIAL_PAID";
    }

    if (paidAmount >= invoiceTotal) {
      invoiceStatus = "FULLY_PAID";
    }
    // DATES
    const subscriptionStartDate =
    startDate
      ? new Date(startDate)
      : nowUTC();
  
  // IF END DATE IS SENT MANUALLY USE IT
  // OTHERWISE AUTO CALCULATE FROM PACKAGE
  
  const subscriptionEndDate =
    endDate
      ? new Date(endDate)
      : addDaysUTC(
          subscriptionStartDate,
          plan.durationInDays
        );

        
        if (
          subscriptionEndDate <=
          subscriptionStartDate
        ) {
          return NextResponse.json({
            success: false,
            message:
              "End date must be greater than start date",
          });
        }

    // INVOICE NUMBER
    const invoiceNumber = `INV-${Date.now()}`;

    // CREATE INVOICE
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

          // SNAPSHOT
          serviceName: plan.service.name,
          packageName: plan.name,

          packageDurationInDays:
            plan.durationInDays,
            referralDiscountAmount,
          branchName: branch.name,

          memberName: member.name,
          memberPhone: member.phone,
          memberEmail: member.email,

          packageAmount,

          discountAmount,

          finalAmount,

          paidAmount,

          balanceAmount,

          cgstPercentage:
            setting?.cgstPercentage,

          sgstPercentage:
            setting?.sgstPercentage,

          cgstAmount,
          sgstAmount,
          totalTax:
            Number(gstBreakdown.totalTax) ||
            0,

          status: invoiceStatus,

          notes,
        },
      });

    // CREATE PAYMENT
    let payment = null;

    if (paidAmount > 0) {
      payment =
        await prisma.payment.create({
          data: {
            receiptNumber: `RCPT-${Date.now()}`,

            invoiceId: invoice.id,

            memberId: member.id,

            amount: paidAmount,

            paymentMode,

            paymentType: "INITIAL",

            status: "PAID",

            paidAt: nowUTC(),

            notes,
          },
        });
    }

    // CREATE SUBSCRIPTION
    const subscription =
      await prisma.subscription.create({
        data: {
          memberId: member.id,

          packageId: plan.id,

          branchId: branch.id,

          invoiceId: invoice.id,

          // SNAPSHOT
          serviceName: plan.service.name,
          packageName: plan.name,

          packageDurationInDays:
            plan.durationInDays,

          originalPrice:
            plan.originalPrice,

          finalPrice: finalAmount,

          branchName: branch.name,

          startDate: subscriptionStartDate,
          endDate: subscriptionEndDate,

          status: "ACTIVE",
        },
      });


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
            claimedInvoiceId: invoice.id,
          },
        });
      }

    // WHATSAPP
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
            text: formatDate(subscriptionEndDate),
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

try {
  const memberPortal =
    process.env.NEXT_PUBLIC_SITE_URL +
    "/member/login";

  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invoice/${invoice.id}`;

  // =====================================================
  // TOTAL
  // =====================================================

  const totalAmount =
    paiseToRupees(invoiceTotal);

  // =====================================================
  // PAYMENT HISTORY HTML
  // =====================================================

  // =====================================================
// PAYMENT HISTORY HTML ROWS
// =====================================================
const paymentDate = formatPaidAt(payment?.paidAt)
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
    paidAmount
  ).toFixed(2)}

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
  // =====================================================
  // SEND EMAIL
  // =====================================================

  await sendEmail({
    to: member.email,

    name: member.name,

    templateId: 1,

    params: {
      // =====================================================
      // MEMBER
      // =====================================================
      invoiceNo: invoiceNumber,
      amount: paiseToRupees(invoice.packageAmount),
      referralDiscountAmount:
      paiseToRupees(
        invoice.referralDiscountAmount
      ).toFixed(2),
      memberName:
        member.name || "-",

      memberPhone:
        member.phone || "-",

      memberEmail:
        member.email || "-",

      memberAddress:
        member.address || "-",

      // =====================================================
      // INVOICE
      // =====================================================

      invoiceNumber:
        invoice.invoiceNumber,

      invoiceDate:
        formatDate(
          invoice.createdAt
        ),

      salesRepName:
        user?.name || "System",

      // =====================================================
      // BRANCH
      // =====================================================

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

        terms:
          (
            branch.terms ||
            "Standard terms apply."
          ).slice(0, 300),
      },

      // =====================================================
      // SERVICE
      // =====================================================

      serviceName:
        invoice.serviceName,

      packageName:
        invoice.packageName,

      startDate:
        formatDate(subscriptionStartDate),

      endDate:
        formatDate(subscriptionEndDate),

      // =====================================================
      // GST
      // =====================================================

      baseFee:
      paiseToRupees(Number(
        gstBreakdown.baseFee
      )).toFixed(2),
    
    cgst:
    paiseToRupees(Number(
        gstBreakdown.cgst
      )).toFixed(2),
    
    sgst:
    paiseToRupees(Number(
        gstBreakdown.sgst
      )).toFixed(2),
    
    totalTax:
      paiseToRupees(Number(
        gstBreakdown.totalTax
      )).toFixed(2),

      cgstPercentage:
        setting?.cgstPercentage?.toFixed(
          2
        ) || "0.00",

      sgstPercentage:
        setting?.sgstPercentage?.toFixed(
          2
        ) || "0.00",

      // =====================================================
      // TOTALS
      // =====================================================

      finalAmount:
  paiseToRupees(
    invoice.finalAmount
  ).toFixed(2),

invoiceTotal:
  totalAmount.toFixed(2),

      packageAmount:
        paiseToRupees(
          invoice.packageAmount
        ).toFixed(2),

      discountAmount:
        paiseToRupees(
          invoice.discountAmount
        ).toFixed(2),

      paidAmount:
        paiseToRupees(
          invoice.paidAmount
        ).toFixed(2),

      balanceAmount:
        paiseToRupees(
          invoice.balanceAmount
        ).toFixed(2),

      // =====================================================
      // PAYMENT
      // =====================================================

      paymentMode:
        paymentMode || "-",
      paymentDate,
      paymentHistory,
      

      // =====================================================
      // LINKS
      // =====================================================

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


    return NextResponse.json({
      success: true,

      invoice,
      payment,
      subscription,
    });
  } catch (e) {
    console.log(e);

    return NextResponse.json({
      success: false,
      message: "Something went wrong",
    });
  }
};