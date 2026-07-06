"use client";

import { useEffect, useMemo, useState } from "react";
import { SubscribeModal } from "./SubscribeModal";
import { useBranch } from "../contexts/BranchContext";

import {
  Branch,
  Coupon,
  Service,
  ServicePackage,
} from "@prisma/client";

type PackageWithCoupons = ServicePackage & {
  coupons: Coupon[];
};

type ServiceWithBranches = Service & {
  branches: Branch[];
  packages: PackageWithCoupons[];
};

export const Pricing = () => {
  const { selectedBranch } = useBranch();

  const [services, setServices] = useState<
    ServiceWithBranches[]
  >([]);

  const [selectedPackage, setSelectedPackage] =
    useState<PackageWithCoupons | null>(null);

  const [selectedService, setSelectedService] =
    useState<ServiceWithBranches | null>(null);

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  
  const [gstSettings, setGstSettings] = useState<{
    cgstPercentage: number;
    sgstPercentage: number;
  } | null>(null);

  // ---------------- FETCH GST SETTINGS ----------------
  useEffect(() => {
    const fetchGstSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();

        if (data.setting) {
          setGstSettings({
            cgstPercentage: data.setting.cgstPercentage,
            sgstPercentage: data.setting.sgstPercentage
          });
        }
      } catch (err) {
        console.error('Error fetching GST settings:', err);
      }
    };
    
    fetchGstSettings();
  }, []);

  // ---------------- FETCH SERVICES ----------------
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/services?branchId=${selectedBranch?.id}`
        );

        const data = await res.json();

        setServices(data.services || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (selectedBranch) {
      fetchServices();
    }
  }, [selectedBranch]);

  // ---------------- FILTER BY BRANCH ----------------
  const filteredServices = useMemo(() => {
    if (!selectedBranch) return [];

    return services.filter((service) =>
      service.branches.some(
        (branch) => branch.id === selectedBranch.id
      )
    );
  }, [services, selectedBranch]);

  return (
    <section
      id="pricing"
      className="relative bg-black py-28 px-6 overflow-hidden"
    >
      {/* 🔥 Background Glow */}
      <div
        className="
          absolute top-0 left-1/2 -translate-x-1/2
          w-[700px] h-[700px]
          bg-lime-400/5 blur-[140px]
          rounded-full
          pointer-events-none
        "
      />

      {/* HEADER */}
      <div className="relative text-center max-w-3xl mx-auto">
        <p className="text-lime-400 text-xs tracking-[0.5em] uppercase mb-4">
          Fuel Memberships
        </p>

        <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
          Choose Your
          <span className="text-lime-400">
            {" "}
            Fitness Journey
          </span>
        </h2>

        <p className="mt-5 text-neutral-500 text-sm md:text-base leading-relaxed">
          Personalized programs crafted for every
          fitness goal. Select your service and
          choose the membership package that fits
          your lifestyle.
        </p>

        {/* Selected Branch */}
        {selectedBranch && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-lime-400/20 bg-lime-400/10">
            <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />

            <span className="text-sm text-lime-300 font-medium">
              {selectedBranch.name}
            </span>
          </div>
        )}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="mt-24 flex justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-lime-400 border-t-transparent animate-spin" />
        </div>
      )}

      {/* EMPTY */}
      {!loading && filteredServices.length === 0 && (
        <div className="mt-24 text-center">
          <h3 className="text-2xl font-bold text-white">
            No Services Available
          </h3>

          <p className="text-neutral-500 mt-3">
            No memberships are currently available
            for this branch.
          </p>
        </div>
      )}

      {/* SERVICES */}
      <div className="relative mt-20 max-w-7xl mx-auto space-y-20">
        {filteredServices.map((service) => (
          <div key={service.id}>
            {/* SERVICE HEADER */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <h3 className="text-3xl md:text-4xl font-bold text-white">
                  {service.name}
                </h3>
              </div>

              <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-lime-400/30 to-transparent ml-10" />
            </div>

            {/* PACKAGES */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {service.packages
                .filter((pkg) => pkg.isActive)
                .map((pkg) => {
                  const hasDiscount =
                    pkg.originalPrice &&
                    pkg.originalPrice > pkg.price;

                  const discountPercentage =
                    hasDiscount &&
                    pkg.originalPrice
                      ? Math.round(
                          ((pkg.originalPrice -
                            pkg.price) /
                            pkg.originalPrice) *
                            100
                        )
                      : 0;

                  return (
                    <div
                      key={pkg.id}
                      className="
                        group relative
                        bg-neutral-900/70
                        border border-neutral-800
                        rounded-3xl
                        p-7
                        overflow-hidden
                        transition-all duration-500
                        hover:border-lime-400/40
                        hover:-translate-y-1
                      "
                    >
                      {/* Glow */}
                      <div
                        className="
                          absolute inset-0
                          bg-gradient-to-br
                          from-lime-400/[0.07]
                          via-transparent
                          to-transparent
                          opacity-0
                          group-hover:opacity-100
                          transition-opacity duration-500
                        "
                      />

                      {/* Discount Badge */}
                      {hasDiscount && (
                        <div
                          className="
                            absolute top-4 right-4
                            px-3 py-1
                            rounded-full
                            bg-lime-400
                            text-black
                            text-xs
                            font-bold
                          "
                        >
                          SAVE {discountPercentage}%
                        </div>
                      )}

                      {/* Package Name */}
                      <h4 className="relative text-2xl font-bold text-white">
                        {pkg.name}
                      </h4>

                      {/* Duration */}
                      <p className="relative mt-2 text-sm text-neutral-500">
                        {pkg.durationInDays} Days
                        Membership
                      </p>

                      {/* Price */}
                      <div className="relative mt-8">
                        <div className="flex items-end gap-3">
                          <span className="text-5xl font-black text-white">
                            ₹
                            {(
                              pkg.price / 100
                            ).toLocaleString()}
                          </span>

                          {hasDiscount && (
                            <span className="text-lg text-neutral-600 line-through mb-1">
                              ₹
                              {(
                                (pkg.originalPrice ||
                                  0) / 100
                              ).toLocaleString()}
                            </span>
                          )}
                        </div>

                        <p className="text-neutral-500 text-sm mt-2">
                          One-time payment
                          {gstSettings && (
                            <span className="text-lime-400 ml-1">
                              + GST ({gstSettings.cgstPercentage + gstSettings.sgstPercentage}%)
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Description */}
                      <div className="mt-7 min-h-[70px]">
                        <p className="text-sm leading-relaxed text-neutral-400">
                          {pkg.description ||
                            "Access premium training facilities and personalized fitness experience."}
                        </p>
                      </div>

                      {/* PACKAGE COUPONS */}
                      {pkg.coupons &&
                        pkg.coupons.filter(
                          (coupon) =>
                            coupon.isActive &&
                            !coupon.isPrivate
                        ).length > 0 && (
                          <div className="">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />

                              <p className="text-sm font-semibold text-lime-300">
                                Available Offers
                              </p>
                            </div>

                            <div className="space-y-3">
                              {pkg.coupons
                                .filter(
                                  (coupon) =>
                                    coupon.isActive &&
                                    !coupon.isPrivate
                                )
                                .map((coupon) => {
                                  const isPercent =
                                    !!coupon.discountPercent;

                                  return (
                                    <div
                                      key={coupon.id}
                                      className="
                                        relative
                                        overflow-hidden
                                        rounded-2xl
                                        border border-lime-400/20
                                        bg-lime-400/5
                                        p-4
                                      "
                                    >
                                      {/* Coupon Top */}
                                      <div className="flex items-start justify-between gap-4">
                                        <div>
                                          <p className="text-[10px] tracking-[0.25em] uppercase text-lime-400 mb-2">
                                            Coupon Code
                                          </p>

                                          <div className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-dashed border-lime-400/30 bg-black/40">
                                            <span className="text-lg font-black tracking-[0.2em] text-lime-300">
                                              {coupon.code}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-right">
                                          <p className="text-2xl font-black text-white">
                                            {isPercent
                                              ? `${coupon.discountPercent}%`
                                              : `₹${(
                                                  (coupon.discountFlatAmount ||
                                                    0) /
                                                  100
                                                ).toLocaleString()}`}
                                          </p>

                                          <p className="text-xs text-neutral-400 mt-1">
                                            OFF
                                          </p>
                                        </div>
                                      </div>

                                      {/* Description */}
                                      <p className="mt-4 text-xs leading-relaxed text-neutral-400">
                                        Apply this
                                        coupon during
                                        checkout to
                                        unlock your
                                        membership
                                        discount.
                                      </p>

                                      {/* Expiry */}
                                      {coupon.expiresAt && (
                                        <div className="mt-3 text-[11px] text-neutral-500">
                                          Valid till{" "}
                                          {new Date(
                                            coupon.expiresAt
                                          ).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                      {/* CTA */}
                      <button
                        onClick={() => {
                          setSelectedPackage(pkg);
                          setSelectedService(service);
                          setOpen(true);
                        }}
                        className="
                          relative mt-8 w-full h-12
                          rounded-2xl
                          bg-lime-400
                          text-black
                          font-bold
                          hover:scale-[1.02]
                          hover:shadow-[0_0_40px_rgba(163,230,53,0.35)]
                          transition-all duration-300
                          cursor-pointer
                        "
                      >
                        Choose Package
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* SUBSCRIBE MODAL */}
      {selectedPackage && selectedService && (
        <SubscribeModal
          open={open}
          setOpen={setOpen}
          selectedPackage={selectedPackage}
          service={selectedService}
        />
      )}
    </section>
  );
};