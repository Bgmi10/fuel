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
        Number.isFinite(limitParam) ? limitParam : DEFAULT_LIMIT
      )
    );

    const search = searchParams.get("search")?.trim() || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const paymentMode =
      searchParams.get("paymentMode")?.trim() || "";

    const paymentType =
      searchParams.get("paymentType")?.trim() || "";

    const collectedBy =
      searchParams.get("collectedBy")?.trim() || "";

    const requestedBranchId =
      searchParams.get("branchId")?.trim() || "";

    /**
     * Branch access:
     *
     * If the logged-in user belongs to a branch,
     * that branch is always enforced.
     *
     * If the user is not branch-restricted,
     * the selected branch filter is used.
     */
    const appliedBranchId =
      user.branchId || requestedBranchId || null;

    /**
     * Payment itself doesn't contain branchId.
     *
     * Branch comes through:
     *
     * Payment
     *   -> Invoice
     *      -> Branch
     */
    const invoiceWhere: any = {};

    if (appliedBranchId) {
      invoiceWhere.branchId = appliedBranchId;
    }

    if (collectedBy) {
      invoiceWhere.salesRepId = collectedBy;
    }

    const where: any = {
      // Collection page only shows successfully paid collections.
      status: "PAID",
    };

    if (Object.keys(invoiceWhere).length > 0) {
      where.invoice = invoiceWhere;
    }

    /**
     * Search member by:
     * - name
     * - phone
     */
    if (search) {
      where.member = {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      };
    }

    /**
     * Collection date filter.
     */
    if (from || to) {
      where.paidAt = {};

      if (from) {
        where.paidAt.gte = new Date(`${from}T00:00:00.000`);
      }

      if (to) {
        where.paidAt.lte = new Date(`${to}T23:59:59.999`);
      }
    }

    /**
     * Payment method.
     *
     * Payment.paymentMode is a String in the schema,
     * so we don't hard-code enum values here.
     */
    if (paymentMode) {
      where.paymentMode = paymentMode;
    }

    /**
     * Payment type.
     *
     * Schema enum:
     * INITIAL
     * BALANCE
     * TRANSFER
     */
    if (paymentType) {
      where.paymentType = paymentType;
    }

    const skip = (page - 1) * limit;

    /**
     * Payment methods should be taken from the actual
     * Payment table instead of hard-coding options.
     */
    const paymentModeWhere: any = {
      status: "PAID",
    };

    if (appliedBranchId) {
      paymentModeWhere.invoice = {
        branchId: appliedBranchId,
      };
    }

    /**
     * Staff used as Invoice.salesRep.
     */
    const staffWhere: any = {};

    if (appliedBranchId) {
      staffWhere.branchId = appliedBranchId;
    }

    const [
      payments,
      total,
      aggregate,
      paymentModes,
      staff,
      branches,
    ] = await Promise.all([
      prisma.payment.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          paidAt: "desc",
        },

        select: {
          id: true,
          receiptNumber: true,
          amount: true,
          paymentMode: true,
          paymentType: true,
          status: true,
          paidAt: true,
          createdAt: true,

          member: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },

          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              serviceName: true,
              packageName: true,
              intent: true,
              totalTax: true,

              salesRep: {
                select: {
                  id: true,
                  name: true,
                },
              },

              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      prisma.payment.count({
        where,
      }),

      prisma.payment.aggregate({
        where,

        _sum: {
          amount: true,
        },
      }),

      prisma.payment.findMany({
        where: paymentModeWhere,

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

    /**
     * Flatten branch from:
     *
     * payment.invoice.branch
     *
     * to:
     *
     * payment.branch
     *
     * so the client doesn't need to know the
     * database relation structure.
     */
    const data = payments.map((payment) => ({
      id: payment.id,

      receiptNumber: payment.receiptNumber,

      amount: payment.amount,

      paymentMode: payment.paymentMode,

      paymentType: payment.paymentType,

      status: payment.status,

      paidAt: payment.paidAt
        ? payment.paidAt.toISOString()
        : null,

      createdAt: payment.createdAt.toISOString(),

      member: {
        id: payment.member.id,
        name: payment.member.name,
        phone: payment.member.phone,
      },

      invoice: {
        id: payment.invoice.id,
        invoiceNumber: payment.invoice.invoiceNumber,
        serviceName: payment.invoice.serviceName,
        packageName: payment.invoice.packageName,
        intent: payment.invoice.intent,
        totalTax: payment.invoice.totalTax,

        salesRep: payment.invoice.salesRep
          ? {
              id: payment.invoice.salesRep.id,
              name: payment.invoice.salesRep.name,
            }
          : null,
      },

      branch: payment.invoice.branch
        ? {
            id: payment.invoice.branch.id,
            name: payment.invoice.branch.name,
          }
        : null,
    }));

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
        totalAmount: aggregate._sum.amount || 0,
      },

      filters: {
        paymentModes: paymentModes
          .map((item) => item.paymentMode)
          .filter(Boolean),

        paymentTypes: [
          "INITIAL",
          "BALANCE",
          "TRANSFER",
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
    console.error("Collection API error:", error);

    return NextResponse.json(
      {
        message: "Failed to fetch collection data",
      },
      {
        status: 500,
      }
    );
  }
}