

"use client";

import {
  Service,
  ServicePackage,
} from "@prisma/client";

import { useEffect, useState } from "react";

type Coupon = {
  id: string;

  code: string;

  isActive: boolean;
  isPrivate: boolean;

  discountPercent?: number | null;
  discountFlatAmount?: number | null;

  usageLimit?: number | null;

  usedCount: number;

  expiresAt?: string | null;

  createdAt: string;

  packages: {
    id: string;
    name: string;

    service: {
      id: string;
      name: string;
    };
  }[];
};

const Page = () => {
  const [coupons, setCoupons] =
    useState<Coupon[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [open, setOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [services, setServices] =
    useState<
      (Service & {
        packages: ServicePackage[];
      })[] | null
    >(null);

  const [form, setForm] = useState({
    code: "",

    isActive: true,
    isPrivate: false,

    discountPercent: "",
    discountFlatAmount: "",

    usageLimit: "",

    expiresAt: "",

    packageIds: [] as string[],
  });

  // =====================================================
  // FETCH SERVICES + PACKAGES
  // =====================================================

  const fetchServices = async () => {
    try {
      const res = await fetch(
        `/api/services`
      );

      const data = await res.json();

      setServices(data.services || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // =====================================================
  // FETCH COUPONS
  // =====================================================

  const fetchCoupons = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/coupons"
      );

      const data = await res.json();

      setCoupons(data.coupons || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {
    setEditingId(null);

    setForm({
      code: "",

      isActive: true,
      isPrivate: false,

      discountPercent: "",
      discountFlatAmount: "",

      usageLimit: "",

      expiresAt: "",

      packageIds: [],
    });
  };

  // =====================================================
  // OPEN CREATE
  // =====================================================

  const openCreate = () => {
    resetForm();

    setOpen(true);
  };

  // =====================================================
  // OPEN EDIT
  // =====================================================

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);

    setForm({
      code: coupon.code,

      isActive: coupon.isActive,
      isPrivate: coupon.isPrivate,

      discountPercent:
        coupon.discountPercent?.toString() ||
        "",

      discountFlatAmount:
        coupon.discountFlatAmount
          ? (
              coupon.discountFlatAmount /
              100
            ).toString()
          : "",

      usageLimit:
        coupon.usageLimit?.toString() || "",

      expiresAt: coupon.expiresAt
        ? new Date(coupon.expiresAt)
            .toISOString()
            .slice(0, 16)
        : "",

      packageIds:
        coupon.packages?.map(
          (pkg) => pkg.id
        ) || [],
    });

    setOpen(true);
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async () => {
    try {
      const payload = {
        code: form.code,

        isActive: form.isActive,
        isPrivate: form.isPrivate,

        packageIds: form.packageIds,

        discountPercent:
          form.discountPercent
            ? Number(
                form.discountPercent
              )
            : null,

        discountFlatAmount:
          form.discountFlatAmount
            ? Math.round(
                Number(
                  form.discountFlatAmount
                ) * 100
              )
            : null,

        usageLimit: form.usageLimit
          ? Number(form.usageLimit)
          : null,

        expiresAt:
          form.expiresAt || null,
      };

      const res = await fetch(
        editingId
          ? `/api/coupons/${editingId}`
          : "/api/coupons",
        {
          method: editingId
            ? "PATCH"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      await fetchCoupons();

      setOpen(false);

      resetForm();
    } catch (e) {
      console.log(e);

      alert("Something went wrong");
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (
    id: string
  ) => {
    const confirmDelete = window.confirm(
      "Delete this coupon?"
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `/api/coupons/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      await fetchCoupons();
    } catch (e) {
      console.log(e);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-black text-white p-6">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">

        <div>
          <h1 className="text-3xl font-bold">
            Coupons
          </h1>

          <p className="text-neutral-500 mt-1">
            Manage discount coupons
          </p>
        </div>

        <button
          onClick={openCreate}
          className="h-11 px-5 rounded-2xl bg-lime-400 text-black font-semibold"
        >
          Create Coupon
        </button>

      </div>

      {/* TABLE */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="border-b border-neutral-800 text-neutral-400">
            <tr>

              <th className="p-4 text-left">
                Code
              </th>

              <th className="p-4 text-left">
                Discount
              </th>

              <th className="p-4 text-left">
                Packages
              </th>

              <th className="p-4 text-left">
                Usage
              </th>

              <th className="p-4 text-left">
                Expiry
              </th>

              <th className="p-4 text-left">
                Actions
              </th>

            </tr>
          </thead>

          <tbody>

            {!loading &&
              coupons.map((coupon) => (
                <tr
                  key={coupon.id}
                  className="border-b border-neutral-800 align-top"
                >

                  {/* CODE */}
                  <td className="p-4">

                    <div className="flex flex-col">

                      <span className="font-semibold">
                        {coupon.code}
                      </span>

                      <div className="flex gap-2 mt-2">

                        {coupon.isPrivate ? (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/15 text-blue-400">
                            Private
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/15 text-green-400">
                            Public
                          </span>
                        )}

                      </div>

                    </div>

                  </td>

                  {/* DISCOUNT */}
                  <td className="p-4 whitespace-nowrap">

                    {coupon.discountPercent ? (
                      <span>
                        {
                          coupon.discountPercent
                        }
                        %
                      </span>
                    ) : (
                      <span>
                        ₹
                        {(
                          (coupon.discountFlatAmount ||
                            0) / 100
                        ).toLocaleString()}
                      </span>
                    )}

                  </td>

                  {/* PACKAGES */}
                  <td className="p-4 min-w-[280px]">

                    <div className="flex flex-wrap gap-2">

                      {coupon.packages
                        ?.length ? (
                        coupon.packages.map(
                          (pkg) => (
                            <div
                              key={pkg.id}
                              className="px-3 py-2 rounded-2xl bg-neutral-800 border border-neutral-700"
                            >

                              <p className="text-[11px] text-white font-medium">
                                {pkg.name}
                              </p>

                              <p className="text-[10px] text-neutral-400 mt-1">
                                {
                                  pkg
                                    .service
                                    .name
                                }
                              </p>

                            </div>
                          )
                        )
                      ) : (
                        <span className="text-neutral-500 text-xs">
                          All Packages
                        </span>
                      )}

                    </div>

                  </td>

                  {/* USAGE */}
                  <td className="p-4 whitespace-nowrap">
                    {coupon.usedCount} /{" "}
                    {coupon.usageLimit ||
                      "∞"}
                  </td>

                  {/* EXPIRY */}
                  <td className="p-4 text-neutral-400 whitespace-nowrap">

                    {coupon.expiresAt
                      ? new Date(
                          coupon.expiresAt
                        ).toLocaleDateString()
                      : "No Expiry"}

                  </td>

                  {/* ACTIONS */}
                  <td className="p-4 whitespace-nowrap">

                    <div className="flex gap-3">

                      <button
                        onClick={() =>
                          openEdit(coupon)
                        }
                        className="text-blue-400"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(
                            coupon.id
                          )
                        }
                        className="text-red-400"
                      >
                        Delete
                      </button>

                    </div>

                  </td>

                </tr>
              ))}

          </tbody>

        </table>

        {!loading &&
          coupons.length === 0 && (
            <div className="p-10 text-center text-neutral-500">
              No coupons created
            </div>
          )}

      </div>

      {/* YOUR EXISTING MODAL HERE */}

      {open && (
  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">

    <div className="min-h-full flex items-center justify-center">

      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden flex flex-col max-h-[95vh]">

        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">

          <h2 className="text-xl font-bold">
            {editingId
              ? "Edit Coupon"
              : "Create Coupon"}
          </h2>

          <button
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-xl hover:bg-neutral-800 transition flex items-center justify-center text-neutral-400 hover:text-white"
          >
            ✕
          </button>

        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* FORM */}
          <div className="grid md:grid-cols-2 gap-5">

            {/* CODE */}
            <div>
              <label className="text-sm text-neutral-400 block mb-2">
                Coupon Code
              </label>

              <input
                value={form.code}
                onChange={(e) =>
                  setForm({
                    ...form,
                    code:
                      e.target.value.toUpperCase(),
                  })
                }
                placeholder="WELCOME50"
                className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 outline-none focus:border-lime-400 transition"
              />
            </div>

            {/* USAGE LIMIT */}
            <div>
              <label className="text-sm text-neutral-400 block mb-2">
                Usage Limit
              </label>

              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    usageLimit:
                      e.target.value,
                  })
                }
                placeholder="Optional"
                className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 outline-none focus:border-lime-400 transition"
              />
            </div>

            {/* DISCOUNT PERCENT */}
            <div>
              <label className="text-sm text-neutral-400 block mb-2">
                Discount %
              </label>

              <input
                type="number"
                value={
                  form.discountPercent
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    discountPercent:
                      e.target.value,
                    discountFlatAmount:
                      "",
                  })
                }
                placeholder="10"
                className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 outline-none focus:border-lime-400 transition"
              />
            </div>

            {/* FLAT DISCOUNT */}
            <div>
              <label className="text-sm text-neutral-400 block mb-2">
                Flat Discount (INR)
              </label>

              <input
                type="number"
                value={
                  form.discountFlatAmount
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    discountFlatAmount:
                      e.target.value,
                    discountPercent:
                      "",
                  })
                }
                placeholder="500"
                className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 outline-none focus:border-lime-400 transition text-white"
              />
            </div>

            {/* EXPIRY */}
            <div className="md:col-span-2">
              <label className="text-sm text-neutral-400 block mb-2">
                Expiry
              </label>

              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm({
                    ...form,
                    expiresAt:
                      e.target.value,
                  })
                }
                className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 outline-none focus:border-lime-400 transition text-white [color-scheme:dark]"
              />
            </div>

          </div>

          {/* PACKAGE SELECTION */}
          <div className="mt-6">

            <label className="text-sm text-neutral-400 block mb-3">
              Applicable Packages
            </label>

            <div className="space-y-5 max-h-[320px] overflow-y-auto pr-1">

              {services?.map(
                (service) => (
                  <div
                    key={service.id}
                    className="border border-neutral-800 rounded-3xl p-4 bg-neutral-950"
                  >

                    {/* SERVICE TITLE */}
                    <div className="mb-4">

                      <h3 className="font-semibold text-white">
                        {service.name}
                      </h3>

                      <p className="text-xs text-neutral-500 mt-1">
                        Select packages applicable for this coupon
                      </p>

                    </div>

                    {/* PACKAGES */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                      {service.packages?.map(
                        (pkg) => {
                          const selected =
                            form.packageIds.includes(
                              pkg.id
                            );

                          return (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() => {
                                if (
                                  selected
                                ) {
                                  setForm({
                                    ...form,
                                    packageIds:
                                      form.packageIds.filter(
                                        (
                                          id
                                        ) =>
                                          id !==
                                          pkg.id
                                      ),
                                  });
                                } else {
                                  setForm({
                                    ...form,
                                    packageIds:
                                      [
                                        ...form.packageIds,
                                        pkg.id,
                                      ],
                                  });
                                }
                              }}
                              className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                                selected
                                  ? "border-lime-400 bg-lime-400/10 shadow-[0_0_20px_rgba(163,230,53,0.08)]"
                                  : "border-neutral-800 bg-black hover:border-neutral-700"
                              }`}
                            >

                              <div className="flex items-start justify-between gap-3">

                                <div className="min-w-0">

                                  <p className="font-medium text-white break-words">
                                    {pkg.name}
                                  </p>

                                  <p className="text-xs text-neutral-400 mt-1">
                                    ₹{" "}
                                    {(
                                      pkg.price /
                                      100
                                    ).toLocaleString()}
                                  </p>

                                </div>

                                <div
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                    selected
                                      ? "border-lime-400 bg-lime-400"
                                      : "border-neutral-600"
                                  }`}
                                >
                                  {selected && (
                                    <div className="w-2 h-2 rounded-full bg-black" />
                                  )}
                                </div>

                              </div>

                            </button>
                          );
                        }
                      )}

                    </div>

                  </div>
                )
              )}

            </div>

            <p className="text-xs text-neutral-500 mt-3">
              Leave empty to allow all packages.
            </p>

          </div>

          {/* VISIBILITY */}
          <div className="mt-6">

            <label className="text-sm text-neutral-400 block mb-3">
              Coupon Visibility
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* PUBLIC */}
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    isPrivate: false,
                  })
                }
                className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                  !form.isPrivate
                    ? "border-lime-400 bg-lime-400/10 shadow-[0_0_20px_rgba(163,230,53,0.08)]"
                    : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">

                  <div
                    className={`w-3 h-3 rounded-full ${
                      !form.isPrivate
                        ? "bg-lime-400"
                        : "bg-neutral-600"
                    }`}
                  />

                  <p className="font-semibold text-white">
                    Public Coupon
                  </p>

                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  Anyone can use this coupon during checkout.
                </p>

              </button>

              {/* PRIVATE */}
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    isPrivate: true,
                  })
                }
                className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                  form.isPrivate
                    ? "border-lime-400 bg-lime-400/10 shadow-[0_0_20px_rgba(163,230,53,0.08)]"
                    : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">

                  <div
                    className={`w-3 h-3 rounded-full ${
                      form.isPrivate
                        ? "bg-lime-400"
                        : "bg-neutral-600"
                    }`}
                  />

                  <p className="font-semibold text-white">
                    Private Coupon
                  </p>

                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  Only admin purpose.
                </p>

              </button>

            </div>

          </div>

        </div>

        {/* FOOTER */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 px-5 py-4 border-t border-neutral-800 bg-neutral-900 shrink-0">

          <button
            onClick={() => setOpen(false)}
            className="h-11 px-5 rounded-2xl border border-neutral-700 hover:bg-neutral-800 transition w-full sm:w-auto"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="h-11 px-5 rounded-2xl bg-lime-400 hover:bg-lime-300 transition text-black font-semibold w-full sm:w-auto"
          >
            {editingId
              ? "Update Coupon"
              : "Create Coupon"}
          </button>

        </div>

      </div>

    </div>

  </div>
)}

    </div>
  );
};

export default Page;