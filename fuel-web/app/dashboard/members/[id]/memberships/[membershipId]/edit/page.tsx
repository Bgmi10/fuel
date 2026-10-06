"use client";

import { paiseToRupees } from "@/app/utils/helper";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Save,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CollectBalanceModal } from "../../../CollectBalanceModal";

/* ============================================================
 * TYPES  (all money = PAISE)
 * ============================================================ */

type SubCategory = { id: string; name: string };
type Branch = { id: string; name: string };
type PackageSubCategory = { subCategoryId: string };

type ServicePackage = {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  durationInDays: number;
  usageType: "DURATION_BASED" | "SESSION_BASED";
  totalSessions: number | null;
  serviceId: string;
  subCategories?: PackageSubCategory[];
};

type Service = {
  id: string;
  name: string;
  subCategories?: SubCategory[];
  packages?: ServicePackage[];
};

type Payment = {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentMode: string;
  paymentType: string;
  status: string;
  paidAt: string;
};

type InvoiceStatus = "PENDING" | "PARTIAL_PAID" | "FULLY_PAID" | "CANCELLED";

type Invoice = {
  id: string;
  invoiceNumber: string;
  intent: string;
  packageName: string;
  packageAmount: number;
  discountAmount: number;
  referralDiscountAmount: number;
  finalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  cgstPercentage: number | null;
  sgstPercentage: number | null;
  totalTax: number | null;
  status: InvoiceStatus;
  notes: string | null;
  createdAt: string;
  memberName: string;
  memberEmail: string | null;
  memberPhone: string;
  payments: Payment[];
};

type SubscriptionData = {
  id: string;
  memberId: string;
  packageName: string;
  serviceName: string;
  branchName: string;
  startDate: string;
  endDate: string;
  status: string;
  branch: Branch;
  subCategory: SubCategory | null;
  package: ServicePackage & { service: { id: string; name: string } };
  invoice: Invoice | null;
};

type GstSetting = { cgstPercentage: number; sgstPercentage: number } | null;

/* ============================================================
 * MONEY HELPERS
 *
 * Everything is integer paise. Paid and balance come from PAID
 * payment rows, never from the stored paidAmount/balanceAmount.
 *
 * TOTAL PAYABLE = finalAmount + totalTax - discountAmount
 * (exactly what the billing history page shows as Final Amount)
 * ============================================================ */

const money = (paise: number) => `₹${paiseToRupees(paise || 0)}`;

const sumPaid = (payments: Payment[]) =>
  payments.reduce((t, p) => (p.status === "PAID" ? t + p.amount : t), 0);

const invoiceTax = (invoice: Invoice) => Math.round(invoice.totalTax ?? 0);

const invoiceTotal = (invoice: Invoice) =>
  Math.max(
    invoice.finalAmount + invoiceTax(invoice) - invoice.discountAmount,
    0
  );

const invoiceBalance = (invoice: Invoice) =>
  Math.max(invoiceTotal(invoice) - sumPaid(invoice.payments), 0);

/**
 * Same GST rule as the route:
 *  1. percentages stored on the invoice,
 *  2. else derived from the invoice's own totalTax,
 *  3. else the Setting row returned by the API.
 */
function resolveGstRates(invoice: Invoice, setting: GstSetting) {
  const cgst = Number(invoice.cgstPercentage || 0);
  const sgst = Number(invoice.sgstPercentage || 0);

  if (cgst > 0 || sgst > 0) return { cgst, sgst };

  if (invoice.totalTax !== null && invoice.totalTax !== undefined) {
    const taxable =
      invoice.packageAmount -
      invoice.discountAmount -
      (invoice.referralDiscountAmount ?? 0);

    if (invoice.totalTax > 0 && taxable > 0) {
      const combined = (invoice.totalTax / taxable) * 100;
      return { cgst: combined / 2, sgst: combined / 2 };
    }

    return { cgst: 0, sgst: 0 };
  }

  return {
    cgst: setting?.cgstPercentage ?? 0,
    sgst: setting?.sgstPercentage ?? 0,
  };
}

/* ============================================================
 * DATE HELPERS
 * ============================================================ */

function formatDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function addDaysToDateInput(value: string, days: number) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function calculateDuration(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const difference = end.getTime() - start.getTime();
  if (difference < 0) return 0;

  return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
}

function formatPaymentDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusBadge(status: InvoiceStatus) {
  switch (status) {
    case "FULLY_PAID":
      return "border-lime-500/30 bg-lime-500/10 text-lime-400";
    case "PARTIAL_PAID":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "CANCELLED":
      return "border-neutral-700 bg-neutral-900 text-neutral-400";
    default:
      return "border-red-500/30 bg-red-500/10 text-red-300";
  }
}

const inputClass =
  "h-12 w-full rounded-2xl border border-neutral-800 bg-black px-4 text-white outline-none focus:border-lime-400 disabled:opacity-50";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function EditMembershipPage() {
  const router = useRouter();
  const params = useParams<{ id: string; membershipId: string }>();
  const subscriptionId = params.membershipId;

  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [upgradeInvoices, setUpgradeInvoices] = useState<Invoice[]>([]);
  const [gstSetting, setGstSetting] = useState<GstSetting>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedService, setSelectedService] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [initialService, setInitialService] = useState("");
  const [initialSubCategory, setInitialSubCategory] = useState("");
  const [initialPackage, setInitialPackage] = useState("");
  const [initialBranch, setInitialBranch] = useState("");
  const [initialStartDate, setInitialStartDate] = useState("");
  const [initialEndDate, setInitialEndDate] = useState("");

  const [collectTarget, setCollectTarget] = useState<Invoice | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ----------------------------------------------------------
   * Fill every field from the server's version of the membership
   * ---------------------------------------------------------- */

  const hydrate = useCallback(
    (current: SubscriptionData, upgrades: Invoice[]) => {
      const serviceId = current.package.service.id;
      const subCategoryId = current.subCategory?.id ?? "";
      const packageId = current.package.id;
      const branchId = current.branch.id;
      const formattedStart = formatDateInput(current.startDate);
      const formattedEnd = formatDateInput(current.endDate);

      setSubscription(current);
      setUpgradeInvoices(upgrades);

      setSelectedService(serviceId);
      setSelectedSubCategory(subCategoryId);
      setSelectedPackage(packageId);
      setSelectedBranch(branchId);
      setStartDate(formattedStart);
      setEndDate(formattedEnd);

      setInitialService(serviceId);
      setInitialSubCategory(subCategoryId);
      setInitialPackage(packageId);
      setInitialBranch(branchId);
      setInitialStartDate(formattedStart);
      setInitialEndDate(formattedEnd);
    },
    []
  );

  /* ----------------------------------------------------------
   * LOAD (one request: subscription + invoices + catalog)
   * ---------------------------------------------------------- */

  useEffect(() => {
    if (!subscriptionId) return;

    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load membership.");
        }

        setServices(data.catalog?.services ?? []);
        setBranches(data.catalog?.branches ?? []);
        setGstSetting(data.gst ?? null);

        hydrate(
          data.subscription as SubscriptionData,
          (data.upgradeInvoices ?? []) as Invoice[]
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        setError(
          err instanceof Error ? err.message : "Unable to load membership."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [subscriptionId, hydrate]);

  /* ----------------------------------------------------------
   * Refresh ONLY invoices/payments (after collecting a balance)
   * so unsaved form edits are not thrown away.
   * ---------------------------------------------------------- */

  const refreshInvoices = useCallback(async () => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) return;

      setSubscription(data.subscription as SubscriptionData);
      setUpgradeInvoices((data.upgradeInvoices ?? []) as Invoice[]);
      setSuccess("Payment recorded.");
    } catch (err) {
      console.error(err);
    }
  }, [subscriptionId]);

  /* ----------------------------------------------------------
   * CATALOG DERIVATIONS
   * ---------------------------------------------------------- */

  const currentServiceData = useMemo(
    () => services.find((s) => s.id === selectedService) ?? null,
    [services, selectedService]
  );

  const subCategories = useMemo(() => {
    const list = [...(currentServiceData?.subCategories ?? [])];
    const current = subscription?.subCategory;

    if (
      current &&
      subscription?.package.service.id === selectedService &&
      !list.some((i) => i.id === current.id)
    ) {
      list.push(current);
    }

    return list;
  }, [currentServiceData, subscription, selectedService]);

  const packages = useMemo(() => {
    const list = [...(currentServiceData?.packages ?? [])];
    const current = subscription?.package;

    if (
      current &&
      current.service.id === selectedService &&
      !list.some((p) => p.id === current.id)
    ) {
      list.push(current);
    }

    return list;
  }, [currentServiceData, subscription, selectedService]);

  const availablePackages = useMemo(() => {
    if (!selectedSubCategory) return packages;

    return packages.filter((pkg) =>
      (pkg.subCategories ?? []).some(
        (relation) => relation.subCategoryId === selectedSubCategory
      )
    );
  }, [packages, selectedSubCategory]);

  const selectedPackageData = useMemo(
    () => packages.find((pkg) => pkg.id === selectedPackage) ?? null,
    [packages, selectedPackage]
  );

  /* ----------------------------------------------------------
   * CHANGE HANDLERS
   * ---------------------------------------------------------- */

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId);
    setSelectedSubCategory("");
    setSelectedPackage("");
  };

  const handleSubCategoryChange = (subCategoryId: string) => {
    setSelectedSubCategory(subCategoryId);

    if (!selectedPackage || !subCategoryId) return;

    const pkg = packages.find((p) => p.id === selectedPackage);

    const stillValid = (pkg?.subCategories ?? []).some(
      (relation) => relation.subCategoryId === subCategoryId
    );

    if (!stillValid) setSelectedPackage("");
  };

  const handlePackageChange = (packageId: string) => {
    setSelectedPackage(packageId);

    if (!packageId) return;

    if (packageId === initialPackage) {
      setEndDate(initialEndDate);
      return;
    }

    const pkg = packages.find((p) => p.id === packageId);

    if (pkg && startDate && pkg.durationInDays > 0) {
      setEndDate(addDaysToDateInput(startDate, pkg.durationInDays - 1));
    }
  };

  /* ----------------------------------------------------------
   * PAYMENT TOTALS (PAISE, derived from payment rows)
   * ---------------------------------------------------------- */

  const originalPaidPaise = useMemo(
    () => sumPaid(subscription?.invoice?.payments ?? []),
    [subscription]
  );

  const upgradePaidPaise = useMemo(
    () => upgradeInvoices.reduce((t, inv) => t + sumPaid(inv.payments), 0),
    [upgradeInvoices]
  );

  const upgradeBilledPaise = useMemo(
    () => upgradeInvoices.reduce((t, inv) => t + invoiceTotal(inv), 0),
    [upgradeInvoices]
  );

  const totalCollectedPaise = originalPaidPaise + upgradePaidPaise;

  /* ----------------------------------------------------------
   * BILLING PREVIEW (the server stays authoritative)
   * ---------------------------------------------------------- */

  const billingPreview = useMemo(() => {
    const invoice = subscription?.invoice;

    if (!selectedPackageData || !invoice) return null;

    const packageChanged = selectedPackageData.id !== subscription.package.id;

    const packageAmount = selectedPackageData.price;

    // Existing discounts are preserved on an edit.
    const discountAmount = Math.min(invoice.discountAmount ?? 0, packageAmount);

    const referralDiscount = Math.min(
      invoice.referralDiscountAmount ?? 0,
      Math.max(packageAmount - discountAmount, 0)
    );

    const amountBeforeTax = Math.max(
      packageAmount - discountAmount - referralDiscount,
      0
    );

    const rates = resolveGstRates(invoice, gstSetting);

    const cgstAmount = Math.round(amountBeforeTax * (rates.cgst / 100));
    const sgstAmount = Math.round(amountBeforeTax * (rates.sgst / 100));

    const newTotal = amountBeforeTax + cgstAmount + sgstAmount;

    const billedSoFar = invoiceTotal(invoice) + upgradeBilledPaise;

    // Same rule as the server: no package change = billing untouched.
    const actualAmount = packageChanged ? newTotal : billedSoFar;

    // > 0: a NEW upgrade invoice will be raised
    // < 0: unpaid upgrade balances will shrink
    const upgradeDelta = actualAmount - billedSoFar;

    // Cheapest total allowed without a refund/credit workflow
    const floor = invoiceTotal(invoice) + upgradePaidPaise;

    return {
      packageChanged,
      packageAmount,
      discountAmount,
      referralDiscount,
      amountBeforeTax,
      cgstPercentage: rates.cgst,
      sgstPercentage: rates.sgst,
      cgstAmount,
      sgstAmount,
      actualAmount,
      upgradeDelta,
      floor,
      belowPaid: actualAmount < floor,
      balance: Math.max(actualAmount - totalCollectedPaise, 0),
    };
  }, [
    selectedPackageData,
    subscription,
    gstSetting,
    upgradeBilledPaise,
    upgradePaidPaise,
    totalCollectedPaise,
  ]);

  /* ----------------------------------------------------------
   * INVOICES + PAYMENT HISTORY
   * ---------------------------------------------------------- */

  const allInvoices = useMemo(() => {
    const list: { label: string; invoice: Invoice }[] = [];

    if (subscription?.invoice) {
      list.push({ label: "Original", invoice: subscription.invoice });
    }

    upgradeInvoices.forEach((invoice) =>
      list.push({ label: "Upgrade", invoice })
    );

    return list;
  }, [subscription, upgradeInvoices]);

  const allPayments = useMemo(
    () =>
      allInvoices
        .flatMap(({ label, invoice }) =>
          invoice.payments.map((payment) => ({
            ...payment,
            invoiceNumber: invoice.invoiceNumber,
            invoiceLabel: label,
          }))
        )
        .sort(
          (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime()
        ),
    [allInvoices]
  );

  /* ----------------------------------------------------------
   * CHANGES
   * ---------------------------------------------------------- */

  const hasChanges =
    selectedService !== initialService ||
    selectedSubCategory !== initialSubCategory ||
    selectedPackage !== initialPackage ||
    selectedBranch !== initialBranch ||
    startDate !== initialStartDate ||
    endDate !== initialEndDate;

  /* ----------------------------------------------------------
   * SAVE
   * ---------------------------------------------------------- */

  const handleUpdate = async () => {
    if (!subscriptionId) return;

    setError("");
    setSuccess("");

    if (!selectedService) return setError("Please select a service.");
    if (!selectedPackage) return setError("Please select a package.");
    if (!selectedBranch) return setError("Please select a branch.");

    if (!startDate || !endDate) {
      return setError("Start date and end date are required.");
    }

    if (endDate < startDate) {
      return setError("End date cannot be before the start date.");
    }

    if (billingPreview?.belowPaid) {
      return setError(
        `The selected membership total is below ${money(billingPreview.floor)} (original invoice plus amounts already paid on upgrade invoices). A refund or credit decision is required.`
      );
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService,
          subCategoryId: selectedSubCategory || null,
          packageId: selectedPackage,
          branchId: selectedBranch,
          startDate,
          endDate,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update membership.");
      }

      hydrate(
        data.subscription as SubscriptionData,
        (data.upgradeInvoices ?? []) as Invoice[]
      );

      setSuccess(data.message || "Membership updated successfully.");

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update membership."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------------------------------------
   * LOADING / NOT FOUND
   * ---------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3 text-neutral-400">
          <Loader2 size={20} className="animate-spin text-lime-400" />
          Loading membership...
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-400">
            {error || "Membership was not found."}
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}

        <div className="mb-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={saving}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-300 transition hover:bg-neutral-900 hover:text-white disabled:opacity-50"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold">Edit Membership</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Update the membership using the same billing flow.
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-lime-500/30 bg-lime-500/10 p-4 text-sm text-lime-300">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* MEMBERSHIP HEADER */}

        <div className="mb-5 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Membership
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  {subscription.packageName}
                </h2>

                <p className="mt-1 text-sm text-neutral-400">
                  {subscription.serviceName}
                  {" • "}
                  {subscription.branchName}
                </p>
              </div>

              <span className="rounded-full border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-400">
                {subscription.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_390px]">
          {/* ==================== LEFT ==================== */}

          <div className="space-y-5">
            {/* MEMBERSHIP SELECTION */}

            <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Membership Selection</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Change the package, branch or membership dates.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Service
                  </label>
                  <select
                    value={selectedService}
                    disabled={saving}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select Service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Sub Category
                  </label>
                  <select
                    value={selectedSubCategory}
                    disabled={
                      saving || !selectedService || subCategories.length === 0
                    }
                    onChange={(e) => handleSubCategoryChange(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">
                      {subCategories.length === 0
                        ? "No Sub Category"
                        : "Select Sub Category"}
                    </option>
                    {subCategories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Package
                  </label>
                  <select
                    value={selectedPackage}
                    disabled={saving || !selectedService}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select Package</option>
                    {availablePackages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name}
                        {" — "}
                        {money(pkg.price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Branch
                  </label>
                  <select
                    value={selectedBranch}
                    disabled={saving}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    disabled={saving}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    disabled={saving}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-neutral-800 bg-black p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">
                    Membership Duration
                  </span>
                  <span className="font-semibold">
                    {calculateDuration(startDate, endDate)} days
                  </span>
                </div>
              </div>
            </div>

            {/* INVOICES */}

            <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Invoices</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  The original invoice is never changed. Package upgrades are
                  billed on separate invoices.
                </p>
              </div>

              {allInvoices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
                  This membership has no invoice linked.
                </div>
              ) : (
                <div className="space-y-3">
                  {allInvoices.map(({ label, invoice }) => {
                    const paid = sumPaid(invoice.payments);
                    const balance = invoiceBalance(invoice);

                    return (
                      <div
                        key={invoice.id}
                        className="rounded-2xl border border-neutral-800 bg-black p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-neutral-500">
                              {label}
                            </p>
                            <p className="mt-1 font-medium">
                              {invoice.invoiceNumber}
                            </p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              {invoice.packageName}
                            </p>
                          </div>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge(
                              invoice.status
                            )}`}
                          >
                            {invoice.status.replace("_", " ")}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                          <div>
                            <p className="text-xs text-neutral-500">Package</p>
                            <p className="mt-1 font-semibold">
                              {money(invoice.finalAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">GST</p>
                            <p className="mt-1 font-semibold">
                              {money(invoiceTax(invoice))}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">Total</p>
                            <p className="mt-1 font-semibold">
                              {money(invoiceTotal(invoice))}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">Paid</p>
                            <p className="mt-1 font-semibold text-lime-400">
                              {money(paid)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">Balance</p>
                            <p className="mt-1 font-semibold text-amber-300">
                              {money(balance)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {balance > 0 && invoice.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => setCollectTarget(invoice)}
                              className="h-10 rounded-xl bg-lime-400 px-4 text-sm font-semibold text-black hover:bg-lime-300"
                            >
                              Collect Balance
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              window.open(`/api/invoice/${invoice.id}`, "_blank")
                            }
                            className="flex h-10 items-center gap-2 rounded-xl border border-neutral-700 px-4 text-sm"
                          >
                            <Download size={14} />
                            Download Invoice
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PAYMENT HISTORY */}

            <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Payment History</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Historical payments are never changed by membership editing.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">
                    Collected
                  </p>
                  <p className="mt-1 text-xl font-bold text-lime-400">
                    {money(totalCollectedPaise)}
                  </p>
                </div>
              </div>

              {allPayments.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
                        <th className="pb-3 pr-4">Receipt</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Invoice</th>
                        <th className="pb-3 pr-4">Method</th>
                        <th className="pb-3 pr-4">Type</th>
                        <th className="pb-3 pr-4 text-right">Amount</th>
                        <th className="pb-3 text-right" />
                      </tr>
                    </thead>

                    <tbody>
                      {allPayments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-neutral-900 last:border-0"
                        >
                          <td className="py-4 pr-4 font-medium">
                            {payment.receiptNumber}
                          </td>
                          <td className="py-4 pr-4 text-neutral-400">
                            {formatPaymentDate(payment.paidAt)}
                          </td>
                          <td className="py-4 pr-4 text-neutral-400">
                            <span className="block">{payment.invoiceNumber}</span>
                            <span className="text-xs text-neutral-600">
                              {payment.invoiceLabel}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-neutral-400">
                            {payment.paymentMode}
                          </td>
                          <td className="py-4 pr-4">
                            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300">
                              {payment.paymentType}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-right font-semibold">
                            {money(payment.amount)}
                          </td>
                          <td className="py-4 text-right">
                            {payment.status === "PAID" && (
                              <button
                                type="button"
                                onClick={() =>
                                  window.open(
                                    `/api/receipt/${payment.id}`,
                                    "_blank"
                                  )
                                }
                                className="h-9 rounded-xl border border-neutral-700 px-3 text-xs"
                              >
                                Receipt
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
                  No payment history found.
                </div>
              )}
            </div>
          </div>

          {/* ==================== RIGHT: BILLING ==================== */}

          <div className="space-y-5">
            <div className="sticky top-5 rounded-3xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Billing
                </p>
                <h3 className="mt-2 text-xl font-semibold">Billing Summary</h3>
              </div>

              {billingPreview ? (
                <div className="space-y-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-neutral-500">Package</span>
                    <span className="text-right font-medium">
                      {selectedPackageData?.name}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-neutral-500">Package Price</span>
                    <span>{money(billingPreview.packageAmount)}</span>
                  </div>

                  {billingPreview.discountAmount > 0 && (
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-neutral-500">Discount</span>
                      <span className="text-emerald-400">
                        -{money(billingPreview.discountAmount)}
                      </span>
                    </div>
                  )}

                  {billingPreview.referralDiscount > 0 && (
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-neutral-500">Referral Discount</span>
                      <span className="text-emerald-400">
                        -{money(billingPreview.referralDiscount)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-neutral-800 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Amount before tax</span>
                      <span>{money(billingPreview.amountBeforeTax)}</span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-neutral-500">
                        CGST ({billingPreview.cgstPercentage.toFixed(1)}%)
                      </span>
                      <span>{money(billingPreview.cgstAmount)}</span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-neutral-500">
                        SGST ({billingPreview.sgstPercentage.toFixed(1)}%)
                      </span>
                      <span>{money(billingPreview.sgstAmount)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-700 bg-black p-4">
                    <div className="flex justify-between gap-4">
                      <span className="font-medium">
                        Actual Price
                        <span className="block text-xs font-normal text-neutral-600">
                          GST included
                        </span>
                      </span>
                      <span className="text-xl font-bold">
                        {money(billingPreview.actualAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-lime-500/20 bg-lime-500/5 p-4">
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-neutral-400">
                        Already Collected
                        <span className="block text-xs text-neutral-600">
                          original + upgrade payments
                        </span>
                      </span>
                      <span className="font-semibold text-lime-400">
                        {money(totalCollectedPaise)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="font-medium text-amber-300">Balance Due</p>
                        <p className="mt-1 text-xs text-amber-400/70">
                          Actual Price − Amount Collected
                        </p>
                      </div>
                      <span className="text-xl font-bold text-amber-300">
                        {money(billingPreview.balance)}
                      </span>
                    </div>
                  </div>

                  {billingPreview.belowPaid ? (
                    <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      This total is below {money(billingPreview.floor)}{" "}
                      (original invoice + amounts already paid on upgrade
                      invoices). A refund or credit decision is needed first.
                    </div>
                  ) : billingPreview.upgradeDelta > 0 ? (
                    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-300">
                      Saving will create a new upgrade invoice for{" "}
                      <span className="font-semibold">
                        {money(billingPreview.upgradeDelta)}
                      </span>{" "}
                      (GST included). Collect it from the Invoices card after
                      saving. The original invoice and payments stay untouched.
                    </div>
                  ) : billingPreview.upgradeDelta < 0 ? (
                    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-300">
                      Saving will reduce unpaid upgrade invoice balances by{" "}
                      <span className="font-semibold">
                        {money(-billingPreview.upgradeDelta)}
                      </span>
                      .
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={saving || !hasChanges || billingPreview.belowPaid}
                    onClick={handleUpdate}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 px-5 font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Membership
                      </>
                    )}
                  </button>

                  {!hasChanges && (
                    <p className="text-center text-xs text-neutral-600">
                      No membership changes to save.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
                  {!subscription.invoice
                    ? "This membership has no invoice linked, so billing can't be previewed. Create the invoice through the billing flow first."
                    : "Select a package to preview billing."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLLECT BALANCE (same modal as the billing history page) */}

        {collectTarget && (
          <CollectBalanceModal
            balanceAmount={invoiceBalance(collectTarget)}
            invoiceId={collectTarget.id}
            member={{
              name: collectTarget.memberName ?? "",
              email: collectTarget.memberEmail ?? "",
              phone: collectTarget.memberPhone ?? "",
            }}
            open={!!collectTarget}
            onClose={() => setCollectTarget(null)}
            onSuccess={() => {
              setCollectTarget(null);
              void refreshInvoices();
            }}
          />
        )}
      </div>
    </div>
  );
}