import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "node:crypto";

import { prisma } from "@/prisma";

import {
  whatsapp,
} from "@/app/services/whatsapp";

import {
  sendEmail,
} from "@/app/services/email";

import {
  calculateGSTBreakdownFormatted,
  formatDate,
  formatPaymentMethod,
  paiseToRupees,
} from "@/app/utils/helper";

import {
  addDaysUTC,
  nowUTC,
} from "@/app/utils/date";

type PaymentMetadata = {
  purchaseType?:
    | "INDIVIDUAL"
    | "GROUP";

  intent?:
    | "NEW"
    | "EXTEND";

  extensionSubscriptionId?:
    | string
    | null;

  subscriptionStartDate?:
    | string
    | null;

  subscriptionEndDate?:
    | string
    | null;

  memberIndex?: number;
  memberCount?: number;

  groupDiscountPercentage?:
    number;
};

type ProcessedPayment = {
  paymentId: string;
  invoiceId: string;

  paymentType: string;

  finalSubscriptionEndDate:
    | Date
    | null;
};

const parsePaymentMetadata = (
  notes: unknown
): PaymentMetadata => {
  if (
    typeof notes !== "string" ||
    !notes.trim()
  ) {
    return {};
  }

  try {
    const parsed =
      JSON.parse(notes);

    if (
      typeof parsed !== "object" ||
      parsed === null
    ) {
      return {};
    }

    return parsed as
      PaymentMetadata;
  } catch {
    return {};
  }
};

const parseDate = (
  value: unknown
): Date | null => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
};

const processReferralReward =
  async (
    invoiceId: string
  ) => {
    try {
      const invoice =
        await prisma.invoice.findUnique({
          where: {
            id:
              invoiceId,
          },

          select: {
            id: true,
            memberId: true,

            referralDiscountAmount:
              true,
          },
        });

      if (!invoice) {
        return;
      }

      const setting =
        await prisma.setting.findFirst();

      if (!setting) {
        return;
      }

      const rewardAlreadyUsed =
        Number(
          invoice
            .referralDiscountAmount ||
            0
        ) > 0;

      const referral =
        await prisma.referral.findFirst({
          where: {
            ...(rewardAlreadyUsed
              ? {
                  referrerId:
                    invoice.memberId,
                }
              : {
                  referredMemberId:
                    invoice.memberId,
                }),

            rewardIssued:
              rewardAlreadyUsed,
          },

          include: {
            referrer: true,
          },
        });

      if (!referral) {
        return;
      }

      const updateData: {
        rewardIssued: boolean;
        rewardIssuedAt: Date;

        rewardType:
          typeof setting.referralRewardType;

        rewardClaimed: boolean;
        status:
          | "JOINED"
          | "REWARDED";

        rewardAmount?: number;
        rewardPercentage?: number;
        rewardMembershipDays?: number;
      } = {
        rewardIssued: true,

        rewardIssuedAt:
          new Date(),

        rewardType:
          setting
            .referralRewardType,

        rewardClaimed:
          rewardAlreadyUsed,

        status:
          rewardAlreadyUsed
            ? "REWARDED"
            : "JOINED",
      };

      if (
        setting
          .referralRewardType ===
        "FIXED_AMOUNT"
      ) {
        updateData.rewardAmount =
          Number(
            setting
              .referralRewardAmount ||
              0
          );
      }

      if (
        setting
          .referralRewardType ===
        "PERCENTAGE_DISCOUNT"
      ) {
        updateData
          .rewardPercentage =
          Number(
            setting
              .referralRewardPercentage ||
              0
          );
      }

      if (
        setting
          .referralRewardType ===
        "MEMBERSHIP_DAYS"
      ) {
        updateData
          .rewardMembershipDays =
          Number(
            setting
              .referralMembershipDays ||
              0
          );
      }

      await prisma.referral.update({
        where: {
          id:
            referral.id,
        },

        data:
          updateData,
      });

      console.log(
        `Referral reward processed for invoice ${invoice.id}`
      );
    } catch (error) {
      /*
       * A referral failure must not make
       * Razorpay retry an already completed
       * membership transaction.
       */
      console.error(
        "Referral processing failed:",
        invoiceId,
        error
      );
    }
  };

const sendMembershipNotification =
  async ({
    invoiceId,
    paymentId,
    finalSubscriptionEndDate,
  }: {
    invoiceId: string;
    paymentId: string;

    finalSubscriptionEndDate:
      Date;
  }) => {
    const freshInvoice =
      await prisma.invoice.findUnique({
        where: {
          id:
            invoiceId,
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
              createdAt:
                "asc",
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

    const currentPayment =
      freshInvoice.payments.find(
        (payment) =>
          payment.id ===
          paymentId
      ) ||
      freshInvoice.payments
        .filter(
          (payment) =>
            payment.status ===
            "PAID"
        )
        .at(-1);

    const setting =
      await prisma.setting.findFirst();

    const memberPortal =
      `${process.env.NEXT_PUBLIC_SITE_URL}/member/login`;

    const formattedEndDate =
      formatDate(
        finalSubscriptionEndDate
      );

    // =====================================================
    // WHATSAPP
    // =====================================================

    try {
      await whatsapp(
        freshInvoice.member.phone,

        "subscription_success",

        [
          {
            type: "text",
            text:
              freshInvoice.member
                .name,
          },

          {
            type: "text",
            text:
              freshInvoice
                .packageName,
          },

          {
            type: "text",
            text:
              formattedEndDate,
          },

          {
            type: "text",
            text:
              freshInvoice
                .branchName,
          },

          {
            type: "text",
            text:
              memberPortal,
          },
        ]
      );
    } catch (error) {
      console.error(
        "WhatsApp notification failed:",
        freshInvoice.id,
        error
      );
    }

    // =====================================================
    // EMAIL
    // =====================================================

    try {
      const invoiceUrl =
        `${process.env.NEXT_PUBLIC_APP_URL}/invoice/${freshInvoice.id}`;

      const branch =
        freshInvoice.branch;

      const gstBreakdown =
        await calculateGSTBreakdownFormatted(
          freshInvoice.finalAmount
        );

      const emailInvoiceTotal =
        Math.round(
          freshInvoice.finalAmount +
            (
              freshInvoice
                .totalTax ||
              Number(
                gstBreakdown
                  .totalTax
              ) ||
              0
            )
        );

      const paymentHistory =
        freshInvoice.payments
          .length === 0
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
          : freshInvoice
              .payments
              .map(
                (
                  payment
                ) => `
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
    ${formatDate(
      payment.paidAt ||
        payment.createdAt
    )}
  </td>
</tr>
`
              )
              .join("");

      await sendEmail({
        to:
          freshInvoice.memberEmail ||
          freshInvoice.member.email,

        name:
          freshInvoice.memberName ||
          freshInvoice.member.name,

        templateId: 1,

        params: {
          invoiceNo:
            freshInvoice
              .invoiceNumber,

          amount:
            paiseToRupees(
              freshInvoice
                .packageAmount
            ),

          invoiceTotal:
            paiseToRupees(
              emailInvoiceTotal
            ),

          memberName:
            freshInvoice.memberName ||
            freshInvoice.member.name ||
            "-",

          memberPhone:
            freshInvoice.memberPhone ||
            freshInvoice.member.phone ||
            "-",

          memberEmail:
            freshInvoice.memberEmail ||
            freshInvoice.member.email ||
            "-",

          memberAddress:
            freshInvoice.member
              .address ||
            "-",

          referralDiscountAmount:
            paiseToRupees(
              freshInvoice
                .referralDiscountAmount ||
                0
            ),

          /*
           * Group fields are harmless for
           * individual invoices. The email
           * template may use them later.
           */
          groupMemberCount:
            freshInvoice
              .groupMemberCount ||
            null,

          groupDiscountPercentage:
            freshInvoice
              .groupDiscountPercentage ??
            null,

          invoiceNumber:
            freshInvoice
              .invoiceNumber,

          invoiceDate:
            formatDate(
              freshInvoice
                .createdAt
            ),

          salesRepName:
            freshInvoice
              .salesRepName ||
            "System",

          branchName:
            freshInvoice
              .branchName ||
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
              ).slice(
                0,
                300
              ),
          },

          serviceName:
            freshInvoice
              .serviceName,

          packageName:
            freshInvoice
              .packageName,

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
              : formattedEndDate,

          baseFee:
            paiseToRupees(
              Number(
                gstBreakdown
                  .baseFee
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
                gstBreakdown
                  .totalTax
              )
            ),

          cgstPercentage:
            setting
              ?.cgstPercentage
              ?.toFixed(2) ||
            "0.00",

          sgstPercentage:
            setting
              ?.sgstPercentage
              ?.toFixed(2) ||
            "0.00",

          finalAmount:
            paiseToRupees(
              freshInvoice
                .finalAmount
            ),

          packageAmount:
            paiseToRupees(
              freshInvoice
                .packageAmount
            ),

          discountAmount:
            paiseToRupees(
              freshInvoice
                .discountAmount
            ),

          paidAmount:
            paiseToRupees(
              freshInvoice
                .paidAmount
            ),

          balanceAmount:
            paiseToRupees(
              freshInvoice
                .balanceAmount
            ),

          paymentMode:
            currentPayment
              ?.paymentMode ||
            "-",

          paymentDate:
            currentPayment
              ? formatDate(
                  currentPayment
                    .paidAt ||
                    currentPayment
                      .createdAt
                )
              : "-",

          paymentHistory,

          invoiceUrl,

          portalUrl:
            memberPortal,
        },
      });
    } catch (error) {
      console.error(
        "Email notification failed:",
        freshInvoice.id,
        error
      );
    }
  };

export async function POST(
  req: NextRequest
) {
  try {
    // =====================================================
    // RAW BODY + SIGNATURE
    // =====================================================

    const rawBody =
      await req.text();

    const razorpaySignature =
      req.headers.get(
        "x-razorpay-signature"
      ) || "";

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",

          process.env
            .RAZORPAY_WEBHOOK_SECRET!
        )
        .update(rawBody)
        .digest("hex");

    const receivedSignatureBuffer =
      Buffer.from(
        razorpaySignature
      );

    const expectedSignatureBuffer =
      Buffer.from(
        expectedSignature
      );

    const validSignature =
      receivedSignatureBuffer.length ===
        expectedSignatureBuffer.length &&
      crypto.timingSafeEqual(
        receivedSignatureBuffer,
        expectedSignatureBuffer
      );

    if (!validSignature) {
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

    const event =
      JSON.parse(rawBody);

    if (
      event.event !==
      "payment.captured"
    ) {
      return NextResponse.json({
        received: true,
      });
    }

    const razorpayPayment =
      event.payload
        .payment.entity;

    const razorpayOrderId =
      String(
        razorpayPayment
          .order_id ||
          ""
      );

    const razorpayPaymentId =
      String(
        razorpayPayment.id ||
        ""
      );

    const paymentMethod =
      String(
        razorpayPayment
          .method ||
          "Online"
      );

    const paidAtDate =
      new Date(
        Number(
          razorpayPayment
            .created_at
        ) *
          1000
      );

    if (
      !razorpayOrderId ||
      !razorpayPaymentId
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Razorpay payment identifiers are missing.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // FIND ALL INTERNAL PAYMENT ALLOCATIONS
    // =====================================================

    /*
     * Individual checkout:
     *   paymentRecords.length === 1
     *
     * Group checkout:
     *   paymentRecords.length === N
     *
     * Every group payment row intentionally
     * shares the same razorpayOrderId.
     */
    const paymentRecords =
      await prisma.payment.findMany({
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

              subscription:
                true,
            },
          },
        },

        orderBy: {
          createdAt:
            "asc",
        },
      });

    if (
      paymentRecords.length === 0
    ) {
      console.log(
        "❌ Payment records not found:",
        razorpayOrderId
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Payment records not found",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // ORDER AMOUNT VERIFICATION
    // =====================================================

    const expectedAmount =
      paymentRecords.reduce(
        (
          total,
          payment
        ) =>
          total +
          Number(
            payment.amount
          ),

        0
      );

    const capturedAmount =
      Number(
        razorpayPayment.amount
      );

    if (
      Number.isFinite(
        capturedAmount
      ) &&
      capturedAmount !==
        expectedAmount
    ) {
      console.error(
        "❌ Razorpay amount mismatch",
        {
          razorpayOrderId,
          capturedAmount,
          expectedAmount,
        }
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Captured amount does not match the expected invoice allocation.",
        },
        {
          status: 400,
        }
      );
    }

    const allAlreadyPaid =
      paymentRecords.every(
        (payment) =>
          payment.status ===
          "PAID"
      );

    if (allAlreadyPaid) {
      console.log(
        "⚠️ Razorpay order already processed:",
        razorpayOrderId
      );

      return NextResponse.json({
        received: true,
      });
    }

    // =====================================================
    // TRANSACTION
    // =====================================================

    const processedPayments =
      await prisma.$transaction(
        async (
          tx
        ): Promise<
          ProcessedPayment[]
        > => {
          const processed:
            ProcessedPayment[] = [];

          for (
            const paymentRecord of
            paymentRecords
          ) {
            /*
             * Atomically claim this payment row.
             *
             * This is safer than relying only on
             * the status read before the transaction
             * when duplicate webhooks arrive together.
             */
            const claimed =
              await tx.payment.updateMany({
                where: {
                  id:
                    paymentRecord.id,

                  status: {
                    not:
                      "PAID",
                  },
                },

                data: {
                  status:
                    "PAID",

                  razorpayPaymentId,

                  razorpaySignature,

                  paidAt:
                    paidAtDate,

                  paymentMode:
                    formatPaymentMethod(
                      paymentMethod
                    ),
                },
              });

            if (
              claimed.count === 0
            ) {
              continue;
            }

            const invoice =
              paymentRecord.invoice;

            const invoiceTotal =
              Math.round(
                Number(
                  invoice
                    .finalAmount
                ) +
                  Number(
                    invoice
                      .totalTax ||
                      0
                  )
              );

            const updatedPaidAmount =
              Math.min(
                Number(
                  invoice
                    .paidAmount
                ) +
                  Number(
                    paymentRecord
                      .amount
                  ),

                invoiceTotal
              );

            const updatedBalanceAmount =
              Math.max(
                invoiceTotal -
                  updatedPaidAmount,

                0
              );

            const invoiceStatus =
              updatedBalanceAmount <=
              0
                ? "FULLY_PAID"
                : updatedPaidAmount >
                  0
                ? "PARTIAL_PAID"
                : "PENDING";

            await tx.invoice.update({
              where: {
                id:
                  invoice.id,
              },

              data: {
                paidAmount:
                  updatedPaidAmount,

                balanceAmount:
                  updatedBalanceAmount,

                status:
                  invoiceStatus,
              },
            });

            // =============================================
            // BALANCE PAYMENT
            // =============================================

            if (
              paymentRecord
                .paymentType ===
              "BALANCE"
            ) {
              processed.push({
                paymentId:
                  paymentRecord.id,

                invoiceId:
                  invoice.id,

                paymentType:
                  paymentRecord
                    .paymentType,

                finalSubscriptionEndDate:
                  invoice
                    .subscription
                    ?.endDate ||
                  null,
              });

              continue;
            }

            // =============================================
            // INITIAL PAYMENT
            // =============================================

            const metadata =
              parsePaymentMetadata(
                paymentRecord.notes
              );

            const orderNotes =
              (
                razorpayPayment.notes &&
                typeof razorpayPayment
                  .notes ===
                  "object"
              )
                ? razorpayPayment
                    .notes as
                    Record<
                      string,
                      unknown
                    >
                : {};

            const requestedStartDate =
              parseDate(
                metadata
                  .subscriptionStartDate
              ) ||
              parseDate(
                orderNotes
                  .subscriptionStartDate
              );

            const requestedEndDate =
              parseDate(
                metadata
                  .subscriptionEndDate
              ) ||
              parseDate(
                orderNotes
                  .subscriptionEndDate
              );

            let finalSubscriptionEndDate:
              | Date
              | null = null;

            /*
             * Prefer the explicit subscription ID
             * stored by the group-order endpoint.
             */
            let extensionSubscription =
              metadata
                .extensionSubscriptionId
                ? await tx
                    .subscription
                    .findUnique({
                      where: {
                        id:
                          metadata
                            .extensionSubscriptionId,
                      },
                    })
                : null;

            /*
             * Backward compatibility for older
             * individual invoices that may already
             * be linked to a subscription.
             */
            if (
              !extensionSubscription &&
              invoice.subscription
            ) {
              extensionSubscription =
                invoice.subscription;
            }

            /*
             * Final fallback for individual EXTEND
             * invoices that were not connected to the
             * active subscription during order creation.
             */
            if (
              !extensionSubscription &&
              invoice.intent ===
                "EXTEND"
            ) {
              extensionSubscription =
                await tx
                  .subscription
                  .findFirst({
                    where: {
                      memberId:
                        invoice.memberId,

                      status: {
                        in: [
                          "ACTIVE",
                          "FROZEN",
                        ],
                      },

                      endDate: {
                        gte:
                          new Date(),
                      },
                    },

                    orderBy: {
                      endDate:
                        "desc",
                    },
                  });
            }

            if (
              invoice.intent ===
                "EXTEND" &&
              extensionSubscription
            ) {
              const newEndDate =
                requestedEndDate ||
                addDaysUTC(
                  extensionSubscription
                    .endDate,

                  invoice
                    .packageDurationInDays
                );

              await tx
                .subscription
                .update({
                  where: {
                    id:
                      extensionSubscription
                        .id,
                  },

                  data: {
                    endDate:
                      newEndDate,
                  },
                });

              /*
               * Do not connect this new extension
               * invoice to the existing subscription.
               *
               * In the current schema, a subscription
               * is normally linked to its original
               * invoice. Reconnecting it can violate a
               * one-to-one relation or detach the
               * original invoice.
               */
              finalSubscriptionEndDate =
                newEndDate;

              console.log(
                "✅ Subscription extended:",
                {
                  invoiceId:
                    invoice.id,

                  subscriptionId:
                    extensionSubscription
                      .id,
                }
              );
            } else {
              const startDate =
                requestedStartDate ||
                nowUTC();

              const endDate =
                requestedEndDate ||
                addDaysUTC(
                  startDate,

                  invoice
                    .packageDurationInDays
                );

              const subscription =
                await tx
                  .subscription
                  .create({
                    data: {
                      memberId:
                        invoice.memberId,

                      branchId:
                        invoice.branchId,

                      packageId:
                        invoice.packageId,

                      invoiceId:
                        invoice.id,

                      serviceName:
                        invoice
                          .serviceName,
                          usageType: invoice.package.usageType,
                          totalSessions: invoice.package.totalSessions,
                      packageName:
                        invoice
                          .packageName,

                      packageDurationInDays:
                        invoice
                          .packageDurationInDays,

                      originalPrice:
                        invoice
                          .packageAmount,

                      finalPrice:
                        invoice
                          .finalAmount,

                      branchName:
                        invoice
                          .branchName,

                      startDate,
                      endDate,

                      status:
                        "ACTIVE",
                    },
                  });

              await tx.invoice.update({
                where: {
                  id:
                    invoice.id,
                },

                data: {
                  subscription: {
                    connect: {
                      id:
                        subscription.id,
                    },
                  },
                },
              });

              finalSubscriptionEndDate =
                endDate;

              console.log(
                "🆕 Subscription created:",
                {
                  invoiceId:
                    invoice.id,

                  subscriptionId:
                    subscription.id,
                }
              );
            }

            processed.push({
              paymentId:
                paymentRecord.id,

              invoiceId:
                invoice.id,

              paymentType:
                paymentRecord
                  .paymentType,

              finalSubscriptionEndDate,
            });
          }

          return processed;
        }
      );

    // =====================================================
    // POST-PAYMENT SIDE EFFECTS
    // =====================================================

    /*
     * Database payment processing is already
     * committed. Referral or notification
     * failures must not roll it back.
     */
    for (
      const processed of
      processedPayments
    ) {
      if (
        processed.paymentType !==
        "INITIAL"
      ) {
        continue;
      }

      await processReferralReward(
        processed.invoiceId
      );

      if (
        processed
          .finalSubscriptionEndDate
      ) {
        try {
          await sendMembershipNotification({
            invoiceId:
              processed.invoiceId,

            paymentId:
              processed.paymentId,

            finalSubscriptionEndDate:
              processed
                .finalSubscriptionEndDate,
          });
        } catch (error) {
          console.error(
            "Membership notification failed:",
            processed.invoiceId,
            error
          );
        }
      }
    }

    console.log(
      "✅ Razorpay payment processed",
      {
        razorpayOrderId,

        allocationsProcessed:
          processedPayments.length,

        checkoutType:
          paymentRecords.length >
          1
            ? "GROUP"
            : "INDIVIDUAL",
      }
    );

    return NextResponse.json({
      received: true,

      processed:
        processedPayments.length,
    });
  } catch (error) {
    console.error(
      "🔥 WEBHOOK ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to process Razorpay webhook.",
      },
      {
        status: 500,
      }
    );
  }
}