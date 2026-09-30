import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { getUserFromRequest } from "@/app/utils/auth";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const pageParam = Number(searchParams.get("page") || 1);
    const limitParam = Number(
      searchParams.get("limit") || DEFAULT_LIMIT
    );

    const page = Math.max(
      1,
      Number.isFinite(pageParam) ? pageParam : 1
    );

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        Number.isFinite(limitParam)
          ? limitParam
          : DEFAULT_LIMIT
      )
    );

    const search = searchParams.get("search")?.trim() || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const paymentMode =
      searchParams.get("paymentMode")?.trim() || "";

    const status =
      searchParams.get("status")?.trim() || "";

    const intent =
      searchParams.get("intent")?.trim() || "";

    const salesRepId =
      searchParams.get("salesRepId")?.trim() || "";

    const requestedBranchId =
      searchParams.get("branchId")?.trim() || "";

    /**
     * Branch access.
     *
     * Branch-restricted users can only see their branch.
     * Admin/other unrestricted users can select a branch.
     */
    const appliedBranchId =
      user.branchId || requestedBranchId || null;

    const where: any = {};

    if (appliedBranchId) {
      where.branchId = appliedBranchId;
    }

    if (salesRepId) {
      where.salesRepId = salesRepId;
    }

    if (status) {
      where.status = status;
    }

    if (intent) {
      where.intent = intent;
    }

    /**
     * Search:
     * - invoice number
     * - member name
     * - member phone
     *
     * Member data is also duplicated on Invoice, but
     * querying the actual Member relation keeps the
     * search consistent with the collection page.
     */
    if (search) {
      where.OR = [
        {
          invoiceNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          member: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          member: {
            phone: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    /**
     * Invoice date filter.
     *
     * This uses createdAt because invoices themselves
     * don't have an invoiceDate field.
     */
    if (from || to) {
      where.createdAt = {};

      if (from) {
        where.createdAt.gte = new Date(
          `${from}T00:00:00.000`
        );
      }

      if (to) {
        where.createdAt.lte = new Date(
          `${to}T23:59:59.999`
        );
      }
    }

    /**
     * Payment mode is stored on Payment, not Invoice.
     *
     * Filter invoices having at least one payment with
     * the requested payment mode.
     */
    if (paymentMode) {
      where.payments = {
        some: {
          paymentMode,
          status: "PAID",
        },
      };
    }

    const skip = (page - 1) * limit;

    /**
     * Payment modes available to the current branch scope.
     */
    const paymentWhere: any = {
      status: "PAID",
    };

    if (appliedBranchId) {
      paymentWhere.invoice = {
        branchId: appliedBranchId,
      };
    }

    /**
     * Sales reps available to the current branch.
     */
    const staffWhere: any = {};

    if (appliedBranchId) {
      staffWhere.branchId = appliedBranchId;
    }

    const [
      invoices,
      total,
      aggregate,
      paymentModes,
      staff,
      branches,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          invoiceNumber: true,

          groupMemberCount: true,
          groupDiscountPercentage: true,

          packageId: true,

          serviceName: true,
          packageName: true,
          packageDurationInDays: true,

          branchName: true,

          memberName: true,
          memberPhone: true,
          memberEmail: true,

          packageAmount: true,
          discountAmount: true,
          finalAmount: true,

          paidAmount: true,
          balanceAmount: true,

          cgstPercentage: true,
          sgstPercentage: true,
          cgstAmount: true,
          sgstAmount: true,
          totalTax: true,

          referralDiscountAmount: true,

          status: true,
          intent: true,

          notes: true,

          createdAt: true,
          updatedAt: true,

          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              age: true,
            },
          },

          branch: {
            select: {
              id: true,
              name: true,
            },
          },

          salesRep: {
            select: {
              id: true,
              name: true,
            },
          },

          package: {
            select: {
              id: true,
              name: true,
              durationInDays: true,
              service: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

          subCategory: {
            select: {
              id: true,
              name: true,
            },
          },

          subscription: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              status: true,
            },
          },

          /**
           * We only need the latest successful payment
           * for displaying the transaction date/mode.
           */
          payments: {
            where: {
              status: "PAID",
            },

            orderBy: {
              paidAt: "desc",
            },

            take: 1,

            select: {
              id: true,
              amount: true,
              paymentMode: true,
              paymentType: true,
              status: true,
              paidAt: true,
              receiptNumber: true,
            },
          },
        },
      }),

      prisma.invoice.count({
        where,
      }),

      prisma.invoice.aggregate({
        where,

        _sum: {
          finalAmount: true,
          paidAmount: true,
          balanceAmount: true,
        },
      }),

      prisma.payment.findMany({
        where: paymentWhere,

        distinct: ["paymentMode"],

        select: {
          paymentMode: true,
        },

        orderBy: {
          paymentMode: "asc",
        },
      }),

      prisma.user.findMany({
        where: staffWhere,

        select: {
          id: true,
          name: true,
        },

        orderBy: {
          name: "asc",
        },
      }),

      prisma.branch.findMany({
        where: user.branchId
          ? {
              id: user.branchId,
            }
          : undefined,

        select: {
          id: true,
          name: true,
        },

        orderBy: {
          name: "asc",
        },
      }),
    ]);

    const data = invoices.map((invoice) => {
      const latestPayment = invoice.payments[0] || null;

      return {
        id: invoice.id,

        invoiceNumber: invoice.invoiceNumber,

        member: {
          id: invoice.member.id,
          name: invoice.member.name,
          phone: invoice.member.phone,
          email: invoice.member.email,
          age: invoice.member.age,
        },

        branch: invoice.branch
          ? {
              id: invoice.branch.id,
              name: invoice.branch.name,
            }
          : null,

        serviceName: invoice.serviceName,
        packageName: invoice.packageName,
        packageDurationInDays:
          invoice.packageDurationInDays,

        subCategory: invoice.subCategory
          ? {
              id: invoice.subCategory.id,
              name: invoice.subCategory.name,
            }
          : null,

        intent: invoice.intent,

        status: invoice.status,

        amount: invoice.finalAmount,

        packageAmount: invoice.packageAmount,
        discountAmount: invoice.discountAmount,
        referralDiscountAmount:
          invoice.referralDiscountAmount,

        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,

        totalTax: invoice.totalTax,

        groupMemberCount:
          invoice.groupMemberCount,

        groupDiscountPercentage:
          invoice.groupDiscountPercentage,

        salesRep: invoice.salesRep
          ? {
              id: invoice.salesRep.id,
              name: invoice.salesRep.name,
            }
          : null,

        /**
         * Membership validity comes from Subscription.
         */
        validity: invoice.subscription
          ? {
              from:
                invoice.subscription.startDate.toISOString(),

              to:
                invoice.subscription.endDate.toISOString(),

              status:
                invoice.subscription.status,
            }
          : null,

        /**
         * If a payment exists, use its paidAt.
         * Otherwise use invoice.createdAt.
         */
        transactionDate: latestPayment?.paidAt
          ? latestPayment.paidAt.toISOString()
          : invoice.createdAt.toISOString(),

        payment: latestPayment
          ? {
              id: latestPayment.id,
              amount: latestPayment.amount,
              paymentMode:
                latestPayment.paymentMode,
              paymentType:
                latestPayment.paymentType,
              receiptNumber:
                latestPayment.receiptNumber,
              paidAt:
                latestPayment.paidAt.toISOString(),
            }
          : null,

        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },

      summary: {
        totalCount: total,
        totalAmount:
          aggregate._sum.finalAmount || 0,
        totalPaid:
          aggregate._sum.paidAmount || 0,
        totalBalance:
          aggregate._sum.balanceAmount || 0,
      },

      filters: {
        paymentModes: paymentModes
          .map((item) => item.paymentMode)
          .filter(Boolean),

        statuses: [
          "PENDING",
          "PARTIAL_PAID",
          "FULLY_PAID",
          "CANCELLED",
        ],

        intents: [
          "NEW",
          "EXTEND",
          "UPGRADE",
          "TRANSFER_FEE",
        ],

        staff,
      },

      scope: {
        branchId: appliedBranchId,
        canSelectBranch: !user.branchId,
      },

      branches,
    });
  } catch (error) {
    console.error("Invoice API error:", error);

    return NextResponse.json(
      {
        message: "Failed to fetch invoice data",
      },
      {
        status: 500,
      }
    );
  }
}
