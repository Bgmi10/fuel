"use client";

import {
  Branch,
  Coupon,
  Member,
  Service,
  ServicePackage,
} from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDaysUTC, nowUTC } from "@/app/utils/date";

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type SubCategoryPackage = {
  package: ServicePackage;
};

type ServiceSubCategory = {
  id: string;
  name: string;
  packages: SubCategoryPackage[];
};

type ServiceWithPackages = Service & {
  packages: ServicePackage[];
  branches: Branch[];
  subCategories: ServiceSubCategory[];
};

type Props = {
  services: ServiceWithPackages[];
  member: Member & {
    referrals?: any[];
  };
  onSuccess?: () => void;
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

const BillingPage = ({
  services,
  member,
  onSuccess,
}: Props) => {
  const router = useRouter();

  /*
   * SELECTIONS
   * ============================================================
   */

  const [selectedService, setSelectedService] =
    useState("");



  const [selectedSubCategory, setSelectedSubCategory] =
    useState("");

  const [selectedPackage, setSelectedPackage] =
    useState("");

  const [selectedReferral, setSelectedReferral] =
    useState<any | null>(null);

  const [selectedBranch, setSelectedBranch] =
    useState("");

  /*
   * ============================================================
   * SELECTED SERVICE
   * ============================================================
   */

  const selectedServiceObj = useMemo(() => {
    return services.find(
      (service) => service.id === selectedService
    );
  }, [selectedService, services]);

  /*
   * ============================================================
   * SUB CATEGORIES
   * ============================================================
   */

  const subCategories =
    selectedServiceObj?.subCategories || [];

  /*
   * ============================================================
   * SELECTED SUB CATEGORY
   * ============================================================
   */

  const selectedSubCategoryObj = useMemo(() => {
    return subCategories.find(
      (subCategory) =>
        subCategory.id === selectedSubCategory
    );
  }, [subCategories, selectedSubCategory]);

  /*
   * ============================================================
   * PACKAGES
   *
   * If sub-category is selected:
   *
   * Service
   *   ↓
   * Sub Category
   *   ↓
   * Sub Category Packages
   *
   * If no sub-category is selected:
   *
   * Service
   *   ↓
   * Service-level Packages
   * ============================================================
   */

  const packages = useMemo(() => {
    if (selectedSubCategoryObj) {
      return selectedSubCategoryObj.packages
        .map((item) => item.package)
        .filter((pkg) => pkg.isActive);
    }

    return (
      selectedServiceObj?.packages?.filter(
        (pkg) => pkg.isActive
      ) || []
    );
  }, [
    selectedSubCategoryObj,
    selectedServiceObj,
  ]);

  /*
   * ============================================================
   * BRANCHES
   * ============================================================
   */

  const branches =
    selectedServiceObj?.branches || [];

  /*
   * ============================================================
   * SELECTED PACKAGE
   * ============================================================
   */

  const selectedPackageObj = useMemo(() => {
    return packages.find(
      (pkg) => pkg.id === selectedPackage
    );
  }, [packages, selectedPackage]);

  /*
   * ============================================================
   * REFERRAL REWARDS
   * ============================================================
   */

  const availableReferralRewards = useMemo(() => {
    return (
      member?.referrals?.filter(
        (ref: any) =>
          ref.rewardIssued &&
          !ref.rewardClaimed &&
          (ref.rewardType === "FIXED_AMOUNT" ||
            ref.rewardType ===
              "PERCENTAGE_DISCOUNT")
      ) || []
    );
  }, [member]);

  /*
   * ============================================================
   * DATE FORMATTER
   * ============================================================
   */

  const formatDateInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  /*
   * ============================================================
   * INITIAL DATES
   * ============================================================
   */

  const todayUTC = nowUTC();

  const [startDate, setStartDate] =
    useState(formatDateInput(todayUTC));

  const [endDate, setEndDate] =
    useState("");

  /*
   * ============================================================
   * PAYMENT
   * ============================================================
   */

  const [paymentMode, setPaymentMode] =
    useState("Cash");

  const [
    initialPaymentMethod,
    setInitialPaymentMethod,
  ] = useState("Cash");

  const [paidAmount, setPaidAmount] =
    useState("");

  const [
    collectionType,
    setCollectionType,
  ] = useState<"FLAT" | "PERCENT">("FLAT");

  const [notes, setNotes] = useState("");

  const [loading, setLoading] =
    useState(false);

  /*
   * ============================================================
   * GST SETTINGS
   * ============================================================
   */

  const [gstSettings, setGstSettings] =
    useState<{
      cgstPercentage: number;
      sgstPercentage: number;
    } | null>(null);

  /*
   * ============================================================
   * COUPONS
   * ============================================================
   */

  const [couponLoading, setCouponLoading] =
    useState<string | null>(null);

  const [appliedCoupons, setAppliedCoupons] =
    useState<Coupon[]>([]);

  const [availableCoupons, setAvailableCoupons] =
    useState<any[]>([]);

  const [couponError, setCouponError] =
    useState("");

  /*
   * ============================================================
   * FETCH SETTINGS + COUPONS
   * ============================================================
   */

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(
          "/api/settings"
        );

        const data = await res.json();

        if (
          data.success &&
          data.setting
        ) {
          setGstSettings({
            cgstPercentage:
              data.setting
                .cgstPercentage || 2.5,

            sgstPercentage:
              data.setting
                .sgstPercentage || 2.5,
          });
        } else {
          setGstSettings({
            cgstPercentage: 2.5,
            sgstPercentage: 2.5,
          });
        }
      } catch (error) {
        console.error(
          "Failed to fetch GST settings:",
          error
        );

        setGstSettings({
          cgstPercentage: 2.5,
          sgstPercentage: 2.5,
        });
      }
    };

    const fetchCoupons = async () => {
      try {
        const res = await fetch(
          "/api/coupons"
        );

        const data = await res.json();

        if (
          data.success &&
          data.coupons
        ) {
          const now = new Date();

          const validCoupons =
            data.coupons.filter(
              (coupon: any) => {
                if (
                  coupon.expiresAt &&
                  new Date(
                    coupon.expiresAt
                  ) < now
                ) {
                  return false;
                }

                if (
                  coupon.usageLimit &&
                  coupon.usedCount >=
                    coupon.usageLimit
                ) {
                  return false;
                }

                return true;
              }
            );

          setAvailableCoupons(
            validCoupons
          );
        }
      } catch (error) {
        console.error(
          "Failed to fetch coupons:",
          error
        );
      }
    };

    fetchSettings();
    fetchCoupons();
  }, []);

  /*
   * ============================================================
   * AUTO DATES
   * ============================================================
   */

  useEffect(() => {
    const today = nowUTC();

    setStartDate(
      formatDateInput(today)
    );

    if (!selectedPackageObj) {
      setEndDate("");
      return;
    }

    const calculatedEndDate =
      addDaysUTC(
        today,
        selectedPackageObj.durationInDays - 1
      );

    setEndDate(
      formatDateInput(
        calculatedEndDate
      )
    );
  }, [selectedPackageObj]);

  /*
   * ============================================================
   * SERVICE RESET
   *
   * Service changes:
   * - reset sub-category
   * - reset package
   * - reset branch
   * - reset coupons
   * ============================================================
   */

  useEffect(() => {
    setSelectedSubCategory("");
    setSelectedPackage("");
    setSelectedBranch("");
    setAppliedCoupons([]);
    setCouponError("");
    setSelectedReferral(null);
  }, [selectedService]);

  /*
   * ============================================================
   * SUB CATEGORY RESET
   *
   * Sub-category changes:
   * - reset package
   * - reset coupons
   * ============================================================
   */

  useEffect(() => {
    setSelectedPackage("");
    setAppliedCoupons([]);
    setCouponError("");
  }, [selectedSubCategory]);

  /*
   * ============================================================
   * PACKAGE RESET
   * ============================================================
   */

  useEffect(() => {
    setAppliedCoupons([]);
    setCouponError("");
  }, [selectedPackage]);

  /*
   * ============================================================
   * AMOUNTS
   * ============================================================
   */

  const packageAmount =
    selectedPackageObj?.price || 0;

  /*
   * ============================================================
   * REFERRAL DISCOUNT
   * ============================================================
   */

  const referralDiscount = useMemo(() => {
    if (!selectedReferral) {
      return 0;
    }

    if (
      selectedReferral.rewardType ===
      "FIXED_AMOUNT"
    ) {
      return (
        selectedReferral.rewardAmount || 0
      );
    }

    if (
      selectedReferral.rewardType ===
      "PERCENTAGE_DISCOUNT"
    ) {
      return Math.round(
        packageAmount *
          ((selectedReferral.rewardPercentage ||
            0) /
            100)
      );
    }

    return 0;
  }, [
    selectedReferral,
    packageAmount,
  ]);

  /*
   * ============================================================
   * PAID INPUT
   * ============================================================
   */

  const paidInput =
    Number(paidAmount) || 0;

  /*
   * ============================================================
   * COUPON DISCOUNT
   * ============================================================
   */

  const discount = useMemo(() => {
    if (!appliedCoupons.length) {
      return 0;
    }

    let totalDiscount = 0;
    let remainingAmount = packageAmount;

    for (const coupon of appliedCoupons) {
      if (coupon.discountPercent) {
        const discountAmount =
          Math.round(
            (remainingAmount *
              coupon.discountPercent) /
              100
          );

        totalDiscount +=
          discountAmount;

        remainingAmount -=
          discountAmount;
      } else if (
        coupon.discountFlatAmount
      ) {
        const discountAmount =
          Math.min(
            coupon.discountFlatAmount,
            remainingAmount
          );

        totalDiscount +=
          discountAmount;

        remainingAmount -=
          discountAmount;
      }
    }

    return totalDiscount;
  }, [
    appliedCoupons,
    packageAmount,
  ]);

  /*
   * ============================================================
   * APPLICABLE COUPONS
   * ============================================================
   */

  const applicableCoupons = useMemo(() => {
    if (!selectedPackage) {
      return [];
    }

    return availableCoupons.filter(
      (coupon) => {
        if (
          appliedCoupons.some(
            (c) => c.id === coupon.id
          )
        ) {
          return false;
        }

        if (
          !coupon.packages ||
          coupon.packages.length === 0
        ) {
          return true;
        }

        return coupon.packages.some(
          (pkg: any) =>
            pkg.id === selectedPackage
        );
      }
    );
  }, [
    availableCoupons,
    selectedPackage,
    appliedCoupons,
  ]);

  /*
   * ============================================================
   * FINAL AMOUNTS
   * ============================================================
   */

  const finalAmount = Math.max(
    packageAmount -
      discount -
      referralDiscount,
    0
  );

  const collectedAmount =
    collectionType === "PERCENT"
      ? Math.round(
          finalAmount *
            (paidInput / 100)
        )
      : paidInput * 100;

  /*
   * ============================================================
   * GST
   * ============================================================
   */

  const cgstAmount = gstSettings
    ? Math.round(
        finalAmount *
          (gstSettings.cgstPercentage /
            100)
      )
    : 0;

  const sgstAmount = gstSettings
    ? Math.round(
        finalAmount *
          (gstSettings.sgstPercentage /
            100)
      )
    : 0;

  const totalGST =
    cgstAmount + sgstAmount;

  const invoiceTotal =
    finalAmount + totalGST;

  const balanceAmount = Math.max(
    invoiceTotal -
      collectedAmount,
    0
  );

  const paymentStatus =
    collectedAmount <= 0
      ? "Pending"
      : balanceAmount <= 0
      ? "Fully Paid"
      : "Partial Paid";

  /*
   * ============================================================
   * CURRENCY
   * ============================================================
   */

  const formatCurrency = (
    amount: number
  ) => {
    return (amount / 100).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 0,
      }
    );
  };

  /*
   * ============================================================
   * APPLY COUPON
   * ============================================================
   */

  const validateAndApplyCoupon =
    async (coupon: any) => {
      if (!selectedPackage) {
        setCouponError(
          "Please select package first"
        );
        return;
      }

      const isApplied =
        appliedCoupons.some(
          (c) => c.id === coupon.id
        );

      if (isApplied) {
        setAppliedCoupons(
          appliedCoupons.filter(
            (c) => c.id !== coupon.id
          )
        );

        setCouponError("");
        return;
      }

      try {
        setCouponLoading(
          coupon.id
        );

        setCouponError("");

        const res = await fetch(
          "/api/coupons/validate",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              code: coupon.code,
              packageId:
                selectedPackage,
            }),
          }
        );

        const data =
          await res.json();

        if (!data.success) {
          setCouponError(
            data.message ||
              "Invalid coupon"
          );
          return;
        }

        setAppliedCoupons([
          ...appliedCoupons,
          data.coupon,
        ]);

        setCouponError("");
      } catch (err) {
        console.error(err);

        setCouponError(
          "Failed to validate coupon"
        );
      } finally {
        setCouponLoading(null);
      }
    };

  /*
   * ============================================================
   * REMOVE COUPON
   * ============================================================
   */

  const removeCoupon = (
    couponId: string
  ) => {
    setAppliedCoupons(
      appliedCoupons.filter(
        (coupon) =>
          coupon.id !== couponId
      )
    );
  };

  /*
   * ============================================================
   * CASH BILLING
   * ============================================================
   */

  const createCashBilling =
    async () => {
      const res = await fetch(
        "/api/payment/cash",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            memberId: member.id,

            referralId:
              selectedReferral?.id ??
              null,
            serviceId: selectedService,
            subCategoryId: selectedSubCategory,
            referralDiscountAmount:
              referralDiscount,

            packageId:
              selectedPackage,

            branchId:
              selectedBranch,

            startDate,
            endDate,

            couponCodes:
              appliedCoupons.map(
                (c) => c.code
              ),

            discountAmount:
              discount,

            paidAmount:
              collectedAmount,

            paymentMode,

            initialPaymentMethod:
              paymentMode ===
              "Razorpay"
                ? initialPaymentMethod
                : paymentMode,

            notes,
          }),
        }
      );

      return await res.json();
    };

  /*
   * ============================================================
   * RAZORPAY ORDER
   * ============================================================
   */

  const createRazorpayOrder =
    async () => {
      const res = await fetch(
        "/api/payment/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            memberId: member.id,
            subCategoryId: selectedSubCategory,
            ref:
              member.referralCode,

            packageId:
              selectedPackage,

            referralDiscountAmount:
              referralDiscount,

            branchId:
              selectedBranch,

            startDate,
            endDate,

            couponCodes:
              appliedCoupons.map(
                (c) => c.code
              ),

            discountAmount:
              discount,

            paidAmount:
              collectedAmount,

            paymentMode,

            initialPaymentMethod:
              paymentMode ===
              "Razorpay"
                ? initialPaymentMethod
                : paymentMode,

            notes,
          }),
        }
      );

      return await res.json();
    };

  /*
   * ============================================================
   * SUBMIT
   * ============================================================
   */

  const handleSubmit = async () => {
    if (
      !selectedService ||
      !selectedPackage ||
      !selectedBranch
    ) {
      alert(
        "Please select service, package and branch"
      );
      return;
    }

    if (!startDate || !endDate) {
      alert(
        "Please select start and end date"
      );
      return;
    }

    if (
      new Date(endDate) <
      new Date(startDate)
    ) {
      alert(
        "End date cannot be before start date"
      );
      return;
    }

    if (
      collectedAmount >
      invoiceTotal
    ) {
      alert(
        "Collected amount cannot exceed invoice total"
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * CASH / UPI / CARD / BANK
       */

      if (
        paymentMode === "Cash" ||
        paymentMode === "UPI" ||
        paymentMode === "Card" ||
        paymentMode ===
          "Bank Transfer"
      ) {
        const data =
          await createCashBilling();

        if (!data.success) {
          alert(
            data.message ||
              "Something went wrong"
          );
          return;
        }

        alert(
          "Billing created successfully"
        );

        onSuccess?.();

        router.push(
          `/dashboard/members/${member.id}`
        );

        return;
      }

      /*
       * RAZORPAY
       */

      const data =
        await createRazorpayOrder();

      if (!data.success) {
        alert(
          data.message ||
            "Something went wrong"
        );
        return;
      }

      const options = {
        key: process.env
          .NEXT_PUBLIC_RAZORPAY_KEY,

        amount: data.amount,

        currency: "INR",

        order_id: data.orderId,

        name: "Fuel Gym",

        description:
          selectedPackageObj?.name,

        handler: () => {
          window.alert(
            "Payment successful!"
          );

          router.push(
            `/dashboard/members/${member.id}`
          );
        },

        prefill: {
          name: member.name,
          email: member.email,
          contact: member.phone,
        },

        theme: {
          color: "#A3E635",
        },
      };

      const rzp =
        new window.Razorpay(
          options
        );

      rzp.open();
    } catch (e) {
      console.log(e);

      alert(
        "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() =>
              router.back()
            }
            className="w-11 h-11 rounded-2xl border border-neutral-800 bg-neutral-900 flex items-center justify-center hover:border-lime-400 transition"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-3xl font-bold">
              Billing Details
            </h1>

            <p className="text-neutral-500 mt-1">
              Create invoice and manage
              membership billing
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* LEFT */}

          <div className="lg:col-span-2 space-y-6">

            {/* MEMBER */}

            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
              <div className="flex items-center gap-4">

                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950">
                  {member.profileImage ? (
                    <img
                      src={
                        member.profileImage
                      }
                      alt={
                        member.name
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-lime-400">
                      {member.name?.charAt(
                        0
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    {member.name}
                  </h2>

                  <p className="text-neutral-400 mt-1">
                    {member.phone}
                  </p>

                  {member.email && (
                    <p className="text-neutral-500 text-sm mt-1">
                      {member.email}
                    </p>
                  )}
                </div>

              </div>
            </div>

            {/* MEMBERSHIP */}

            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

              <h3 className="text-lg font-semibold mb-5">
                Membership Selection
              </h3>

              <div className="grid md:grid-cols-2 gap-5">

                {/* SERVICE */}

                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    Service
                  </label>

                  <select
                    value={
                      selectedService
                    }
                    onChange={(e) =>{
                      console.log(e.target.value)
                      setSelectedService(
                        e.target.value
                      )}
                    }
                    className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400"
                  >
                    <option value="">
                      Select Service
                    </option>

                    {services.map(
                      (service) => (
                        <option
                          key={
                            service.id
                          }
                          value={
                            service.id
                          }
                        >
                          {
                            service.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* SUB CATEGORY */}

                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    Sub Category
                  </label>

                  <select
                    value={
                      selectedSubCategory
                    }
                    disabled={
                      !selectedService ||
                      subCategories.length ===
                        0
                    }
                    onChange={(e) =>
                      setSelectedSubCategory(
                        e.target.value
                      )
                    }
                    className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400 disabled:opacity-50"
                  >
                    <option value="">
                      {subCategories.length ===
                      0
                        ? "No Sub Categories"
                        : "Select Sub Category"}
                    </option>

                    {subCategories.map(
                      (subCategory) => (
                        <option
                          key={
                            subCategory.id
                          }
                          value={
                            subCategory.id
                          }
                        >
                          {
                            subCategory.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* PACKAGE */}

                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    Package
                  </label>

                  <select
                    value={
                      selectedPackage
                    }
                    disabled={
                      !selectedService ||
                      (subCategories.length >
                        0 &&
                        !selectedSubCategory)
                    }
                    onChange={(e) =>
                      setSelectedPackage(
                        e.target.value
                      )
                    }
                    className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400 disabled:opacity-50"
                  >
                    <option value="">
                      {!selectedService
                        ? "Select Service First"
                        : subCategories.length >
                            0 &&
                          !selectedSubCategory
                        ? "Select Sub Category First"
                        : packages.length ===
                          0
                        ? "No Packages Available"
                        : "Select Package"}
                    </option>

                    {packages.map(
                      (pkg) => (
                        <option
                          key={pkg.id}
                          value={pkg.id}
                        >
                          {pkg.name} — ₹
                          {formatCurrency(
                            pkg.price
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* BRANCH */}

                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    Branch
                  </label>

                  <select
                    value={
                      selectedBranch
                    }
                    disabled={
                      !selectedService
                    }
                    onChange={(e) =>
                      setSelectedBranch(
                        e.target.value
                      )
                    }
                    className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400 disabled:opacity-50"
                  >
                    <option value="">
                      Select Branch
                    </option>

                    {branches.map(
                      (branch) => (
                        <option
                          key={
                            branch.id
                          }
                          value={
                            branch.id
                          }
                        >
                          {
                            branch.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* PAYMENT METHOD */}

                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    Payment Method
                  </label>

                  <select
                    value={
                      paymentMode
                    }
                    onChange={(e) =>
                      setPaymentMode(
                        e.target.value
                      )
                    }
                    className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400"
                  >
                    <option value="Cash">
                      Cash
                    </option>

                    <option value="UPI">
                      UPI
                    </option>

                    <option value="Card">
                      Card
                    </option>

                    <option value="Bank Transfer">
                      Bank Transfer
                    </option>

                    <option value="Razorpay">
                      Razorpay
                    </option>
                  </select>
                </div>

              </div>
            </div>

            {/* PAYMENT DETAILS */}

            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

              <h3 className="text-lg font-semibold mb-5">
                Payment Details
              </h3>

              {/* COUPONS */}

              <div>
                <label className="text-sm text-neutral-400 mb-2 block">
                  Coupons & Discounts
                </label>

                {couponError && (
                  <p className="text-red-400 text-sm mb-2">
                    {couponError}
                  </p>
                )}

                {appliedCoupons.length >
                  0 && (
                  <div className="mt-4">

                    <p className="text-sm text-neutral-400 mb-2">
                      Applied Coupons
                    </p>

                    <div className="space-y-2">

                      {appliedCoupons.map(
                        (coupon) => (
                          <div
                            key={
                              coupon.id
                            }
                            className="flex items-center justify-between rounded-xl border border-lime-400/20 bg-lime-400/10 p-3"
                          >
                            <div>

                              <p className="text-lime-300 font-semibold">
                                {
                                  coupon.code
                                }
                              </p>

                              <p className="text-xs text-neutral-400 mt-1">
                                {coupon.discountPercent
                                  ? `${coupon.discountPercent}% off`
                                  : `₹${formatCurrency(
                                      coupon.discountFlatAmount ??
                                        0
                                    )} off`}
                              </p>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeCoupon(
                                  coupon.id
                                )
                              }
                              className="text-red-400 hover:text-red-300"
                            >
                              ✕
                            </button>
                          </div>
                        )
                      )}

                    </div>

                    <p className="text-sm text-lime-400 mt-2">
                      Total Discount: ₹
                      {formatCurrency(
                        discount
                      )}
                    </p>

                  </div>
                )}

                {/* AVAILABLE COUPONS */}

                {selectedPackage &&
                  applicableCoupons.length >
                    0 && (
                    <div className="mt-4">

                      <p className="text-sm text-neutral-400 mb-3">
                        Click to apply
                        coupons
                      </p>

                      <div className="space-y-2">

                        {applicableCoupons.map(
                          (coupon) => {
                            const isLoading =
                              couponLoading ===
                              coupon.id;

                            return (
                              <button
                                key={
                                  coupon.id
                                }
                                type="button"
                                onClick={() =>
                                  validateAndApplyCoupon(
                                    coupon
                                  )
                                }
                                disabled={
                                  isLoading
                                }
                                className={`w-full text-left rounded-xl border p-4 transition ${
                                  isLoading
                                    ? "opacity-50"
                                    : "border-neutral-700 bg-neutral-950 hover:border-lime-400/50"
                                }`}
                              >
                                <div className="flex items-start justify-between">

                                  <div className="flex-1">

                                    <div className="flex items-center gap-2 flex-wrap">

                                      <p className="font-semibold text-sm">
                                        {
                                          coupon.code
                                        }
                                      </p>

                                      <div className="flex gap-1.5">

                                        {coupon.isPrivate && (
                                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-medium">
                                            PRIVATE
                                          </span>
                                        )}

                                        {!coupon.isPrivate && (
                                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-medium">
                                            PUBLIC
                                          </span>
                                        )}

                                        {coupon.usageLimit && (
                                          <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-medium">
                                            {coupon.usedCount ||
                                              0}
                                            /
                                            {
                                              coupon.usageLimit
                                            }{" "}
                                            USED
                                          </span>
                                        )}

                                      </div>

                                    </div>

                                    <p className="text-xs text-neutral-400 mt-2">
                                      {coupon.discountPercent
                                        ? `${coupon.discountPercent}% discount`
                                        : `₹${formatCurrency(
                                            coupon.discountFlatAmount
                                          )} discount`}
                                    </p>

                                    {coupon.expiresAt && (
                                      <p className="text-xs text-yellow-400 mt-1">
                                        Expires:{" "}
                                        {new Date(
                                          coupon.expiresAt
                                        ).toLocaleDateString()}
                                      </p>
                                    )}

                                    {coupon.packages &&
                                    coupon
                                      .packages
                                      .length >
                                      0 ? (
                                      <p className="text-xs text-neutral-500 mt-1">
                                        Applicable
                                        for:{" "}
                                        {coupon.packages
                                          .map(
                                            (
                                              p: any
                                            ) =>
                                              p.name
                                          )
                                          .join(
                                            ", "
                                          )}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-neutral-500 mt-1">
                                        Universal
                                        coupon
                                      </p>
                                    )}

                                  </div>

                                  <div className="ml-3">
                                    {isLoading ? (
                                      <span className="text-neutral-400">
                                        ...
                                      </span>
                                    ) : (
                                      <span className="text-neutral-400 text-lg">
                                        +
                                      </span>
                                    )}
                                  </div>

                                </div>
                              </button>
                            );
                          }
                        )}

                      </div>
                    </div>
                  )}
              </div>

              {/* REFERRAL REWARDS */}

              {selectedPackage &&
                availableReferralRewards.length >
                  0 && (
                  <div className="mt-6">

                    <label className="text-sm text-neutral-400 mb-3 block">
                      Referral Rewards
                    </label>

                    <div className="space-y-2">

                      {availableReferralRewards.map(
                        (reward: any) => {
                          const active =
                            selectedReferral?.id ===
                            reward.id;

                          return (
                            <div
                              key={
                                reward.id
                              }
                              className={`rounded-xl border p-4 ${
                                active
                                  ? "border-lime-400 bg-lime-400/10"
                                  : "border-neutral-700 bg-neutral-950"
                              }`}
                            >
                              <div className="flex items-center justify-between">

                                <div>

                                  <div className="flex items-center gap-2">

                                    <p className="font-medium">
                                      {reward.rewardType ===
                                      "FIXED_AMOUNT"
                                        ? `₹${formatCurrency(
                                            reward.rewardAmount ||
                                              0
                                          )} Reward`
                                        : `${reward.rewardPercentage}% Discount`}
                                    </p>

                                    <span className="px-2 py-1 rounded-full bg-cyan-500/15 text-cyan-400 text-[10px] font-medium">
                                      REFERRAL
                                    </span>

                                  </div>

                                  <p className="text-xs text-neutral-500 mt-1">
                                    Earned from successful
                                    referral
                                  </p>

                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      active
                                    ) {
                                      setSelectedReferral(
                                        null
                                      );
                                    } else {
                                      setSelectedReferral(
                                        reward
                                      );
                                    }
                                  }}
                                  className={`px-4 h-9 rounded-xl text-sm font-medium transition ${
                                    active
                                      ? "bg-red-500/10 border border-red-500/30 text-red-400"
                                      : "bg-lime-400 text-black"
                                  }`}
                                >
                                  {active
                                    ? "Remove"
                                    : "Apply"}
                                </button>

                              </div>
                            </div>
                          );
                        }
                      )}

                    </div>
                  </div>
                )}

              {/* COLLECTED */}

              <div className="grid md:grid-cols-2 gap-5 mt-5">

                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    Amount Collected
                  </label>

                  <div className="relative flex items-center">

                    <button
                      type="button"
                      onClick={() =>
                        setCollectionType(
                          (prev) =>
                            prev === "FLAT"
                              ? "PERCENT"
                              : "FLAT"
                        )
                      }
                      className="absolute left-1 top-1 bottom-1 z-10 px-4 rounded-xl bg-neutral-800 border border-neutral-700 text-white font-semibold min-w-[56px]"
                    >
                      {collectionType ===
                      "FLAT"
                        ? "₹"
                        : "%"}
                    </button>

                    <input
                      type="number"
                      value={
                        paidAmount
                      }
                      onChange={(e) =>
                        setPaidAmount(
                          e.target.value
                        )
                      }
                      placeholder="Enter value"
                      className="w-full h-14 rounded-2xl bg-neutral-950 border border-neutral-800 pl-20 pr-4 text-white outline-none focus:border-lime-400"
                    />

                  </div>
                </div>

              </div>

              {/* DATES */}

              <div className="grid md:grid-cols-2 gap-5 mt-5">

                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    Membership Start Date
                  </label>

                  <input
                    type="date"
                    value={
                      startDate
                    }
                    onChange={(e) => {
                      const value =
                        e.target.value;

                      setStartDate(
                        value
                      );

                      if (
                        selectedPackageObj &&
                        !endDate
                      ) {
                        const start =
                          new Date(
                            value
                          );

                        const calculatedEndDate =
                          addDaysUTC(
                            start,
                            selectedPackageObj.durationInDays -
                              1
                          );

                        setEndDate(
                          formatDateInput(
                            calculatedEndDate
                          )
                        );
                      }
                    }}
                    className="w-full h-14 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400 [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    Membership End Date
                  </label>

                  <input
                    type="date"
                    value={
                      endDate
                    }
                    min={
                      startDate
                    }
                    onChange={(e) =>
                      setEndDate(
                        e.target.value
                      )
                    }
                    className="w-full h-14 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400 [color-scheme:dark]"
                  />
                </div>

              </div>

              {/* INITIAL PAYMENT METHOD */}

              {collectedAmount >
                0 &&
                paymentMode ===
                  "Razorpay" && (
                  <div className="mt-5">

                    <label className="text-sm text-neutral-400 mb-2 block">
                      Initial Collected Via
                    </label>

                    <select
                      value={
                        initialPaymentMethod
                      }
                      onChange={(e) =>
                        setInitialPaymentMethod(
                          e.target.value
                        )
                      }
                      className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400"
                    >
                      <option value="Cash">
                        Cash
                      </option>

                      <option value="GPay">
                        GPay
                      </option>

                      <option value="Card">
                        Card
                      </option>

                      <option value="Bank Transfer">
                        Bank Transfer
                      </option>
                    </select>

                  </div>
                )}

              {/* NOTES */}

              <div className="mt-5">

                <label className="text-sm text-neutral-400 mb-2 block">
                  Notes
                </label>

                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) =>
                    setNotes(
                      e.target.value
                    )
                  }
                  placeholder="Optional notes..."
                  className="w-full rounded-2xl bg-neutral-950 border border-neutral-800 px-4 py-3 text-white outline-none focus:border-lime-400 resize-none"
                />

              </div>

            </div>
          </div>

          {/* SUMMARY */}

          <div>

            <div className="sticky top-6 bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

              <h3 className="text-lg font-semibold mb-6">
                Billing Summary
              </h3>

              <div className="space-y-4">

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">
                    Package Amount
                  </span>

                  <span className="font-semibold">
                    ₹
                    {formatCurrency(
                      packageAmount
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">
                    Coupon Discount
                  </span>

                  <span className="text-red-400 font-semibold">
                    - ₹
                    {formatCurrency(
                      discount
                    )}
                  </span>
                </div>

                {selectedReferral && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">
                      Referral Reward
                    </span>

                    <span className="text-red-400 font-semibold">
                      - ₹
                      {formatCurrency(
                        referralDiscount
                      )}
                    </span>
                  </div>
                )}

                <div className="border-t border-neutral-800 pt-4 flex items-center justify-between">
                  <span className="text-neutral-300 font-medium">
                    Subtotal
                  </span>

                  <span className="font-semibold">
                    ₹
                    {formatCurrency(
                      finalAmount
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">
                    CGST (
                    {gstSettings?.cgstPercentage ||
                      0}
                    %)
                  </span>

                  <span className="text-neutral-300">
                    ₹
                    {formatCurrency(
                      cgstAmount
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">
                    SGST (
                    {gstSettings?.sgstPercentage ||
                      0}
                    %)
                  </span>

                  <span className="text-neutral-300">
                    ₹
                    {formatCurrency(
                      sgstAmount
                    )}
                  </span>
                </div>

                <div className="border-t border-neutral-800 pt-4 flex items-center justify-between">
                  <span className="text-neutral-300 font-medium">
                    Total Amount
                  </span>

                  <span className="text-xl font-bold">
                    ₹
                    {formatCurrency(
                      invoiceTotal
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">
                    Collected
                  </span>

                  <span className="text-lime-400 font-semibold">
                    ₹
                    {formatCurrency(
                      collectedAmount
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">
                    Balance
                  </span>

                  <span className="text-yellow-400 font-semibold">
                    ₹
                    {formatCurrency(
                      balanceAmount
                    )}
                  </span>
                </div>

                <div className="pt-4">

                  <div
                    className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${
                      paymentStatus ===
                      "Fully Paid"
                        ? "bg-lime-400/15 text-lime-400"
                        : paymentStatus ===
                          "Partial Paid"
                        ? "bg-yellow-400/15 text-yellow-400"
                        : "bg-red-400/15 text-red-400"
                    }`}
                  >
                    {paymentStatus}
                  </div>

                </div>

              </div>

              <button
                onClick={
                  handleSubmit
                }
                disabled={loading}
                className="mt-8 w-full h-12 rounded-2xl bg-lime-400 text-black font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : [
                      "Cash",
                      "UPI",
                      "Bank Transfer",
                      "Card",
                    ].includes(
                      paymentMode
                    )
                  ? "Create Billing"
                  : "Continue To Payment"}
              </button>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default BillingPage;
