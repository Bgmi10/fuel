import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

import crypto from "crypto";

import { whatsapp } from "@/app/services/whatsapp";
import { sendEmail } from "@/app/services/email";

import {
  calculateGSTBreakdownFormatted,
  formatDate,
  formatPaidAt,
  formatPaymentMethod,
  paiseToRupees,
} from "@/app/utils/helper";

import { addDaysUTC, nowUTC } from "@/app/utils/date";

export async function POST(req: NextRequest) {
  try {
    // =====================================================
    // RAW BODY
    // =====================================================

    const rawBody = await req.text();

    // =====================================================
    // VERIFY SIGNATURE
    // =====================================================

    const razorpaySignature =
      req.headers.get(
        "x-razorpay-signature"
      ) || "";

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env
          .RAZORPAY_WEBHOOK_SECRET!
      )
      .update(rawBody)
      .digest("hex");

    if (
      razorpaySignature !==
      expectedSignature
    ) {
      console.log(
        "❌ Invalid Razorpay signature"
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid webhook signature",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // EVENT
    // =====================================================

    const event = JSON.parse(rawBody);

    // =====================================================
    // HANDLE ONLY SUCCESS PAYMENTS
    // =====================================================

    if (
      event.event !==
      "payment.captured"
    ) {
      return NextResponse.json({
        received: true,
      });
    }

    // =====================================================
    // PAYMENT ENTITY
    // =====================================================

    const razorpayPayment =
      event.payload.payment.entity;

    const razorpayOrderId =
      razorpayPayment.order_id;

    const razorpayPaymentId =
      razorpayPayment.id;

    const paymentMethod =
      razorpayPayment.method;

    const paidAtDate = new Date(
      razorpayPayment.created_at *
        1000
    );

    // =====================================================
    // FIND PAYMENT RECORD
    // =====================================================

    const paymentRecord =
      await prisma.payment.findFirst({
        where: {
          razorpayOrderId,
        },

        include: {
          member: true,

          invoice: {
            include: {
              member: true,

              branch: true,

              package: {
                include: {
                  service: true,
                },
              },

              subscription: true,
            },
          },
        },
      });

    if (!paymentRecord) {
      console.log(
        "❌ Payment record not found"
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Payment record not found",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // IDEMPOTENCY
    // =====================================================

    if (
      paymentRecord.status ===
      "PAID"
    ) {
      console.log(
        "⚠️ Already processed"
      );

      return NextResponse.json({
        received: true,
      });
    }

    const invoice =
      paymentRecord.invoice;

    let finalSubscriptionEndDate:
      | Date
      | null = null;

    let subscriptionCreated =
      false;

    // =====================================================
    // TRANSACTION
    // =====================================================

    await prisma.$transaction(
      async (tx) => {
        // ===============================================
        // UPDATE PAYMENT
        // ===============================================

        await tx.payment.update({
          where: {
            id: paymentRecord.id,
          },

          data: {
            status: "PAID",

            razorpayPaymentId,

            razorpaySignature,

            paidAt: paidAtDate,

            paymentMode:
              formatPaymentMethod(
                paymentMethod
              ),
          },
        });

        // ===============================================
        // UPDATE INVOICE TOTALS
        // ===============================================

        const updatedPaidAmount =
          invoice.paidAmount +
          paymentRecord.amount;

        // Calculate invoice total with GST
        const invoiceTotal = Math.round(
          invoice.finalAmount + (invoice.totalTax || 0)
        );

        const updatedBalanceAmount =
          Math.max(
            invoiceTotal -
              updatedPaidAmount,
            0
          );

        const invoiceStatus =
          updatedBalanceAmount <= 0
            ? "FULLY_PAID"
            : updatedPaidAmount >
              0
            ? "PARTIAL_PAID"
            : "PENDING";

        await tx.invoice.update({
          where: {
            id: invoice.id,
          },

          data: {
            paidAmount:
              updatedPaidAmount,

            balanceAmount:
              updatedBalanceAmount,

            status: invoiceStatus,
          },
        });

        // =====================================================
        // BALANCE PAYMENT FLOW
        // =====================================================

        /**
         * BALANCE payments should ONLY
         * update invoice + payment history
         *
         * NEVER create subscription
         */

        if (
          paymentRecord.paymentType ===
          "BALANCE"
        ) {
          console.log(
            "💰 Balance payment completed"
          );


          if (
            invoice.subscription
          ) {
            finalSubscriptionEndDate =
              invoice.subscription.endDate;
        
            subscriptionCreated =
              true;
          }

          return;
        }

        // =====================================================
        // INITIAL PAYMENT FLOW
        // =====================================================

        /**
         * INITIAL payments create
         * or extend subscriptions
         */

        // ===============================================
        // EXTEND EXISTING SUBSCRIPTION
        // ===============================================

        if (
          invoice.intent ===
            "EXTEND" &&
          invoice.subscription
        ) {
          const newEndDate =
            addDaysUTC(
              invoice.subscription
                .endDate,
              invoice.packageDurationInDays
            );

          await tx.subscription.update(
            {
              where: {
                id: invoice
                  .subscription.id,
              },

              data: {
                endDate:
                  newEndDate,
              },
            }
          );

          finalSubscriptionEndDate =
            newEndDate;

          subscriptionCreated =
            true;

          console.log(
            "✅ Subscription extended"
          );
        }

        // ===============================================
        // CREATE NEW SUBSCRIPTION
        // ===============================================

        else {
          // Check if dates are provided in razorpay order notes
          const orderNotes = razorpayPayment.notes || {};
          
          const startDate = orderNotes.subscriptionStartDate 
            ? new Date(orderNotes.subscriptionStartDate)
            : nowUTC();

          const endDate = orderNotes.subscriptionEndDate
            ? new Date(orderNotes.subscriptionEndDate)
            : addDaysUTC(
                startDate,
                invoice.packageDurationInDays
              );

          const subscription =
            await tx.subscription.create(
              {
                data: {
                  memberId:
                    invoice.memberId,

                  branchId:
                    invoice.branchId,

                  packageId:
                    invoice.packageId,

                  invoiceId:
                    invoice.id,

                  // SNAPSHOT
                  serviceName:
                    invoice.serviceName,

                  packageName:
                    invoice.packageName,

                  packageDurationInDays:
                    invoice.packageDurationInDays,

                  originalPrice:
                    invoice.packageAmount,

                  finalPrice:
                    invoice.finalAmount,

                  branchName:
                    invoice.branchName,

                  startDate,

                  endDate,

                  status:
                    "ACTIVE",
                },
              }
            );

          // ===========================================
          // LINK SUBSCRIPTION TO INVOICE
          // ===========================================

          await tx.invoice.update({
            where: {
              id: invoice.id,
            },

            data: {
              subscription: {
                connect: {
                  id: subscription.id
                }
              }
            },
          });

          finalSubscriptionEndDate =
            endDate;

          subscriptionCreated =
            true;

          console.log(
            "🆕 Subscription created"
          );
        }
      }
    );

    

    const setting =
  await prisma.setting.findFirst();

  const rewardAlreadyUsed =
  Number(invoice.referralDiscountAmount || 0) > 0;

const referral = await prisma.referral.findFirst({
  where: {
    ...(rewardAlreadyUsed
      ? { referrerId: invoice.memberId }
      : { referredMemberId: invoice.memberId }),

    rewardIssued: rewardAlreadyUsed,
  },

  include: {
    referrer: true,
  },
});

  console.log('checking ......................................................')

if (referral && setting) {
  console.log('checking ......................................................')
 const referralUpdateData: any = {
  rewardIssued: true,
  rewardIssuedAt: new Date(),
  rewardType: setting.referralRewardType,
};

if (rewardAlreadyUsed) {
  console.log('checking ......................................................')
  referralUpdateData.rewardClaimed = true;
  referralUpdateData.status = "REWARDED";
} else {
  referralUpdateData.rewardClaimed = false;
  referralUpdateData.status = "JOINED";
}

  if (
    setting.referralRewardType ===
    "FIXED_AMOUNT"
  ) {
    referralUpdateData.rewardAmount =
      ((setting.referralRewardAmount  ?? 0)) || 0;
  }

  if (
    setting.referralRewardType ===
    "PERCENTAGE_DISCOUNT"
  ) {
    referralUpdateData.rewardPercentage =
      setting.referralRewardPercentage ||
      0;
  }

  if (
    setting.referralRewardType ===
    "MEMBERSHIP_DAYS"
  ) {
    referralUpdateData.rewardMembershipDays =
      setting.referralMembershipDays ||
      0;
  }

  await prisma.referral.update({
    where: {
      id: referral.id,
    },
    data: referralUpdateData,
  });

  console.log(
    `Referral reward issued to ${referral.referrer.name}`
  );
}

    // =====================================================
    // NOTIFICATIONS
    // =====================================================

    /**
     * ONLY SEND MEMBERSHIP NOTIFICATIONS
     * FOR INITIAL PAYMENTS
     */

    if (
      subscriptionCreated &&
      finalSubscriptionEndDate
    ) {
      const memberPortal =
        process.env
          .NEXT_PUBLIC_SITE_URL +
        "/member/login";

      const formattedEndDate =
        formatDate(
          finalSubscriptionEndDate
        );

      // ===============================================
      // WHATSAPP
      // ===============================================
        
      try {
        await whatsapp(
          invoice.member.phone,
          "subscription_success",
          [
            {
              type: "text",
              text: invoice.member.name,
            },

            {
              type: "text",
              text: invoice.packageName,
            },

            {
              type: "text",
              text: formattedEndDate,
            },

            {
              type: "text",
              text: invoice.branchName,
            },

            {
              type: "text",
              text: memberPortal,
            },
          ]
        );
      } catch (waErr) {
        console.log(
          "WhatsApp Error",
          waErr
        );
      }

      // ===============================================
      // EMAIL
      // ===============================================

      // =====================================================
// EMAIL
// =====================================================

// =====================================================
// REFRESH INVOICE AFTER TRANSACTION
// IMPORTANT:
// OLD invoice object contains stale values
// =====================================================

const freshInvoice =
  await prisma.invoice.findUnique({
    where: {
      id: invoice.id,
    },

    include: {
      member: true,

      branch: true,

      package: {
        include: {
          service: true,
        },
      },

      payments: {
        orderBy: {
          createdAt: "asc",
        },
      },

      subscription: true,
    },
  });

if (!freshInvoice) {
  throw new Error(
    "Invoice not found"
  );
}

// =====================================================
// NOTIFICATIONS
// =====================================================

if (
  finalSubscriptionEndDate
) {
  const memberPortal =
    process.env
      .NEXT_PUBLIC_SITE_URL +
    "/member/login";

  const formattedEndDate =
    formatDate(
      finalSubscriptionEndDate
    );

  // ===============================================
  // WHATSAPP
  // ===============================================

  try {
    await whatsapp(
      freshInvoice.member.phone,
      "subscription_success",
      [
        {
          type: "text",
          text: freshInvoice.member.name,
        },

        {
          type: "text",
          text: freshInvoice.packageName,
        },

        {
          type: "text",
          text: formattedEndDate,
        },

        {
          type: "text",
          text: freshInvoice.branchName,
        },

        {
          type: "text",
          text: memberPortal,
        },
      ]
    );
  } catch (waErr) {
    console.log(
      "WhatsApp Error",
      waErr
    );
  }

  // ===============================================
  // EMAIL
  // ===============================================

  try {
    const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invoice/${freshInvoice.id}`;

    // =====================================================
    // BRANCH + SETTINGS
    // =====================================================

    const branch =
      freshInvoice.branch;
    // =====================================================
    // GST BREAKDOWN
    // =====================================================

    const gstBreakdown =
      await calculateGSTBreakdownFormatted(
        freshInvoice.finalAmount
      );

    // Calculate invoice total with GST
    const emailInvoiceTotal = Math.round(
      freshInvoice.finalAmount + (freshInvoice.totalTax || Number(gstBreakdown.totalTax) || 0)
    );

    // =====================================================
    // PAYMENT HISTORY ROWS
    // =====================================================

  // =====================================================
// PAYMENT HISTORY HTML
// =====================================================

const paymentHistory =
freshInvoice.payments.length === 0
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
  : freshInvoice.payments
      .map(
        (payment) => `
<tr>

<td
  style="
    padding:10px 15px;
    border-bottom:1px solid #e5e7eb;
    font-size:12px;
    color:#111827;
  "
>
  ${payment.paymentMode || "-"}
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
    payment.amount
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
  ${formatDate(
    payment.paidAt ||
      payment.createdAt
  )}
</td>

</tr>
`
      )
      .join("");
    // =====================================================
    // SEND EMAIL
    // =====================================================

    await sendEmail({
      to:
        freshInvoice.memberEmail ||
        freshInvoice.member.email,

      name:
        freshInvoice.memberName ||
        freshInvoice.member.name,

      templateId: 1,

      params: {
        // =====================================================
        // MEMBER
        // =====================================================
        invoiceNo: freshInvoice.invoiceNumber,
        amount: paiseToRupees(freshInvoice.packageAmount),
        invoiceTotal: paiseToRupees(emailInvoiceTotal).toFixed(2),
        memberName:
          freshInvoice.memberName ||
          freshInvoice.member
            .name ||
          "-",

        memberPhone:
          freshInvoice.memberPhone ||
          freshInvoice.member
            .phone ||
          "-",

        memberEmail:
          freshInvoice.memberEmail ||
          freshInvoice.member
            .email ||
          "-",

        memberAddress:
          freshInvoice.member
            .address || "-",

            referralDiscountAmount:
            paiseToRupees(
              invoice.referralDiscountAmount
            ).toFixed(2),
        // =====================================================
        // INVOICE
        // =====================================================

        invoiceNumber:
          freshInvoice.invoiceNumber,

        invoiceDate:
          formatDate(
            freshInvoice.createdAt
          ),

        salesRepName:
          freshInvoice.salesRepName ||
          "System",

        // =====================================================
        // BRANCH
        // =====================================================

        branchName:
          freshInvoice.branchName ||
          "-",

        branch: {
          gstNumber:
            branch?.gstNumber ||
            "-",

          address:
            branch?.address ||
            "-",

          supportEmail:
            branch?.supportEmail ||
            "-",

          supportPhone:
            branch?.supportPhone ||
            "-",

          terms:
            (
              branch?.terms ||
              "Standard terms apply."
            ).slice(0, 300),
        },

        // =====================================================
        // SERVICE
        // =====================================================

        serviceName:
          freshInvoice.serviceName,

        packageName:
          freshInvoice.packageName,

        startDate:
          freshInvoice
            .subscription
            ?.startDate
            ? formatDate(
                freshInvoice
                  .subscription
                  .startDate
              )
            : "-",

        endDate:
          freshInvoice
            .subscription
            ?.endDate
            ? formatDate(
                freshInvoice
                  .subscription
                  .endDate
              )
            : "-",

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

        finalAmount:
          paiseToRupees(
            freshInvoice.finalAmount
          ).toFixed(2),

        packageAmount:
          paiseToRupees(
            freshInvoice.packageAmount
          ).toFixed(2),

        discountAmount:
          paiseToRupees(
            freshInvoice.discountAmount
          ).toFixed(2),

        paidAmount:
          paiseToRupees(
            freshInvoice.paidAmount
          ).toFixed(2),

        balanceAmount:
          paiseToRupees(
            freshInvoice.balanceAmount
          ).toFixed(2),

        // =====================================================
        // PAYMENT
        // =====================================================

        paymentMode:
          paymentRecord.paymentMode ||
          "-",

        paymentDate:
          formatDate(
            paymentRecord.paidAt ||
              paymentRecord.createdAt
          ),

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
}
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    return NextResponse.json({
      received: true,
    });
  } catch (err) {
    console.log(
      "🔥 WEBHOOK ERROR",
      err
    );

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}