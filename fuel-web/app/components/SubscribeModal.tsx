"use client";

import {
  Branch,
  Coupon,
  Service,
  ServicePackage,
} from "@prisma/client";
import { useSearchParams } from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  service: Service & {
    branches: Branch[];
  };
  selectedPackage: ServicePackage;
};

export const SubscribeModal = ({
  open,
  setOpen,
  service,
  selectedPackage,
}: Props) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    branchId: "",
  });
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  
  const [extendModal, setExtendModal] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  // 🔥 COUPON
  const [couponLoading, setCouponLoading] =
    useState<string | null>(null);

  const [appliedCoupons, setAppliedCoupons] =
    useState<Coupon[]>([]);

  const [availableCoupons, setAvailableCoupons] =
    useState<any[]>([]);

  const [couponError, setCouponError] =
    useState("");

  // 🔥 GST Settings
  const [gstSettings, setGstSettings] = useState<{
    cgstPercentage: number;
    sgstPercentage: number;
  } | null>(null);

  // 🔥 BRANCHES
  const branches = service.branches || [];

  // 🔥 AUTO SELECT FIRST BRANCH & FETCH DATA
  useEffect(() => {
    if (
      branches.length > 0 &&
      !form.branchId
    ) {
      setForm((prev) => ({
        ...prev,
        branchId: branches[0].id,
      }));
    }
  }, [branches, form.branchId]);

  // 🔥 FETCH COUPONS AND GST SETTINGS
  useEffect(() => {
    if (!open) return;

    const fetchCoupons = async () => {
      try {
        const res = await fetch('/api/coupons');
        const data = await res.json();
        if (data.success && data.coupons) {
          // Filter out expired and private coupons for client view
          const now = new Date();
          const validCoupons = data.coupons.filter((coupon: any) => {
            // Hide private coupons from public view
            if (coupon.isPrivate) return false;
            // Check if coupon is expired
            if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
              return false;
            }
            // Check if usage limit exceeded
            if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
              return false;
            }
            return true;
          });
          setAvailableCoupons(validCoupons);
        }
      } catch (error) {
        console.error('Failed to fetch coupons:', error);
      }
    };

    const fetchGstSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.setting) {
          setGstSettings({
            cgstPercentage: data.setting.cgstPercentage || 2.5,
            sgstPercentage: data.setting.sgstPercentage || 2.5,
          });
        } else {
          setGstSettings({
            cgstPercentage: 2.5,
            sgstPercentage: 2.5,
          });
        }
      } catch (error) {
        console.error('Failed to fetch GST settings:', error);
        setGstSettings({
          cgstPercentage: 2.5,
          sgstPercentage: 2.5,
        });
      }
    };

    fetchCoupons();
    fetchGstSettings();
  }, [open]);

  // 🔥 VALIDATION
  const isPhoneValid = useMemo(() => {
    return /^[6-9]\d{9}$/.test(
      form.phone
    );
  }, [form.phone]);

  const isEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      form.email
    );
  }, [form.email]);

  const selectedBranch = useMemo(() => {
    return branches.find(
      (b) => b.id === form.branchId
    );
  }, [branches, form.branchId]);

  // 🔥 DISCOUNT
  const discountAmount = useMemo(() => {
    if (!appliedCoupons.length) return 0;

    let totalDiscount = 0;
    let remainingAmount = selectedPackage.price;

    // Apply coupons in order
    for (const coupon of appliedCoupons) {
      if (coupon.discountPercent) {
        const discount = Math.round(
          (remainingAmount * coupon.discountPercent) / 100
        );
        totalDiscount += discount;
        remainingAmount -= discount;
      } else if (coupon.discountFlatAmount) {
        const discount = Math.min(
          coupon.discountFlatAmount,
          remainingAmount
        );
        totalDiscount += discount;
        remainingAmount -= discount;
      }
    }

    return totalDiscount;
  }, [appliedCoupons, selectedPackage]);

  const finalPrice =
    selectedPackage.price -
    discountAmount;

  // 🔥 GST CALCULATION
  const cgstAmount = gstSettings
    ? Math.round(finalPrice * (gstSettings.cgstPercentage / 100))
    : 0;

  const sgstAmount = gstSettings
    ? Math.round(finalPrice * (gstSettings.sgstPercentage / 100))
    : 0;

  const totalGST = cgstAmount + sgstAmount;
  const invoiceTotal = finalPrice + totalGST;

  // 🔥 FILTER APPLICABLE COUPONS
  const applicableCoupons = useMemo(() => {
    if (!selectedPackage) return [];

    return availableCoupons.filter((coupon) => {
      // Check if already applied
      if (appliedCoupons.some(c => c.id === coupon.id)) {
        return false;
      }
      
      // Check if coupon is for all packages or specific package
      if (!coupon.packages || coupon.packages.length === 0) {
        // Universal coupon
        return true;
      }
      
      // Check if package is in coupon's package list
      return coupon.packages.some(
        (pkg: any) => pkg.id === selectedPackage.id
      );
    });
  }, [availableCoupons, selectedPackage, appliedCoupons]);

  // 🔥 VALIDATE AND APPLY COUPON
  const validateAndApplyCoupon = async (coupon: any) => {
    const isApplied = appliedCoupons.some(c => c.id === coupon.id);
    
    if (isApplied) {
      // Remove if clicking on already applied coupon
      setAppliedCoupons(appliedCoupons.filter(c => c.id !== coupon.id));
      setCouponError("");
      return;
    }

    try {
      setCouponLoading(coupon.id);
      setCouponError("");

      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: coupon.code,
          packageId: selectedPackage.id
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setCouponError(data.message || "This coupon is not valid");
        return;
      }

      // Add to applied coupons
      setAppliedCoupons([...appliedCoupons, data.coupon]);
      setCouponError("");
    } catch (err) {
      console.error(err);
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(null);
    }
  };

  // 🔥 REMOVE COUPON
  const removeCoupon = (couponId: string) => {
    setAppliedCoupons(appliedCoupons.filter(c => c.id !== couponId));
    setCouponError("");
  };

  // 🔥 SUBMIT
  const handleSubmit = async (
    extend = false
  ) => {
    if (
      !form.name ||
      !form.phone ||
      !form.email ||
      !form.branchId
    ) {
      alert("Please fill all fields");
      return;
    }

    if (!isPhoneValid) {
      alert(
        "Enter valid 10 digit phone"
      );
      return;
    }

    if (!isEmailValid) {
      alert("Enter valid email");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/payment/create-order",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            email: form.email,
            branchId: form.branchId,
            ref,
            packageId:
              selectedPackage.id,
            extend,
            discountAmount
          }),
        }
      );

      const data = await res.json();

      if (
        !data.success &&
        data.requiresConfirmation
      ) {
        setExtendModal(true);
        setLoading(false);
        return;
      }

      if (!data.success) {
        alert(
          data.message ||
            "Something went wrong"
        );

        setLoading(false);
        return;
      }

      const options = {
        key: process.env
          .NEXT_PUBLIC_RAZORPAY_KEY,

        amount: data.amount,

        currency: "INR",

        order_id: data.orderId,

        name: "Fuel Gym",

        description: `${service.name} - ${selectedPackage.name}`,

        handler: function () {
          alert(
            "Payment successful 🎉"
          );

          setOpen(false);
        },

        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },

        theme: {
          color: "#a3e635",
        },
      };

      const rzp = new (
        window as any
      ).Razorpay(options);

      rzp.open();
    } catch (err) {
      console.error(err);

      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* MAIN MODAL */}
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-lg max-h-[90vh] rounded-3xl border border-neutral-800 bg-neutral-950 overflow-hidden flex flex-col">
          {/* HEADER */}
          <div className="shrink-0 p-5 border-b border-neutral-800 bg-gradient-to-b from-lime-400/10 to-transparent">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.3em] text-lime-400 mb-1">
                  Fuel Gym
                </p>

                <h2 className="text-xl font-bold text-white truncate">
                  {service.name}
                </h2>

                <p className="text-sm text-neutral-400 mt-0.5 truncate">
                  {selectedPackage.name}
                </p>
              </div>

              <button
                onClick={() =>
                  setOpen(false)
                }
                className="shrink-0 ml-3 text-neutral-500 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* PRICE */}
            <div className="mt-4">
              <div className="flex items-end gap-3 flex-wrap">
                <h3 className="text-3xl font-black text-white">
                  ₹{(invoiceTotal / 100).toLocaleString()}
                </h3>
                {gstSettings && (
                  <p className="text-xs text-neutral-400 mb-1.5">
                    (incl. ₹{(totalGST / 100).toLocaleString()} GST)
                  </p>
                )}
              </div>
              
              {appliedCoupons.length > 0 && (
                <p className="text-sm text-lime-400 mt-2">
                  {appliedCoupons.length} {appliedCoupons.length === 1 ? 'coupon' : 'coupons'} applied • You saved ₹{(discountAmount / 100).toLocaleString()}
                </p>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-[11px] text-neutral-300">
                {
                  selectedPackage.durationInDays
                }{" "}
                Days
              </span>

              {selectedBranch && (
                <span className="px-2.5 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-[11px] text-lime-300">
                  {selectedBranch.name}
                </span>
              )}
            </div>
          </div>

          {/* FORM */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-3.5">
              {/* NAME */}
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block">
                  Full Name
                </label>

                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter your name"
                  className="w-full h-11 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400 transition"
                />
              </div>

              {/* PHONE */}
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block">
                  Mobile Number
                </label>

                <div className="flex h-11 rounded-xl overflow-hidden border border-neutral-800 focus-within:border-lime-400 transition">
                  <div className="w-14 bg-neutral-800 flex items-center justify-center text-white text-sm font-medium">
                    +91
                  </div>

                  <input
                    value={form.phone}
                    maxLength={10}
                    inputMode="numeric"
                    onChange={(e) => {
                      const value =
                        e.target.value.replace(
                          /\D/g,
                          ""
                        );

                      setForm({
                        ...form,
                        phone: value,
                      });
                    }}
                    placeholder="9876543210"
                    className="flex-1 bg-neutral-900 px-4 text-white outline-none"
                  />
                </div>

                {form.phone &&
                  !isPhoneValid && (
                    <p className="text-red-400 text-xs mt-1.5">
                      Enter valid 10
                      digit mobile
                      number
                    </p>
                  )}
              </div>

              {/* EMAIL */}
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block">
                  Email Address
                </label>

                <input
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email:
                        e.target.value,
                    })
                  }
                  placeholder="Enter your email"
                  className="w-full h-11 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400 transition"
                />

                {form.email &&
                  !isEmailValid && (
                    <p className="text-red-400 text-xs mt-1.5">
                      Enter valid email
                      address
                    </p>
                  )}
              </div>

              {/* COUPONS - Clean Customer UI */}
              {(applicableCoupons.length > 0 || appliedCoupons.length > 0) && (
                <div>
                  <label className="text-xs text-neutral-400 mb-2 block">
                    Available Offers
                  </label>

                  {/* Coupon List - BookMyShow Style */}
                  {applicableCoupons.length > 0 && (
                    <div className="space-y-2">
                      {applicableCoupons.map((coupon) => {
                        const isApplied = appliedCoupons.some(c => c.id === coupon.id);
                        const isLoading = couponLoading === coupon.id;
                        
                        return (
                          <div
                            key={coupon.id}
                            className={`rounded-xl border transition-all ${
                              isApplied
                                ? "border-lime-400/50 bg-lime-400/10"
                                : "border-neutral-800 bg-neutral-900"
                            }`}
                          >
                            <div className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block px-2 py-0.5 rounded bg-lime-400/20 text-lime-300 text-xs font-bold">
                                      {coupon.code}
                                    </span>
                                    <span className="text-xs text-neutral-400">
                                      {coupon.discountPercent
                                        ? `${coupon.discountPercent}% OFF`
                                        : `₹${(coupon.discountFlatAmount / 100).toLocaleString()} OFF`}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => isApplied ? removeCoupon(coupon.id) : validateAndApplyCoupon(coupon)}
                                  disabled={isLoading}
                                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                                    isApplied
                                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                      : "bg-lime-400/20 text-lime-300 hover:bg-lime-400/30"
                                  } ${isLoading ? "opacity-50" : ""}`}
                                >
                                  {isLoading ? "..." : isApplied ? "Remove" : "Apply"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Applied Coupons Summary */}
                  {appliedCoupons.length > 0 && (
                    <div className="mt-3 rounded-xl bg-lime-400/5 border border-lime-400/20 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-lime-400 font-medium">
                            {appliedCoupons.length} {appliedCoupons.length === 1 ? 'coupon' : 'coupons'} applied
                          </p>
                          <p className="text-sm text-white font-bold mt-0.5">
                            You save ₹{(discountAmount / 100).toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAppliedCoupons([])}
                          className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-medium transition"
                        >
                          remove
                        </button>
                      </div>
                    </div>
                  )}

                  {couponError && (
                    <p className="text-red-400 text-xs mt-2">
                      {couponError}
                    </p>
                  )}
                </div>
              )}

              {/* BRANCH */}
              {branches.length > 1 && (
                <div>
                  <label className="text-xs text-neutral-400 mb-1.5 block">
                    Select Branch
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {branches.map(
                      (branch) => {
                        const active =
                          form.branchId ===
                          branch.id;

                        return (
                          <button
                            key={
                              branch.id
                            }
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                branchId:
                                  branch.id,
                              })
                            }
                            className={`h-11 rounded-xl border text-sm font-medium transition px-3 truncate
                            ${
                              active
                                ? "border-lime-400 bg-lime-400/10 text-lime-300"
                                : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                            }`}
                          >
                            {
                              branch.name
                            }
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="shrink-0 p-5 border-t border-neutral-800 bg-neutral-950">
            {/* Compact price summary */}
      

            <button
              disabled={loading}
              onClick={() =>
                handleSubmit(false)
              }
              className="w-full h-12 rounded-xl bg-lime-400 text-black font-bold hover:bg-lime-300 transition disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : `Pay ₹${(
                    invoiceTotal / 100
                  ).toLocaleString()}`}
            </button>

            <p className="text-[11px] text-neutral-500 text-center mt-2.5">
              Secure payments powered by
              Razorpay
            </p>
          </div>
        </div>
      </div>

      {/* EXTEND MODAL */}
      {extendModal && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-xl font-bold text-white">
              Active Membership Found
            </h3>

            <p className="text-neutral-400 text-sm mt-3 leading-relaxed">
              You already have an active
              membership. Extending will
              add additional days to your
              existing plan.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() =>
                  setExtendModal(false)
                }
                className="flex-1 h-11 rounded-2xl bg-neutral-900 border border-neutral-800 text-white"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setExtendModal(false);

                  handleSubmit(true);
                }}
                className="flex-1 h-11 rounded-2xl bg-lime-400 text-black font-semibold"
              >
                Extend Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};