import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import Razorpay from "razorpay";
  import crypto from "node:crypto";
  
  import { prisma } from "@/prisma";
  
  import {
    calculateGSTBreakdownFormatted,
    generateReferralCode,
  } from "@/app/utils/helper";
  
  import {
    addDaysUTC,
    nowUTC,
  } from "@/app/utils/date";
  
  import {
    getUserFromRequest,
  } from "@/app/utils/auth";
  
  const razorpay = new Razorpay({
    key_id:
      process.env.RAZORPAY_KEY_ID!,
  
    key_secret:
      process.env
        .RAZORPAY_KEY_SECRET!,
  });
  
  type GroupMemberInput = {
    name: string;
    phone: string;
    email: string;
  };
  
  type GroupDiscountRule = {
    minMembers: number;
    maxMembers: number;
    discountPercentage: number;
  };
  
  const PHONE_REGEX =
    /^[6-9]\d{9}$/;
  
  const EMAIL_REGEX =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  const normalizeMembers = (
    value: unknown
  ): GroupMemberInput[] | null => {
    if (!Array.isArray(value)) {
      return null;
    }
  
    const members:
      GroupMemberInput[] = [];
  
    for (const item of value) {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return null;
      }
  
      const input =
        item as Record<
          string,
          unknown
        >;
  
      const name =
        String(
          input.name || ""
        ).trim();
  
      const phone =
        String(
          input.phone || ""
        )
          .replace(/\D/g, "")
          .slice(0, 10);
  
      const email =
        String(
          input.email || ""
        )
          .trim()
          .toLowerCase();
  
      members.push({
        name,
        phone,
        email,
      });
    }
  
    return members;
  };
  
  const parseGroupRules = (
    value: unknown
  ): GroupDiscountRule[] => {
    if (!Array.isArray(value)) {
      return [];
    }
  
    return value
      .map((item) => {
        if (
          typeof item !== "object" ||
          item === null
        ) {
          return null;
        }
  
        const input =
          item as Record<
            string,
            unknown
          >;
  
        const minMembers =
          Number(
            input.minMembers
          );
  
        const maxMembers =
          Number(
            input.maxMembers
          );
  
        const discountPercentage =
          Number(
            input
              .discountPercentage
          );
  
        if (
          !Number.isInteger(
            minMembers
          ) ||
          !Number.isInteger(
            maxMembers
          ) ||
          !Number.isFinite(
            discountPercentage
          )
        ) {
          return null;
        }
  
        return {
          minMembers,
          maxMembers,
          discountPercentage,
        };
      })
      .filter(
        (
          rule
        ): rule is GroupDiscountRule =>
          rule !== null
      )
      .sort(
        (a, b) =>
          a.minMembers -
          b.minMembers
      );
  };
  
  const uniqueCode = (
    prefix: string
  ) => {
    return (
      `${prefix}-${Date.now()}-` +
      crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase()
    );
  };
  
  export const POST = async (
    req: NextRequest
  ) => {
    try {
      /*
       * This endpoint is public, but an authenticated
       * admin session may still be present. It is used
       * only for the invoice sales-rep snapshot.
       */
      const user =
        await getUserFromRequest(
          req
        );
  
      const body =
        await req.json();
  
      const {
        branchId,
        packageId,
        extendPhones = [],
      } = body;
  
      const members =
        normalizeMembers(
          body.members
        );
  
      // =====================================================
      // REQUEST VALIDATION
      // =====================================================
  
      if (
        !branchId ||
        !packageId ||
        !members
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Branch, package and member details are required.",
          },
          {
            status: 400,
          }
        );
      }
  
      const setting =
        await prisma.setting.findFirst();
  
      if (!setting) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Group membership settings are unavailable.",
          },
          {
            status: 400,
          }
        );
      }
  
      if (
        !setting
          .groupJoiningEnabled
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Group joining is currently unavailable.",
          },
          {
            status: 400,
          }
        );
      }
  
      const maximumMembers =
  Number(
    setting.groupJoiningMaxMembers
  ) || 10;

/*
 * This endpoint is specifically for
 * group checkout, so at least 2 actual
 * members must be submitted.
 *
 * This has NOTHING to do with
 * groupJoiningMaxMembers.
 */
if (members.length < 2) {
  return NextResponse.json(
    {
      success: false,
      message:
        "Group checkout requires at least 2 members.",
    },
    {
      status: 400,
    }
  );
}

/*
 * groupJoiningMaxMembers is ONLY
 * the upper limit configured by admin.
 */
if (
  members.length >
  maximumMembers
) {
  return NextResponse.json(
    {
      success: false,
      message:
        `Maximum ${maximumMembers} members are allowed in one group.`,
    },
    {
      status: 400,
    }
  );
}
  
      for (
        let index = 0;
        index < members.length;
        index += 1
      ) {
        const member =
          members[index];
  
        if (
          !member.name ||
          !member.phone ||
          !member.email
        ) {
          return NextResponse.json(
            {
              success: false,
  
              message:
                `Complete all details for Member ${index + 1}.`,
            },
            {
              status: 400,
            }
          );
        }
  
        if (
          !PHONE_REGEX.test(
            member.phone
          )
        ) {
          return NextResponse.json(
            {
              success: false,
  
              message:
                `Enter a valid mobile number for Member ${index + 1}.`,
            },
            {
              status: 400,
            }
          );
        }
  
        if (
          !EMAIL_REGEX.test(
            member.email
          )
        ) {
          return NextResponse.json(
            {
              success: false,
  
              message:
                `Enter a valid email address for Member ${index + 1}.`,
            },
            {
              status: 400,
            }
          );
        }
      }
  
      const phones =
        members.map(
          (member) =>
            member.phone
        );
  
      const emails =
        members.map(
          (member) =>
            member.email
        );
  
      if (
        new Set(phones).size !==
        phones.length
      ) {
        return NextResponse.json(
          {
            success: false,
  
            message:
              "Each group member must use a different mobile number.",
          },
          {
            status: 400,
          }
        );
      }
  
      if (
        new Set(emails).size !==
        emails.length
      ) {
        return NextResponse.json(
          {
            success: false,
  
            message:
              "Each group member must use a different email address.",
          },
          {
            status: 400,
          }
        );
      }
  
      // =====================================================
      // GROUP DISCOUNT RULE
      // =====================================================
  
      const rules =
        parseGroupRules(
          setting
            .groupDiscountRules
        );
  
      const matchingRule =
        rules.find(
          (rule) =>
            members.length >=
              rule.minMembers &&
            members.length <=
              rule.maxMembers
        );
  
      if (!matchingRule) {
        return NextResponse.json(
          {
            success: false,
  
            message:
              `No group offer is configured for ${members.length} members.`,
          },
          {
            status: 400,
          }
        );
      }
  
      const groupDiscountPercentage =
        Number(
          matchingRule
            .discountPercentage
        );
  
      if (
        groupDiscountPercentage <=
          0 ||
        groupDiscountPercentage >
          100
      ) {
        return NextResponse.json(
          {
            success: false,
  
            message:
              "The configured group discount is invalid.",
          },
          {
            status: 400,
          }
        );
      }
  
      // =====================================================
      // PACKAGE AND BRANCH
      // =====================================================
  
      const selectedPackage =
        await prisma
          .servicePackage
          .findFirst({
            where: {
              id:
                packageId,
  
              isActive:
                true,
            },
  
            include: {
              service:
                true,
            },
          });
  
      if (!selectedPackage) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Package not found.",
          },
          {
            status: 404,
          }
        );
      }
  
      const branch =
        await prisma.branch.findUnique({
          where: {
            id:
              branchId,
          },
        });
  
      if (!branch) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Branch not found.",
          },
          {
            status: 404,
          }
        );
      }
  
      // =====================================================
      // EXISTING MEMBER IDENTITY CHECKS
      // =====================================================
  
      const existingMembers =
        await prisma.member.findMany({
          where: {
            OR: [
              {
                phone: {
                  in:
                    phones,
                },
              },
  
              {
                email: {
                  in:
                    emails,
                },
              },
            ],
          },
        });
  
      const memberByPhone =
        new Map(
          existingMembers.map(
            (member) => [
              member.phone,
              member,
            ]
          )
        );
  
      const memberByEmail =
        new Map(
          existingMembers
            .filter(
              (member) =>
                Boolean(
                  member.email
                )
            )
            .map(
              (member) => [
                member.email!,
                member,
              ]
            )
        );
  
      for (
        const input of members
      ) {
        const byPhone =
          memberByPhone.get(
            input.phone
          );
  
        const byEmail =
          memberByEmail.get(
            input.email
          );
  
        if (
          byPhone &&
          byEmail &&
          byPhone.id !==
            byEmail.id
        ) {
          return NextResponse.json(
            {
              success: false,
  
              message:
                `The phone and email entered for ${input.name} belong to different member accounts.`,
            },
            {
              status: 409,
            }
          );
        }
  
        if (
          byEmail &&
          byEmail.phone !==
            input.phone
        ) {
          return NextResponse.json(
            {
              success: false,
  
              message:
                `The email entered for ${input.name} is already used by another member.`,
            },
            {
              status: 409,
            }
          );
        }
  
        if (
          byPhone &&
          byPhone.email &&
          byPhone.email
            .toLowerCase() !==
            input.email
        ) {
          return NextResponse.json(
            {
              success: false,
  
              message:
                `${input.name}'s mobile number is already registered with a different email address.`,
            },
            {
              status: 409,
            }
          );
        }
      }
  
      // =====================================================
      // ACTIVE MEMBERSHIP CONFIRMATION
      // =====================================================
  
      const existingMemberIds =
        existingMembers.map(
          (member) =>
            member.id
        );
  
      const activeSubscriptions =
        existingMemberIds.length > 0
          ? await prisma
              .subscription
              .findMany({
                where: {
                  memberId: {
                    in:
                      existingMemberIds,
                  },
  
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
              })
          : [];
  
      /*
       * Keep only the furthest-ending active
       * subscription for each member.
       */
      const activeSubscriptionByMember =
        new Map<
          string,
          (typeof activeSubscriptions)[number]
        >();
  
      for (
        const subscription of
        activeSubscriptions
      ) {
        if (
          !activeSubscriptionByMember.has(
            subscription.memberId
          )
        ) {
          activeSubscriptionByMember.set(
            subscription.memberId,
            subscription
          );
        }
      }
  
      const normalizedExtendPhones =
        Array.isArray(
          extendPhones
        )
          ? new Set(
              extendPhones.map(
                (phone) =>
                  String(phone)
                    .replace(
                      /\D/g,
                      ""
                    )
                    .slice(
                      0,
                      10
                    )
              )
            )
          : new Set<string>();
  
      const activeMembersNeedingConfirmation =
        members.flatMap(
          (input) => {
            const existingMember =
              memberByPhone.get(
                input.phone
              );
  
            if (!existingMember) {
              return [];
            }
  
            const activeSubscription =
              activeSubscriptionByMember.get(
                existingMember.id
              );
  
            if (
              !activeSubscription ||
              normalizedExtendPhones.has(
                input.phone
              )
            ) {
              return [];
            }
  
            return [
              {
                memberId:
                  existingMember.id,
  
                name:
                  existingMember.name ||
                  input.name,
  
                phone:
                  existingMember.phone,
  
                endDate:
                  activeSubscription
                    .endDate
                    .toISOString(),
              },
            ];
          }
        );
  
      if (
        activeMembersNeedingConfirmation
          .length > 0
      ) {
        return NextResponse.json(
          {
            success: false,
  
            requiresConfirmation:
              true,
  
            message:
              "Some members already have active memberships.",
  
            activeMembers:
              activeMembersNeedingConfirmation,
          },
          {
            status: 409,
          }
        );
      }
  
      // =====================================================
      // SERVER-SIDE PRICE CALCULATION
      // =====================================================
  
      const packageAmount =
        Number(
          selectedPackage.price
        );
  
      const discountPerMember =
        Math.round(
          packageAmount *
            (
              groupDiscountPercentage /
              100
            )
        );
  
      const finalAmountPerMember =
        Math.max(
          packageAmount -
            discountPerMember,
  
          0
        );
  
      const gstBreakdown =
        await calculateGSTBreakdownFormatted(
          finalAmountPerMember
        );
  
      const cgstPerMember =
        Number(
          gstBreakdown.cgst
        );
  
      const sgstPerMember =
        Number(
          gstBreakdown.sgst
        );
  
      const totalTaxPerMember =
        Number(
          gstBreakdown.totalTax
        );
  
      const invoiceTotalPerMember =
        Math.round(
          finalAmountPerMember +
            totalTaxPerMember
        );
  
      if (
        invoiceTotalPerMember <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
  
            message:
              "The group payable amount must be greater than zero.",
          },
          {
            status: 400,
          }
        );
      }
  
      const totalPayable =
        invoiceTotalPerMember *
        members.length;
  
      // =====================================================
      // ONE RAZORPAY ORDER
      // =====================================================
  
      const razorpayOrder =
        await razorpay.orders.create({
          amount:
            totalPayable,
  
          currency:
            "INR",
  
          receipt:
            `fuel_group_${Date.now()}`,
  
          notes: {
            purchaseType:
              "GROUP",
  
            memberCount:
              String(
                members.length
              ),
  
            packageId:
              selectedPackage.id,
  
            branchId:
              branch.id,
  
            groupDiscountPercentage:
              String(
                groupDiscountPercentage
              ),
  
            perMemberInvoiceTotal:
              String(
                invoiceTotalPerMember
              ),
          },
        });
  
      // =====================================================
      // CREATE N NORMAL MEMBERS / INVOICES / PAYMENTS
      // =====================================================
  
      const createdInvoices =
        await prisma.$transaction(
          async (tx) => {
            const invoiceIds:
              string[] = [];
  
            for (
              let index = 0;
              index <
              members.length;
              index += 1
            ) {
              const input =
                members[index];
  
              let member =
                memberByPhone.get(
                  input.phone
                );
  
              if (!member) {
                member =
                  await tx.member.create({
                    data: {
                      name:
                        input.name,
  
                      phone:
                        input.phone,
  
                      email:
                        input.email,
  
                      referralCode:
                        generateReferralCode(
                          input.name
                        ),
  
                      branchId:
                        branch.id,
  
                      status:
                        "ACTIVE",
                    },
                  });
              } else if (
                !member.email
              ) {
                member =
                  await tx.member.update({
                    where: {
                      id:
                        member.id,
                    },
  
                    data: {
                      email:
                        input.email,
                    },
                  });
              }
  
              const activeSubscription =
                activeSubscriptionByMember.get(
                  member.id
                );
  
              const shouldExtend =
                Boolean(
                  activeSubscription
                ) &&
                normalizedExtendPhones.has(
                  input.phone
                );
  
              const intent:
                | "NEW"
                | "EXTEND" =
                shouldExtend
                  ? "EXTEND"
                  : "NEW";
  
              const subscriptionStartDate =
                shouldExtend &&
                activeSubscription
                  ? activeSubscription
                      .endDate
                  : nowUTC();
  
              const subscriptionEndDate =
                addDaysUTC(
                  subscriptionStartDate,
                  selectedPackage
                    .durationInDays
                );
  
              const invoice =
                await tx.invoice.create({
                  data: {
                    invoiceNumber:
                      uniqueCode(
                        "INV"
                      ),
  
                    memberId:
                      member.id,
  
                    branchId:
                      branch.id,
  
                    packageId:
                      selectedPackage.id,
  
                    salesRepId:
                      user?.id ||
                      null,
  
                    salesRepName:
                      user?.name ||
                      "Website",
  
                    intent,
  
                    serviceName:
                      selectedPackage
                        .service.name,
  
                    packageName:
                      selectedPackage
                        .name,
  
                    packageDurationInDays:
                      selectedPackage
                        .durationInDays,
  
                    branchName:
                      branch.name,
  
                    memberName:
                      input.name,
  
                    memberPhone:
                      input.phone,
  
                    memberEmail:
                      input.email,
  
                    packageAmount,
  
                    discountAmount:
                      discountPerMember,
  
                    /*
                     * These two fields were added
                     * for the group invoice snapshot.
                     */
                    groupMemberCount:
                      members.length,
  
                    groupDiscountPercentage,
  
                    /*
                     * Group checkout does not combine
                     * coupons or referral discounts.
                     */
                    referralDiscountAmount:
                      0,
  
                    finalAmount:
                      finalAmountPerMember,
  
                    paidAmount:
                      0,
  
                    balanceAmount:
                      invoiceTotalPerMember,
  
                    cgstPercentage:
                      setting
                        .cgstPercentage,
  
                    sgstPercentage:
                      setting
                        .sgstPercentage,
  
                    cgstAmount:
                      cgstPerMember,
  
                    sgstAmount:
                      sgstPerMember,
  
                    totalTax:
                      totalTaxPerMember,
  
                    notes:
                      `Group joining offer — ${members.length} members — ${groupDiscountPercentage}% discount`,
  
                    status:
                      "PENDING",
                  },
                });
  
              /*
               * Payment notes are machine-readable.
               * The webhook will use them to create
               * or extend the correct subscription.
               */
              const paymentMetadata = {
                purchaseType:
                  "GROUP",
  
                memberIndex:
                  index + 1,
  
                memberCount:
                  members.length,
  
                intent,
  
                extensionSubscriptionId:
                  shouldExtend &&
                  activeSubscription
                    ? activeSubscription.id
                    : null,
  
                subscriptionStartDate:
                  subscriptionStartDate
                    .toISOString(),
  
                subscriptionEndDate:
                  subscriptionEndDate
                    .toISOString(),
  
                groupDiscountPercentage,
              };
  
              await tx.payment.create({
                data: {
                  receiptNumber:
                    uniqueCode(
                      "RCPT-GRP"
                    ),
  
                  invoiceId:
                    invoice.id,
  
                  memberId:
                    member.id,
  
                  amount:
                    invoiceTotalPerMember,
  
                  paymentMode:
                    "Razorpay",
  
                  paymentType:
                    "INITIAL",
  
                  /*
                   * Your current enum uses FAILED
                   * as the pre-payment state.
                   */
                  status:
                    "FAILED",
  
                  /*
                   * All N records intentionally share
                   * this Razorpay order ID.
                   */
                  razorpayOrderId:
                    razorpayOrder.id,
  
                  notes:
                    JSON.stringify(
                      paymentMetadata
                    ),
                },
              });
  
              invoiceIds.push(
                invoice.id
              );
            }
  
            return invoiceIds;
          }
        );
  
      // =====================================================
      // RESPONSE
      // =====================================================
  
      return NextResponse.json({
        success: true,
  
        purchaseType:
          "GROUP",
  
        orderId:
          razorpayOrder.id,
  
        amount:
          totalPayable,
  
        currency:
          "INR",
  
        memberCount:
          members.length,
  
        groupDiscountPercentage,
  
        discountPerMember,
  
        finalAmountPerMember,
  
        gstPerMember:
          totalTaxPerMember,
  
        perMemberAmount:
          invoiceTotalPerMember,
  
        totalAmount:
          totalPayable,
  
        invoiceIds:
          createdInvoices,
  
        payer:
          members[0],
  
        package: {
          id:
            selectedPackage.id,
  
          name:
            selectedPackage.name,
  
          serviceName:
            selectedPackage
              .service.name,
        },
      });
    } catch (error) {
      console.error(
        "Create group order error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
  
          message:
            "Unable to create the group checkout.",
        },
        {
          status: 500,
        }
      );
    }
  };