import { getUserFromRequest } from "@/app/utils/auth";
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
  NextRequest,
  NextResponse,
} from "next/server";
import Razorpay from "razorpay";

const rp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const POST = async (req: NextRequest) => {
  try {
    const user = await getUserFromRequest(req);

    const body = await req.json();

    const {
      // =========================================
      // ADMIN FLOW
      // =========================================
      memberId,
      ref,

      // =========================================
      // LANDING PAGE FLOW
      // =========================================
      name,
      phone,
      email,

      // =========================================
      // COMMON
      // =========================================
      packageId,
      subCategoryId,
      branchId,

      discountAmount = 0,
      paidAmount = 0,
      initialPaymentMethod = "Online",
      referralDiscountAmount = 0,

      notes,

      startDate,
      endDate,

      extend = false,
    } = body;

    // =====================================================
    // VALIDATION
    // =====================================================


    if (!packageId || !branchId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // SUBCATEGORY VALIDATION
    // ====

    // =====================================================
    // MEMBER VALIDATION
    // =====================================================

    if (!memberId && (!name || !phone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Member details are required",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // MEMBER
    // =====================================================

    let member = null;

    // =====================================================
    // ADMIN FLOW
    // =====================================================

    if (memberId) {
      member = await prisma.member.findUnique({
        where: {
          id: memberId,
        },
      });

      if (!member) {
        return NextResponse.json(
          {
            success: false,
            message: "Member not found",
          },
          { status: 404 }
        );
      }
    }

    // =====================================================
    // LANDING PAGE FLOW
    // =====================================================

    else {
      member = await prisma.member.findFirst({
        where: {
          OR: [
            {
              phone,
            },
            ...(email
              ? [
                  {
                    email,
                  },
                ]
              : []),
          ],
        },
      });

      // Create member if not found
      if (!member) {
        member = await prisma.member.create({
          data: {
            name,
            phone,
            email: email || null,
            referralCode: generateReferralCode(name),
            branchId,
            status: "ACTIVE",
          },
        });
      }
    }

    // =====================================================
    // REFERRAL
    // =====================================================

    if (ref) {
      const referrer =
        await prisma.member.findUnique({
          where: {
            referralCode: ref,
          },
        });

      if (
        referrer &&
        referrer.id !== member.id
      ) {
        const existingReferral =
          await prisma.referral.findFirst({
            where: {
              referredMemberId: member.id,
            },
          });

        if (!existingReferral) {
          await prisma.referral.create({
            data: {
              referrerId: referrer.id,
              referredMemberId: member.id,
              status: "JOINED",
              rewardAmount: 0,
            },
          });
        }
      }
    }

    // =====================================================
    // PACKAGE
    // =====================================================

    const selectedPackage =
      await prisma.servicePackage.findUnique({
        where: {
          id: packageId,
          isActive: true,
        },
        include: {
          service: true,
          subCategories: true,
          coupons: true,
        },
      });

    if (!selectedPackage) {
      return NextResponse.json(
        {
          success: false,
          message: "Package not found",
        },
        { status: 404 }
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


    // =====================================================
    // SUBCATEGORY MUST BE ACTIVE
    // =====================================================


    // =====================================================
    // PACKAGE ↔ SUBCATEGORY VALIDATION
    // =====================================================

   

    // =====================================================
    // SERVICE ↔ SUBCATEGORY VALIDATION
    // =====================================================


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
          message: "Branch not found",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // SUBCATEGORY-AWARE ACTIVE SUBSCRIPTION CHECK
    // =====================================================
    //
    // IMPORTANT:
    //
    // Previously this searched only by memberId.
    //
    // That meant:
    //
    // Subcategory A subscription exists
    //          +
    // User buys Subcategory B
    //          =
    // B incorrectly becomes EXTEND
    //
    // Now we only find an existing subscription
    // belonging to the SAME subcategory.
    //
    // =====================================================

    let intent: "NEW" | "EXTEND" = "NEW";

    const activeSubscription =
      await prisma.subscription.findFirst({
        where: {
          memberId: member.id,

          // IMPORTANT:
          // Extension must belong to the same
          // subcategory being purchased.
          subCategoryId,

          status: {
            in: [
              "ACTIVE",
              "FROZEN",
            ],
          },

          endDate: {
            gte: new Date(),
          },
        },

        orderBy: {
          endDate: "desc",
        },
      });

    // =====================================================
    // INTENT
    // =====================================================
    //
    // Do NOT use:
    //
    // if (activeSubscription || extend)
    //
    // because "extend" by itself could cause an unrelated
    // subcategory to become an extension.
    //
    // An extension is only valid when a matching
    // subcategory subscription exists.
    //
    // =====================================================

    if (
      activeSubscription &&
      (extend || !extend)
    ) {
      intent = "EXTEND";
    }

    // =====================================================
    // PRICE CALCULATION
    // =====================================================

    const packageAmount =
      Number(selectedPackage.price);

    const finalAmount =
      packageAmount -
      Number(discountAmount) -
      Number(referralDiscountAmount);

    if (finalAmount < 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Discount cannot exceed package amount",
        },
        { status: 400 }
      );
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

    // =====================================================
    // CUSTOMER PAYABLE
    // =====================================================

    const invoiceTotal =
      Math.round(
        finalAmount + totalTax
      );

    const balanceAmount =
      invoiceTotal -
      Number(paidAmount);

    if (balanceAmount < 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Paid amount cannot exceed invoice total",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // DATES
    // =====================================================

    const subscriptionStartDate =
      startDate
        ? new Date(startDate)
        : nowUTC();

    const subscriptionEndDate =
      endDate
        ? new Date(endDate)
        : addDaysUTC(
            subscriptionStartDate,
            selectedPackage.durationInDays
          );

    if (
      subscriptionEndDate <=
      subscriptionStartDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "End date must be greater than start date",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // RAZORPAY ORDER
    // =====================================================

    let razorpayOrder = null;

    if (balanceAmount > 0) {
      razorpayOrder =
        await rp.orders.create({
          amount: balanceAmount,
          currency: "INR",
          receipt: `fuel_${Date.now()}`,

          notes: {
            memberId: member.id,

            packageId:
              selectedPackage.id,

            // IMPORTANT
            subCategoryId:
              selectedSubCategory?.id ?? null,

            serviceId:
              selectedPackage.serviceId,

            branchId:
              branch.id,

            invoiceIntent:
              intent,

            // IMPORTANT
            // Store the exact subscription being
            // extended instead of making the webhook
            // guess later.
            extensionSubscriptionId:
              activeSubscription?.id || "",

            referralCode:
              ref || "",

            referralDiscountAmount:
              String(
                referralDiscountAmount || 0
              ),

            subscriptionStartDate:
              subscriptionStartDate.toISOString(),

            subscriptionEndDate:
              subscriptionEndDate.toISOString(),
          },
        });
    }

    // =====================================================
    // INVOICE
    // =====================================================

    const invoiceNumber =
      `INV-${Date.now()}`;

    const invoice =
      await prisma.invoice.create({
        data: {
          invoiceNumber,

          referralDiscountAmount,

          memberId:
            member.id,

          branchId:
            branch.id,

          packageId:
            selectedPackage.id,

          // IMPORTANT:
          // Persist the selected subcategory
          // on the invoice.
          subCategoryId:
            selectedSubCategory?.id ?? null,

          salesRepId:
            user?.id || null,

          salesRepName:
            user?.name ?? "Website",

          intent,

          // =================================================
          // SNAPSHOTS
          // =================================================

          serviceName:
            selectedPackage
              .service.name,

          packageName:
            selectedPackage.name,

          packageDurationInDays:
            selectedPackage
              .durationInDays,

          branchName:
            branch.name,

          memberName:
            member.name,

          memberPhone:
            member.phone,

          memberEmail:
            member.email,

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
            Number(
              gstBreakdown.totalTax
            ) || 0,

          notes,

          status:
            Number(paidAmount) <= 0
              ? "PENDING"
              : balanceAmount <= 0
              ? "FULLY_PAID"
              : "PARTIAL_PAID",
        },
      });

    // =====================================================
    // INITIAL PAYMENT ENTRY
    // =====================================================

    if (Number(paidAmount) > 0) {
      await prisma.payment.create({
        data: {
          receiptNumber:
            `RCPT-${Date.now()}`,

          invoiceId:
            invoice.id,

          memberId:
            member.id,

          amount:
            Number(paidAmount),

          paymentMode:
            initialPaymentMethod,

          paymentType:
            "INITIAL",

          status:
            "PAID",

          notes:
            "Initial collected amount",
        },
      });
    }

    // =====================================================
    // ONLINE PAYMENT ENTRY
    // =====================================================

    if (
      balanceAmount > 0 &&
      razorpayOrder
    ) {
      await prisma.payment.create({
        data: {
          receiptNumber:
            `RCPT-RZP-${Date.now()}`,

          invoiceId:
            invoice.id,

          memberId:
            member.id,

          amount:
            balanceAmount,

          paymentMode:
            "Razorpay",

          paymentType:
            Number(paidAmount) > 0
              ? "BALANCE"
              : "INITIAL",

          status:
            "FAILED",

          razorpayOrderId:
            razorpayOrder.id,
        },
      });
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      memberId:
        member.id,

      invoiceId:
        invoice.id,

      orderId:
        razorpayOrder?.id ?? null,

      amount:
        balanceAmount,

      currency:
        "INR",

      invoiceTotal,

      key:
        process.env.RAZORPAY_KEY_ID,

      member: {
        name:
          member.name,

        email:
          member.email,

        phone:
          member.phone,
      },

      service: {
        id:
          selectedPackage.serviceId,

        name:
          selectedPackage
            .service.name,
      },

      subCategory: {
        id:
          selectedSubCategory?.id ?? null,

        name:
          selectedSubCategory?.name ?? null,
      },

      package: {
        id:
          selectedPackage.id,

        name:
          selectedPackage.name,
      },

      // Useful for frontend/debugging
      intent,

      extensionSubscriptionId:
        activeSubscription?.id ?? null,

      startDate:
        subscriptionStartDate,

      endDate:
        subscriptionEndDate,
    });
  } catch (e) {
    console.error(
      "SUBSCRIBE API ERROR:",
      e
    );

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
