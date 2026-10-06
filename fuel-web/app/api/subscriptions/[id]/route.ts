import { getUserFromRequest } from "@/app/utils/auth";
import { prisma } from "@/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateSubscriptionBody = {
  serviceId?: string;
  subCategoryId?: string | null;
  packageId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  paymentMode?: string;
  /** PAISE. Optional; the edit page collects balances via CollectBalanceModal. */
  additionalPayment?: number;
  notes?: string;
};

type InvoiceStatusValue = "PENDING" | "PARTIAL_PAID" | "FULLY_PAID" | "CANCELLED";

const allowedRoles = new Set(["ADMIN", "MANAGER"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const PAYMENT_MODES = new Set([
  "Cash",
  "UPI",
  "GPay",
  "Card",
  "Bank Transfer",
  "Razorpay",
]);

/* ============================================================
 * ERRORS
 * ============================================================ */

class BusinessError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "BusinessError";
    this.status = status;
    this.code = code;
  }
}

/* ============================================================
 * DATE HELPERS
 * ============================================================ */

function formatIndiaDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function parseIndiaDate(value: unknown): Date | null {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;

  const parsed = new Date(`${value}T00:00:00.000+05:30`);

  if (Number.isNaN(parsed.getTime())) return null;
  if (formatIndiaDate(parsed) !== value) return null;

  return parsed;
}

/* ============================================================
 * MONEY HELPERS  (DB = PAISE)
 *
 * TOTAL PAYABLE ON AN INVOICE (same as the billing history page):
 *     finalAmount + totalTax - discountAmount
 * ============================================================ */

function normalizePaise(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.floor(number);
}

const rupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

const sumPaid = (payments: { amount: number; status: string }[]) =>
  payments.reduce((t, p) => (p.status === "PAID" ? t + p.amount : t), 0);

function invoiceTotal(invoice: {
  finalAmount: number;
  discountAmount: number;
  totalTax: number | null;
}) {
  return Math.max(
    invoice.finalAmount +
      Math.round(invoice.totalTax ?? 0) -
      invoice.discountAmount,
    0
  );
}

type GstSetting = { cgstPercentage: number; sgstPercentage: number } | null;

/**
 * GST rates for an invoice:
 *  1. the percentages stored on the invoice,
 *  2. else derived from the invoice's own totalTax,
 *  3. else the current Setting row.
 */
function resolveGstRates(
  inv: {
    cgstPercentage: number | null;
    sgstPercentage: number | null;
    totalTax: number | null;
    packageAmount: number;
    discountAmount: number;
    referralDiscountAmount: number;
  },
  setting: GstSetting
) {
  const cgst = Number(inv.cgstPercentage || 0);
  const sgst = Number(inv.sgstPercentage || 0);

  if (cgst > 0 || sgst > 0) return { cgst, sgst };

  if (inv.totalTax !== null && inv.totalTax !== undefined) {
    const taxable =
      inv.packageAmount - inv.discountAmount - inv.referralDiscountAmount;

    if (inv.totalTax > 0 && taxable > 0) {
      const combined = (inv.totalTax / taxable) * 100;
      return { cgst: combined / 2, sgst: combined / 2 };
    }

    return { cgst: 0, sgst: 0 }; // invoice genuinely had no tax
  }

  return {
    cgst: setting?.cgstPercentage ?? 0,
    sgst: setting?.sgstPercentage ?? 0,
  };
}

// Replace with your real invoice-number generator if you have one.
const generateUpgradeInvoiceNumber = () =>
  `INV-UP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/**
 * Total payable for a full package:
 * package price - discounts = taxable, then CGST + SGST on top.
 */
function calculatePackageTotal({
  packagePrice,
  discountAmount,
  referralDiscountAmount,
  cgstPercentage,
  sgstPercentage,
}: {
  packagePrice: number;
  discountAmount: number;
  referralDiscountAmount: number;
  cgstPercentage: number;
  sgstPercentage: number;
}) {
  const taxable = Math.max(
    0,
    Math.floor(packagePrice) -
      Math.floor(discountAmount) -
      Math.floor(referralDiscountAmount)
  );

  const cgstAmount = Math.round(taxable * (cgstPercentage / 100));
  const sgstAmount = Math.round(taxable * (sgstPercentage / 100));

  return taxable + cgstAmount + sgstAmount;
}

/**
 * Upgrade invoices are created from a TOTAL PAYABLE (GST included).
 * Split it so net + tax === total exactly, and store finalAmount as
 * the pre-tax amount (same convention as every other invoice).
 */
function buildUpgradeAmounts(total: number, cgstPct: number, sgstPct: number) {
  const net = Math.round(total / (1 + (cgstPct + sgstPct) / 100));
  const cgstAmount = Math.round(net * (cgstPct / 100));
  const sgstAmount = total - net - cgstAmount;

  return {
    packageAmount: net,
    finalAmount: net,
    cgstAmount,
    sgstAmount,
    totalTax: cgstAmount + sgstAmount,
  };
}

function invoiceStatusFor(total: number, paid: number): InvoiceStatusValue {
  if (total === 0) return "CANCELLED";
  if (paid >= total) return "FULLY_PAID";
  if (paid > 0) return "PARTIAL_PAID";
  return "PENDING";
}

/* ============================================================
 * SUBSCRIPTION STATUS
 * ============================================================ */

function calculateSubscriptionStatus(currentStatus: string, endDate: Date) {
  if (
    currentStatus === "CANCELLED" ||
    currentStatus === "FROZEN" ||
    currentStatus === "TRANSFERRED"
  ) {
    return currentStatus;
  }

  const today = parseIndiaDate(formatIndiaDate(new Date()));

  if (!today) throw new Error("Unable to calculate current date.");

  return endDate.getTime() < today.getTime() ? "EXPIRED" : "ACTIVE";
}

/* ============================================================
 * LEGACY INVOICE FALLBACK
 * For memberships whose Subscription.invoiceId was never linked.
 * ============================================================ */

async function findLegacyInvoice(
  db: Prisma.TransactionClient | typeof prisma,
  sub: { memberId: string; packageId: string }
) {
  return db.invoice.findFirst({
    where: {
      memberId: sub.memberId,
      packageId: sub.packageId,
      intent: { in: ["NEW", "EXTEND"] },
      subscription: { is: null },
    },
    orderBy: { createdAt: "desc" },
    include: { payments: { orderBy: { paidAt: "asc" } } },
  });
}

/* ============================================================
 * COMMON INCLUDE
 * ============================================================ */

const subscriptionInclude = {
  member: true,
  branch: true,
  subCategory: true,

  package: {
    include: {
      service: true,
      subCategories: { include: { subCategory: true } },
    },
  },

  // ORIGINAL invoice (Subscription.invoiceId)
  invoice: {
    include: { payments: { orderBy: { paidAt: "asc" as const } } },
  },

  // n UPGRADE invoices (Invoice.linkedSubscriptionId)
  invoices: {
    where: { intent: "UPGRADE" as const },
    orderBy: { createdAt: "asc" as const },
    include: { payments: { orderBy: { paidAt: "asc" as const } } },
  },
};

/* ============================================================
 * GET
 * ============================================================ */

export const GET = async (request: NextRequest, { params }: RouteContext) => {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, message: "Subscription ID is required." },
      { status: 400 }
    );
  }

  try {
    // Remove this check if a public screen calls this endpoint.
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    const [subscription, services, branches, setting] = await Promise.all([
      prisma.subscription.findUnique({
        where: { id },
        include: subscriptionInclude,
      }),

      prisma.service.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          subCategories: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
          packages: {
            where: { isActive: true },
            orderBy: [{ durationInDays: "asc" }, { name: "asc" }],
            include: {
              subCategories: { include: { subCategory: true } },
            },
          },
        },
      }),

      prisma.branch.findMany({ orderBy: { name: "asc" } }),

      prisma.setting.findFirst(),
    ]);

    if (!subscription) {
      return NextResponse.json(
        { success: false, message: "Membership was not found." },
        { status: 404 }
      );
    }

    const originalInvoice =
      subscription.invoice ?? (await findLegacyInvoice(prisma, subscription));

    return NextResponse.json({
      success: true,
      subscription: { ...subscription, invoice: originalInvoice },
      upgradeInvoices: subscription.invoices.filter(
        (i) => i.status !== "CANCELLED"
      ),
      // fallback GST rates for the page (used only if the invoice has none)
      gst: setting
        ? {
            cgstPercentage: setting.cgstPercentage,
            sgstPercentage: setting.sgstPercentage,
          }
        : null,
      catalog: { services, branches },
    });
  } catch (error) {
    console.error("Get subscription error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load membership." },
      { status: 500 }
    );
  }
};

/* ============================================================
 * PUT  -  COMPLETE MEMBERSHIP EDIT
 *
 * 1. The ORIGINAL invoice and its payments are never changed.
 * 2. Billed so far = original total payable + all non-cancelled
 *    upgrade invoices' total payable.
 * 3. New package total vs billed so far:
 *      higher      -> NEW upgrade invoice for the difference
 *      lower       -> shrink UNPAID upgrade balances, newest first
 *      still lower -> reject (needs a refund/credit workflow)
 * 4. If the package did not change, billing is untouched.
 * ============================================================ */

export const PUT = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Subscription ID is required." },
        { status: 400 }
      );
    }

    /* ---------------- AUTH ---------------- */

    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    if (!user.role || !allowedRoles.has(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to edit memberships.",
        },
        { status: 403 }
      );
    }

    /* ---------------- BODY ---------------- */

    const body = (await request.json()) as UpdateSubscriptionBody;

    if (!body.serviceId) {
      return NextResponse.json(
        { success: false, message: "Service is required." },
        { status: 400 }
      );
    }

    if (!body.packageId) {
      return NextResponse.json(
        { success: false, message: "Package is required." },
        { status: 400 }
      );
    }

    if (!body.branchId) {
      return NextResponse.json(
        { success: false, message: "Branch is required." },
        { status: 400 }
      );
    }

    /* ---------------- DATES ---------------- */

    const startDate = parseIndiaDate(body.startDate);
    const endDate = parseIndiaDate(body.endDate);

    if (!startDate) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid start date." },
        { status: 400 }
      );
    }

    if (!endDate) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid end date." },
        { status: 400 }
      );
    }

    if (endDate.getTime() < startDate.getTime()) {
      return NextResponse.json(
        { success: false, message: "End date cannot be before the start date." },
        { status: 400 }
      );
    }

    /* ---------------- PAYMENT (PAISE) ---------------- */

    const additionalPayment = normalizePaise(body.additionalPayment);

    if (additionalPayment > 0 && !body.paymentMode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment method is required when collecting an additional payment.",
        },
        { status: 400 }
      );
    }

    if (
      additionalPayment > 0 &&
      body.paymentMode &&
      !PAYMENT_MODES.has(body.paymentMode)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid payment method." },
        { status: 400 }
      );
    }

    /* ---------------- LIGHT LOAD ---------------- */

    const baseSubscription = await prisma.subscription.findUnique({
      where: { id },
      select: { id: true, subCategoryId: true },
    });

    if (!baseSubscription) {
      return NextResponse.json(
        { success: false, message: "Membership was not found." },
        { status: 404 }
      );
    }

    /* ---------------- SERVICE ---------------- */

    const selectedService = await prisma.service.findUnique({
      where: { id: body.serviceId },
    });

    if (!selectedService) {
      return NextResponse.json(
        { success: false, message: "Selected service was not found." },
        { status: 400 }
      );
    }

    /* ---------------- PACKAGE ---------------- */

    const selectedPackage = await prisma.servicePackage.findUnique({
      where: { id: body.packageId },
      include: {
        service: true,
        subCategories: { include: { subCategory: true } },
      },
    });

    if (!selectedPackage) {
      return NextResponse.json(
        { success: false, message: "Selected package was not found." },
        { status: 400 }
      );
    }

    if (selectedPackage.serviceId !== selectedService.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected package does not belong to the selected service.",
        },
        { status: 400 }
      );
    }

    /* ---------------- SUB CATEGORY ---------------- */

    const selectedSubCategoryId =
      body.subCategoryId === undefined
        ? baseSubscription.subCategoryId
        : body.subCategoryId;

    if (selectedSubCategoryId) {
      const selectedSubCategory = await prisma.serviceSubCategory.findUnique({
        where: { id: selectedSubCategoryId },
      });

      if (!selectedSubCategory) {
        return NextResponse.json(
          { success: false, message: "Selected sub-category was not found." },
          { status: 400 }
        );
      }

      if (selectedSubCategory.serviceId !== selectedService.id) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected sub-category does not belong to the selected service.",
          },
          { status: 400 }
        );
      }

      const packageHasSubCategory = selectedPackage.subCategories.some(
        (item) => item.subCategoryId === selectedSubCategoryId
      );

      if (!packageHasSubCategory) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected sub-category is not available for this package.",
          },
          { status: 400 }
        );
      }
    }

    /* ---------------- BRANCH ---------------- */

    const selectedBranch = await prisma.branch.findUnique({
      where: { id: body.branchId },
    });

    if (!selectedBranch) {
      return NextResponse.json(
        { success: false, message: "Selected branch was not found." },
        { status: 400 }
      );
    }

    const setting = await prisma.setting.findFirst();
    const salesRepName = (user as { name?: string | null }).name ?? null;

    /* ========================================================
     * TRANSACTION
     * ======================================================== */

    const financial = await prisma.$transaction(
      async (tx) => {
        const sub = await tx.subscription.findUnique({
          where: { id },
          include: {
            invoice: { include: { payments: true } },
            invoices: {
              where: { intent: "UPGRADE" },
              orderBy: { createdAt: "asc" },
              include: { payments: true },
            },
          },
        });

        if (!sub) throw new BusinessError("Membership was not found.", 404);

        let original = sub.invoice;

        if (!original) {
          original = await findLegacyInvoice(tx, sub);

          if (original) {
            await tx.subscription.update({
              where: { id },
              data: { invoiceId: original.id },
            });
          }
        }

        if (!original) {
          throw new BusinessError(
            "This membership does not have an invoice. Create it through the billing flow before editing the membership."
          );
        }

        const rates = resolveGstRates(original, setting);
        const cgstPct = rates.cgst;
        const sgstPct = rates.sgst;

        const activeUpgrades = sub.invoices.filter(
          (i) => i.status !== "CANCELLED"
        );

        const originalTotal = invoiceTotal(original);
        const originalPaid = sumPaid(original.payments);

        const upgradesBilled = activeUpgrades.reduce(
          (t, i) => t + invoiceTotal(i),
          0
        );

        const upgradesPaid = activeUpgrades.reduce(
          (t, i) => t + sumPaid(i.payments),
          0
        );

        const billedSoFar = originalTotal + upgradesBilled;

        /* ---------- NEW TOTAL ---------- */

        const packageChanged = sub.packageId !== selectedPackage.id;

        const newPackageTotal = calculatePackageTotal({
          packagePrice: selectedPackage.price,
          discountAmount: normalizePaise(original.discountAmount),
          referralDiscountAmount: normalizePaise(original.referralDiscountAmount),
          cgstPercentage: cgstPct,
          sgstPercentage: sgstPct,
        });

        // Dates / branch / sub-category edits don't touch billing.
        const targetTotal = packageChanged ? newPackageTotal : billedSoFar;

        const diff = targetTotal - billedSoFar;

        /* ---------- DOWNGRADE PRE-CHECK ---------- */

        if (diff < 0) {
          const cuttable = activeUpgrades.reduce(
            (t, i) => t + Math.max(invoiceTotal(i) - sumPaid(i.payments), 0),
            0
          );

          if (-diff > cuttable) {
            throw new BusinessError(
              `The new total (${rupees(targetTotal)}) is below the minimum of ${rupees(billedSoFar - cuttable)} (original invoice plus amounts already paid on upgrade invoices). A refund/credit adjustment is required.`,
              400,
              "NEW_TOTAL_BELOW_PAID"
            );
          }
        }

        /* ---------- UPDATE SUBSCRIPTION ---------- */
        // The original invoice is NOT touched.

        await tx.subscription.update({
          where: { id },
          data: {
            branchId: selectedBranch.id,
            packageId: selectedPackage.id,
            subCategoryId: selectedSubCategoryId,
            serviceName: selectedService.name,
            packageName: selectedPackage.name,
            packageDurationInDays: selectedPackage.durationInDays,
            originalPrice: selectedPackage.originalPrice,
            finalPrice: selectedPackage.price,
            branchName: selectedBranch.name,
            usageType: selectedPackage.usageType,
            totalSessions: selectedPackage.totalSessions,
            remainingSessions:
              selectedPackage.usageType === "SESSION_BASED"
                ? sub.packageId === selectedPackage.id
                  ? sub.remainingSessions
                  : selectedPackage.totalSessions
                : null,
            startDate,
            endDate,
            status: calculateSubscriptionStatus(sub.status, endDate),
          },
        });

        /* ---------- UPGRADE INVOICES ---------- */

        let createdInvoiceId: string | null = null;

        if (diff > 0) {
          const created = await tx.invoice.create({
            data: {
              ...buildUpgradeAmounts(diff, cgstPct, sgstPct),
              invoiceNumber: generateUpgradeInvoiceNumber(),
              intent: "UPGRADE",
              linkedSubscriptionId: id,

              memberId: sub.memberId,
              memberName: original.memberName,
              memberPhone: original.memberPhone,
              memberEmail: original.memberEmail,

              packageId: selectedPackage.id,
              subCategoryId: selectedSubCategoryId,
              serviceName: selectedService.name,
              packageName: selectedPackage.name,
              packageDurationInDays: selectedPackage.durationInDays,

              branchId: selectedBranch.id,
              branchName: selectedBranch.name,

              discountAmount: 0,
              referralDiscountAmount: 0,
              cgstPercentage: cgstPct,
              sgstPercentage: sgstPct,

              paidAmount: 0,
              balanceAmount: diff, // total payable, GST included
              status: "PENDING",

              salesRepId: user.id,
              salesRepName,

              notes:
                body.notes ??
                `Upgrade: ${sub.packageName} → ${selectedPackage.name}`,
            },
          });

          createdInvoiceId = created.id;
        } else if (diff < 0) {
          let toCut = -diff;

          for (const inv of [...activeUpgrades].reverse()) {
            if (toCut === 0) break;

            const paid = sumPaid(inv.payments);
            const total = invoiceTotal(inv);
            const cut = Math.min(toCut, total - paid);

            if (cut <= 0) continue;

            const newTotal = total - cut;

            await tx.invoice.update({
              where: { id: inv.id },
              data: {
                ...buildUpgradeAmounts(newTotal, cgstPct, sgstPct),
                discountAmount: 0,
                paidAmount: paid,
                balanceAmount: newTotal - paid,
                status: invoiceStatusFor(newTotal, paid),
              },
            });

            toCut -= cut;
          }
        }

        /* ---------- OPTIONAL NEW PAYMENT ---------- */

        let collectedNow = 0;

        if (additionalPayment > 0) {
          const target = createdInvoiceId
            ? await tx.invoice.findUnique({
                where: { id: createdInvoiceId },
                include: { payments: true },
              })
            : await tx.invoice.findFirst({
                where: {
                  linkedSubscriptionId: id,
                  intent: "UPGRADE",
                  status: { in: ["PENDING", "PARTIAL_PAID"] },
                  balanceAmount: { gt: 0 },
                },
                orderBy: { createdAt: "desc" },
                include: { payments: true },
              });

          if (!target) {
            throw new BusinessError(
              "There is no open upgrade invoice to collect a payment against."
            );
          }

          const total = invoiceTotal(target);
          const paidBefore = sumPaid(target.payments);
          const balanceBefore = total - paidBefore;

          if (additionalPayment > balanceBefore) {
            throw new BusinessError(
              `Payment cannot exceed ${rupees(balanceBefore)} on invoice ${target.invoiceNumber}.`
            );
          }

          await tx.payment.create({
            data: {
              receiptNumber: `REC-${Date.now()}-${Math.floor(
                Math.random() * 10000
              )}`,
              invoiceId: target.id,
              memberId: sub.memberId,
              amount: additionalPayment,
              paymentMode: body.paymentMode!,
              paymentType: "BALANCE",
              status: "PAID",
              notes: body.notes || null,
            },
          });

          const paidAfter = paidBefore + additionalPayment;

          await tx.invoice.update({
            where: { id: target.id },
            data: {
              paidAmount: paidAfter,
              balanceAmount: total - paidAfter,
              status: invoiceStatusFor(total, paidAfter),
            },
          });

          collectedNow = additionalPayment;
        }

        const collected = originalPaid + upgradesPaid + collectedNow;

        return {
          previousPaidAmount: originalPaid + upgradesPaid,
          actualAmount: targetTotal,
          collectedAmount: collected,
          balanceAmount: Math.max(targetTotal - collected, 0),
          newUpgradeInvoiceAmount: diff > 0 ? diff : 0,
          additionalPayment: collectedNow,
        };
      },
      { timeout: 15000 }
    );

    /* ---------------- FRESH DATA ---------------- */

    const fresh = await prisma.subscription.findUnique({
      where: { id },
      include: subscriptionInclude,
    });

    if (!fresh) {
      throw new Error("Membership was updated but could not be loaded afterwards.");
    }

    const message =
      financial.newUpgradeInvoiceAmount > 0
        ? `Membership updated. An upgrade invoice of ${rupees(financial.newUpgradeInvoiceAmount)} (GST included) was created for the balance.`
        : financial.additionalPayment > 0
          ? "Membership updated and payment recorded."
          : "Membership updated successfully.";

    return NextResponse.json({
      success: true,
      message,
      subscription: fresh,
      upgradeInvoices: fresh.invoices.filter((i) => i.status !== "CANCELLED"),
      financial,
    });
  } catch (error) {
    if (error instanceof BusinessError) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status: error.status }
      );
    }

    console.error("Update subscription error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to update membership.",
      },
      { status: 500 }
    );
  }
};