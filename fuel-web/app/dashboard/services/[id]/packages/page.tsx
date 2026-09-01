"use client";

import type { Service, ServicePackage } from "@prisma/client";

import {
  CalendarDays,
  Dumbbell,
  Infinity as InfinityIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  useParams,
} from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

type PackageUsageType =
  | "DURATION_BASED"
  | "SESSION_BASED";

type Package = ServicePackage;

const Page = () => {
  const params = useParams();

  const serviceId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  /* =========================
     SERVICE STATE
  ========================= */

  const [service, setService] =
    useState<Service | null>(null);

  const [packages, setPackages] =
    useState<Package[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  /* =========================
     PACKAGE MODAL STATE
  ========================= */

  const [packageModalOpen, setPackageModalOpen] =
    useState(false);

  const [editingPackage, setEditingPackage] =
    useState<Package | null>(null);

  /* =========================
     PACKAGE FORM STATE
  ========================= */

  const [name, setName] =
    useState("");

  const [durationInDays, setDurationInDays] =
    useState("30");

  const [price, setPrice] =
    useState("");

  const [originalPrice, setOriginalPrice] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [isActive, setIsActive] =
    useState(true);

  const [usageType, setUsageType] =
    useState<PackageUsageType>(
      "DURATION_BASED"
    );

  const [totalSessions, setTotalSessions] =
    useState("");

  /* =========================
     FETCH DATA
  ========================= */

  const fetchData = async () => {
    if (!serviceId) {
      return;
    }

    try {
      setLoading(true);

      const [
        serviceResponse,
        packageResponse,
      ] = await Promise.all([
        fetch(
          `/api/services/${serviceId}`,
          {
            cache: "no-store",
          }
        ),

        fetch(
          `/api/services/${serviceId}/packages`,
          {
            cache: "no-store",
          }
        ),
      ]);

      const serviceData =
        await serviceResponse.json();

      const packageData =
        await packageResponse.json();

      setService(
        serviceData.service || null
      );

      if (!packageData.success) {
        alert(
          packageData.message ||
            "Failed to load packages"
        );

        return;
      }

      setPackages(
        packageData.packages || []
      );
    } catch (error) {
      console.error(error);

      alert(
        "Failed to load package data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [serviceId]);

  /* =========================
     FORM HELPERS
  ========================= */

  const resetPackageForm = () => {
    setName("");
    setDurationInDays("30");
    setPrice("");
    setOriginalPrice("");
    setDescription("");
    setIsActive(true);
    setUsageType("DURATION_BASED");
    setTotalSessions("");
    setEditingPackage(null);
  };

  const closePackageModal = () => {
    if (actionLoading) {
      return;
    }

    setPackageModalOpen(false);
    resetPackageForm();
  };

  const openCreatePackage = () => {
    resetPackageForm();
    setPackageModalOpen(true);
  };

  const openEditPackage = (
    servicePackage: Package
  ) => {
    setEditingPackage(
      servicePackage
    );

    setName(
      servicePackage.name
    );

    setDurationInDays(
      String(
        servicePackage.durationInDays
      )
    );

    setPrice(
      String(
        servicePackage.price / 100
      )
    );

    setOriginalPrice(
      servicePackage.originalPrice !==
        null
        ? String(
            servicePackage.originalPrice /
              100
          )
        : ""
    );

    setDescription(
      servicePackage.description || ""
    );

    setIsActive(
      servicePackage.isActive
    );

    setUsageType(
      servicePackage.usageType as PackageUsageType
    );

    setTotalSessions(
      servicePackage.totalSessions !==
        null
        ? String(
            servicePackage.totalSessions
          )
        : ""
    );

    setPackageModalOpen(true);
  };

  /* =========================
     CREATE / UPDATE PACKAGE
  ========================= */

  const handlePackageSubmit =
    async () => {
      const normalizedName =
        name.trim();

      const duration =
        Number(durationInDays);

      const sellingPrice =
        Number(price);

      const listedPrice =
        originalPrice
          ? Number(originalPrice)
          : null;

      const sessions =
        totalSessions
          ? Number(totalSessions)
          : null;

      /* -------------------------
         VALIDATION
      ------------------------- */

      if (!normalizedName) {
        alert(
          "Package name is required"
        );

        return;
      }

      if (
        !Number.isInteger(duration) ||
        duration <= 0
      ) {
        alert(
          "Duration must be a positive whole number"
        );

        return;
      }

      if (
        !Number.isFinite(
          sellingPrice
        ) ||
        sellingPrice <= 0
      ) {
        alert(
          "Price must be greater than zero"
        );

        return;
      }

      if (
        listedPrice !== null &&
        (
          !Number.isFinite(
            listedPrice
          ) ||
          listedPrice < sellingPrice
        )
      ) {
        alert(
          "Original price cannot be lower than the selling price"
        );

        return;
      }

      if (
        usageType ===
          "SESSION_BASED" &&
        (
          !Number.isInteger(
            sessions
          ) ||
          Number(sessions) <= 0
        )
      ) {
        alert(
          "Enter a valid number of sessions"
        );

        return;
      }

      if (!serviceId) {
        return;
      }

      setActionLoading(true);

      try {
        const payload = {
          name: normalizedName,

          durationInDays:
            duration,

          price: Math.round(
            sellingPrice * 100
          ),

          originalPrice:
            listedPrice !== null
              ? Math.round(
                  listedPrice * 100
                )
              : null,

          description:
            description.trim(),

          isActive,

          usageType,

          totalSessions:
            usageType ===
            "SESSION_BASED"
              ? sessions
              : null,
        };

        const endpoint =
          editingPackage
            ? `/api/services/${serviceId}/packages/${editingPackage.id}`
            : `/api/services/${serviceId}/packages`;

        const response =
          await fetch(
            endpoint,
            {
              method:
                editingPackage
                  ? "PUT"
                  : "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        const data =
          await response.json();

        if (!data.success) {
          alert(
            data.message ||
              "Failed to save package"
          );

          return;
        }

        closePackageModal();

        await fetchData();
      } catch (error) {
        console.error(error);

        alert(
          "Something went wrong"
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =========================
     DELETE PACKAGE
  ========================= */

  const deletePackage =
    async (
      packageId: string
    ) => {
      if (!serviceId) {
        return;
      }

      const confirmed =
        window.confirm(
          "Delete this package?"
        );

      if (!confirmed) {
        return;
      }

      setActionLoading(true);

      try {
        const response =
          await fetch(
            `/api/services/${serviceId}/packages/${packageId}`,
            {
              method: "DELETE",
            }
          );

        const data =
          await response.json();

        if (!data.success) {
          alert(
            data.message ||
              "Failed to delete package"
          );

          return;
        }

        await fetchData();
      } catch (error) {
        console.error(error);

        alert(
          "Failed to delete package"
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =========================
     RENDER
  ========================= */

  return (
    <div>
      {/* PAGE HEADER */}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Packages
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Manage duration and
            session-based packages
            for{" "}
            {service?.name ||
              "this service"}.
          </p>
        </div>

        <button
          type="button"
          onClick={
            openCreatePackage
          }
          className="flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
        >
          <Plus size={16} />

          Add Package
        </button>
      </div>

      {/* PACKAGE LIST */}

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        {loading ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            Loading packages...
          </div>
        ) : packages.length ===
          0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800 text-neutral-600">
              <Dumbbell
                size={25}
              />
            </div>

            <h2 className="mt-4 text-base font-semibold text-white">
              No packages found
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Create your first
              package for this
              service.
            </p>

            <button
              type="button"
              onClick={
                openCreatePackage
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
            >
              <Plus size={16} />

              Add Package
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {packages.map(
              (
                servicePackage
              ) => {
                const isSessionBased =
                  servicePackage.usageType ===
                  "SESSION_BASED";

                return (
                  <div
                    key={
                      servicePackage.id
                    }
                    className="flex flex-col justify-between gap-5 p-5 transition hover:bg-neutral-800/20 md:flex-row md:items-start"
                  >
                    {/* PACKAGE INFO */}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-white">
                          {
                            servicePackage.name
                          }
                        </h2>

                        {/* STATUS */}

                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-medium ${
                            servicePackage.isActive
                              ? "border-green-500/20 bg-green-500/10 text-green-400"
                              : "border-red-500/20 bg-red-500/10 text-red-400"
                          }`}
                        >
                          {servicePackage.isActive
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>

                        {/* USAGE TYPE */}

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                            isSessionBased
                              ? "border-violet-500/20 bg-violet-500/10 text-violet-300"
                              : "border-blue-500/20 bg-blue-500/10 text-blue-300"
                          }`}
                        >
                          {isSessionBased ? (
                            <Dumbbell
                              size={11}
                            />
                          ) : (
                            <InfinityIcon
                              size={11}
                            />
                          )}

                          {isSessionBased
                            ? `${
                                servicePackage.totalSessions ||
                                0
                              } SESSIONS`
                            : "UNLIMITED ENTRY"}
                        </span>
                      </div>

                      {/* PACKAGE DETAILS */}

                      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4 text-sm">
                        {/* VALIDITY */}

                        <div>
                          <p className="text-neutral-500">
                            Validity
                          </p>

                          <p className="mt-1 inline-flex items-center gap-1.5 text-white">
                            <CalendarDays
                              size={14}
                            />

                            {
                              servicePackage.durationInDays
                            }{" "}
                            Days
                          </p>
                        </div>

                        {/* PRICE */}

                        <div>
                          <p className="text-neutral-500">
                            Price
                          </p>

                          <p className="mt-1 text-white">
                            ₹
                            {(
                              servicePackage.price /
                              100
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>

                        {/* ORIGINAL PRICE */}

                        {servicePackage.originalPrice !==
                          null && (
                          <div>
                            <p className="text-neutral-500">
                              Original
                            </p>

                            <p className="mt-1 text-neutral-400 line-through">
                              ₹
                              {(
                                servicePackage.originalPrice /
                                100
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* DESCRIPTION */}

                      {servicePackage.description && (
                        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
                          {
                            servicePackage.description
                          }
                        </p>
                      )}
                    </div>

                    {/* ACTIONS */}

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditPackage(
                            servicePackage
                          )
                        }
                        className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deletePackage(
                            servicePackage.id
                          )
                        }
                        disabled={
                          actionLoading
                        }
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* =========================
          PACKAGE MODAL
      ========================= */}

      {packageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingPackage
                    ? "Edit Package"
                    : "Add Package"}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  Configure package
                  validity, pricing
                  and entry limits.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closePackageModal
                }
                disabled={
                  actionLoading
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="overflow-y-auto px-5 py-5">
              <form
                className="space-y-5"
                onSubmit={(
                  event
                ) => {
                  event.preventDefault();

                  handlePackageSubmit();
                }}
              >
                {/* PACKAGE NAME */}

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Package Name
                  </label>

                  <input
                    value={name}
                    onChange={(
                      event
                    ) =>
                      setName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Example: Zumba 12 Sessions"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
                  />
                </div>

                {/* MEMBERSHIP ACCESS */}

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Membership Access
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* DURATION BASED */}

                    <button
                      type="button"
                      onClick={() => {
                        setUsageType(
                          "DURATION_BASED"
                        );

                        setTotalSessions(
                          ""
                        );
                      }}
                      className={`rounded-2xl border p-4 text-left transition ${
                        usageType ===
                        "DURATION_BASED"
                          ? "border-lime-400 bg-lime-400/10"
                          : "border-zinc-700 bg-black hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-lime-300">
                          <InfinityIcon
                            size={20}
                          />
                        </div>

                        <div>
                          <p className="font-semibold text-white">
                            Unlimited by
                            Validity
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            Regular gym
                            membership
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* SESSION BASED */}

                    <button
                      type="button"
                      onClick={() =>
                        setUsageType(
                          "SESSION_BASED"
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        usageType ===
                        "SESSION_BASED"
                          ? "border-lime-400 bg-lime-400/10"
                          : "border-zinc-700 bg-black hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-violet-300">
                          <Dumbbell
                            size={20}
                          />
                        </div>

                        <div>
                          <p className="font-semibold text-white">
                            Fixed Sessions
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            PT, Zumba,
                            Yoga, etc.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* VALIDITY + SESSIONS */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* VALIDITY */}

                  <div>
                    <label className="mb-2 block text-sm text-neutral-400">
                      Validity in Days
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        durationInDays
                      }
                      onChange={(
                        event
                      ) =>
                        setDurationInDays(
                          event.target
                            .value
                        )
                      }
                      placeholder="60"
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
                    />
                  </div>

                  {/* SESSIONS */}

                  {usageType ===
                    "SESSION_BASED" && (
                    <div>
                      <label className="mb-2 block text-sm text-neutral-400">
                        Number of
                        Sessions
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          totalSessions
                        }
                        onChange={(
                          event
                        ) =>
                          setTotalSessions(
                            event.target
                              .value
                          )
                        }
                        placeholder="12"
                        className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
                      />
                    </div>
                  )}
                </div>

                {/* DESCRIPTION */}

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Description
                  </label>

                  <textarea
                    value={
                      description
                    }
                    onChange={(
                      event
                    ) =>
                      setDescription(
                        event.target
                          .value
                      )
                    }
                    placeholder="Package description..."
                    className="min-h-[110px] w-full resize-none rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
                  />
                </div>

                {/* PRICING */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* SELLING PRICE */}

                  <div>
                    <label className="mb-2 block text-sm text-neutral-400">
                      Selling Price
                      (₹)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(
                        event
                      ) =>
                        setPrice(
                          event.target
                            .value
                        )
                      }
                      placeholder="5000"
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
                    />
                  </div>

                  {/* ORIGINAL PRICE */}

                  <div>
                    <label className="mb-2 block text-sm text-neutral-400">
                      Original Price
                      (₹)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        originalPrice
                      }
                      onChange={(
                        event
                      ) =>
                        setOriginalPrice(
                          event.target
                            .value
                        )
                      }
                      placeholder="Optional"
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
                    />
                  </div>
                </div>

                {/* ACTIVE */}

                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black px-4 py-3">
                  <div>
                    <p className="text-sm text-white">
                      Active Package
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Customers can
                      purchase this
                      package
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      isActive
                    }
                    onChange={(
                      event
                    ) =>
                      setIsActive(
                        event.target
                          .checked
                      )
                    }
                    className="h-5 w-5 accent-lime-400"
                  />
                </div>

                {/* ACTIONS */}

                <div className="flex justify-end gap-3 border-t border-zinc-800 pt-5">
                  <button
                    type="button"
                    onClick={
                      closePackageModal
                    }
                    disabled={
                      actionLoading
                    }
                    className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      actionLoading
                    }
                    className="rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading
                      ? "Saving..."
                      : editingPackage
                      ? "Update Package"
                      : "Create Package"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
