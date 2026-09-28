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

// =====================================================
// RAZORPAY
// =====================================================

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// =====================================================
// TYPES
// =====================================================

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

// =====================================================
// VALIDATION
// =====================================================

const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =====================================================
// NORMALIZE MEMBERS
// =====================================================

const normalizeMembers = (
  value: unknown
): GroupMemberInput[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const members: GroupMemberInput[] = [];

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null
    ) {
      return null;
    }

    const input =
      item as Record<string, unknown>;

    const name =
      String(input.name || "").trim();

    const phone =
      String(input.phone || "")
        .replace(/\D/g, "")
        .slice(0, 10);

    const email =
      String(input.email || "")
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

// =====================================================
// GROUP DISCOUNT RULES
// =====================================================

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
        item as Record<string, unknown>;

      const minMembers =
        Number(input.minMembers);

      const maxMembers =
        Number(input.maxMembers);

      const discountPercentage =
        Number(
          input.discountPercentage
        );

      if (
        !Number.isInteger(minMembers) ||
        !Number.isInteger(maxMembers) ||
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
        a.minMembers - b.minMembers
    );
};

// =====================================================
// UNIQUE CODE
// =====================================================

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

// =====================================================
// POST
// =====================================================

export const POST = async (
  req: NextRequest
) => {
  try {
    // =====================================================
    // AUTH USER
    // =====================================================

    const user =
      await getUserFromRequest(req);

    const body =
      await req.json();

    const {
      branchId,
      packageId,
      subCategoryId,
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
      !subCategoryId ||
      !members
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Branch, subcategory, package and member details are required.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // SETTINGS
    // =====================================================

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
      !setting.groupJoiningEnabled
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

    // =====================================================
    // GROUP MEMBER COUNT
    // =====================================================

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

    // =====================================================
    // VALIDATE EACH MEMBER
    // =====================================================

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

    // =====================================================
    // UNIQUE PHONE / EMAIL
    // =====================================================

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
        setting.groupDiscountRules
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
        matchingRule.discountPercentage
      );

    if (
      groupDiscountPercentage <= 0 ||
      groupDiscountPercentage > 100
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
    // PACKAGE
    // =====================================================

    const selectedPackage =
      await prisma.servicePackage.findFirst({
        where: {
          id: packageId,
          isActive: true,
        },
        include: {
          service: true,
          subCategories: true,
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

    // =====================================================
    // SUBCATEGORY
    // =====================================================

    const selectedSubCategory =
      await prisma.serviceSubCategory.findUnique({
        where: {
          id: subCategoryId,
        },
      });

    if (!selectedSubCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Subcategory not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // SUBCATEGORY ACTIVE
    // =====================================================

    if (
      !selectedSubCategory.isActive
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This subcategory is currently unavailable.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // PACKAGE ↔ SUBCATEGORY
    // =====================================================

    const packageBelongsToSubCategory =
      selectedPackage.subCategories.some(
        (relation) =>
          relation.subCategoryId ===
          subCategoryId
      );

    if (
      !packageBelongsToSubCategory
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected package does not belong to the selected subcategory.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // SERVICE ↔ SUBCATEGORY
    // =====================================================

    if (
      selectedSubCategory.serviceId !==
      selectedPackage.serviceId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Subcategory does not belong to the selected service.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // BRANCH
    // =====================================================

    const branch =
      await prisma.branch.findUnique({
        where: {
          id: branchId,
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
    // EXISTING MEMBERS
    // =====================================================

    const existingMembers =
      await prisma.member.findMany({
        where: {
          OR: [
            {
              phone: {
                in: phones,
              },
            },
            {
              email: {
                in: emails,
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
              Boolean(member.email)
          )
          .map(
            (member) => [
              member.email!,
              member,
            ]
          )
      );

    // =====================================================
    // MEMBER IDENTITY VALIDATION
    // =====================================================

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
    // EXISTING MEMBER IDS
    // =====================================================

    const existingMemberIds =
      existingMembers.map(
        (member) =>
          member.id
      );

    // =====================================================
    // IMPORTANT:
    //
    // ONLY FIND ACTIVE SUBSCRIPTIONS THAT MATCH
    // THE SELECTED SUBCATEGORY + PACKAGE.
    //
    // This is the main fix.
    // =====================================================

    const activeSubscriptions =
      existingMemberIds.length > 0
        ? await prisma.subscription.findMany({
            where: {
              memberId: {
                in: existingMemberIds,
              },

              status: {
                in: [
                  "ACTIVE",
                  "FROZEN",
                ],
              },

              endDate: {
                gte: new Date(),
              },

              // IMPORTANT
              // Same subcategory only
              subCategoryId,

              // IMPORTANT
              // Same package only
              packageId,
            },

            orderBy: {
              endDate: "desc",
            },
          })
        : [];

    // =====================================================
    // ACTIVE SUBSCRIPTION MAP
    // =====================================================

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

    // =====================================================
    // EXTENSION PHONES
    // =====================================================

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

    // =====================================================
    // CHECK EXTENSION REQUESTS
    // =====================================================

    for (
      const input of members
    ) {
      const existingMember =
        memberByPhone.get(
          input.phone
        );

      if (!existingMember) {
        if (
          normalizedExtendPhones.has(
            input.phone
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                `${input.name} cannot be extended because this member does not exist.`,
            },
            {
              status: 409,
            }
          );
        }

        continue;
      }

      const activeSubscription =
        activeSubscriptionByMember.get(
          existingMember.id
        );

      const requestedExtension =
        normalizedExtendPhones.has(
          input.phone
        );

      // User requested extension but there is
      // no matching package/subcategory subscription.
      if (
        requestedExtension &&
        !activeSubscription
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${input.name} cannot be extended because they do not have an active membership for the selected package and subcategory.`,
          },
          {
            status: 409,
          }
        );
      }
    }

    // =====================================================
    // ACTIVE MEMBERS NEEDING CONFIRMATION
    //
    // IMPORTANT:
    // Only matching package + subcategory
    // memberships are considered here.
    // =====================================================

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
                activeSubscription.endDate.toISOString(),

              // Useful for frontend/debugging
              packageId:
                activeSubscription.packageId,

              subCategoryId:
                activeSubscription.subCategoryId,
            },
          ];
        }
      );

    if (
      activeMembersNeedingConfirmation.length >
      0
    ) {
      return NextResponse.json(
        {
          success: false,

          requiresConfirmation:
            true,

          message:
            "Some members already have active memberships for this package and subcategory.",

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

          serviceId:
            selectedPackage.serviceId,

          subCategoryId:
            selectedSubCategory.id,

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
    // CREATE MEMBERS / INVOICES / PAYMENTS
    // =====================================================

    const createdInvoices =
      await prisma.$transaction(
        async (tx) => {
          const invoiceIds:
            string[] = [];

          for (
            let index = 0;
            index < members.length;
            index += 1
          ) {
            const input =
              members[index];

            // =================================================
            // FIND EXISTING MEMBER
            // =================================================

            let member =
              memberByPhone.get(
                input.phone
              );

            // =================================================
            // CREATE MEMBER
            // =================================================

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
            }

            // =================================================
            // UPDATE EMAIL IF MISSING
            // =================================================

            else if (
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

            // =================================================
            // FIND MATCHING ACTIVE SUBSCRIPTION
            //
            // IMPORTANT:
            // This map contains ONLY subscriptions
            // matching packageId + subCategoryId.
            // =================================================

            const activeSubscription =
              activeSubscriptionByMember.get(
                member.id
              );

            // =================================================
            // EXTENSION REQUEST
            // =================================================

            const requestedExtension =
              normalizedExtendPhones.has(
                input.phone
              );

            // =================================================
            // FINAL EXTENSION DECISION
            // =================================================

            const shouldExtend =
              requestedExtension &&
              Boolean(
                activeSubscription
              );

            // =================================================
            // SAFETY CHECK
            // =================================================

            if (
              requestedExtension &&
              !activeSubscription
            ) {
              throw new Error(
                `Cannot extend member ${member.id}: matching active subscription not found.`
              );
            }

            // =================================================
            // INTENT
            // =================================================

            const intent:
              | "NEW"
              | "EXTEND" =
              shouldExtend
                ? "EXTEND"
                : "NEW";

            // =================================================
            // SUBSCRIPTION DATES
            // =================================================

            const subscriptionStartDate =
              shouldExtend &&
              activeSubscription
                ? activeSubscription.endDate
                : nowUTC();

            const subscriptionEndDate =
              addDaysUTC(
                subscriptionStartDate,
                selectedPackage.durationInDays
              );

            // =================================================
            // INVOICE
            // =================================================

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

                  // =================================================
                  // SNAPSHOTS
                  // =================================================

                  serviceName:
                    selectedPackage
                      .service
                      .name,

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

                  groupMemberCount:
                    members.length,

                  groupDiscountPercentage,

                  referralDiscountAmount:
                    0,

                  finalAmount:
                    finalAmountPerMember,

                  paidAmount:
                    0,

                  balanceAmount:
                    invoiceTotalPerMember,

                  cgstPercentage:
                    setting.cgstPercentage,

                  sgstPercentage:
                    setting.sgstPercentage,

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

            // =================================================
            // PAYMENT METADATA
            //
            // IMPORTANT:
            // Webhook must use extensionSubscriptionId
            // instead of searching for ANY active
            // subscription.
            // =================================================

            const paymentMetadata = {
              purchaseType:
                "GROUP",

              memberIndex:
                index + 1,

              memberCount:
                members.length,

              serviceId:
                selectedPackage.serviceId,

              subCategoryId:
                selectedSubCategory.id,

              packageId:
                selectedPackage.id,

              branchId:
                branch.id,

              intent,

              extensionSubscriptionId:
                shouldExtend &&
                activeSubscription
                  ? activeSubscription.id
                  : null,

              subscriptionStartDate:
                subscriptionStartDate.toISOString(),

              subscriptionEndDate:
                subscriptionEndDate.toISOString(),

              groupDiscountPercentage,

              invoiceId:
                invoice.id,

              memberId:
                member.id,

              razorpayOrderId:
                razorpayOrder.id,
            };

            // =================================================
            // PAYMENT
            // =================================================

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

                status:
                  "FAILED",

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

      // =================================================
      // SERVICE
      // =================================================

      service: {
        id:
          selectedPackage.serviceId,

        name:
          selectedPackage
            .service
            .name,
      },

      // =================================================
      // SUBCATEGORY
      // =================================================

      subCategory: {
        id:
          selectedSubCategory.id,

        name:
          selectedSubCategory.name,
      },

      // =================================================
      // PACKAGE
      // =================================================

      package: {
        id:
          selectedPackage.id,

        name:
          selectedPackage.name,
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