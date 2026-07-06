"use client";

import {
  Service,
  ServicePackage,
} from "@prisma/client";
import { ArrowLeft } from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

type Package = ServicePackage;

const Page = () => {
  const { id } = useParams();

  const [service, setService] =
    useState<Service | null>(null);
    const router = useRouter();

  const [packages, setPackages] =
    useState<Package[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingPackage, setEditingPackage] =
    useState<Package | null>(null);

  /* =========================
      FORM STATE
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

  /* =========================
      FETCH
  ========================= */

  const fetchData = async () => {
    try {
      const serviceRes = await fetch(
        `/api/services/${id}`
      );

      const serviceData =
        await serviceRes.json();

      setService(serviceData.service);

      const packageRes = await fetch(
        `/api/services/${id}/packages`
      );

      const packageData =
        await packageRes.json();

      setPackages(
        packageData.packages || []
      );
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  /* =========================
      FORM HELPERS
  ========================= */

  const resetForm = () => {
    setName("");

    setDurationInDays("30");

    setPrice("");

    setOriginalPrice("");

    setDescription("");

    setIsActive(true);

    setEditingPackage(null);
  };

  const openCreate = () => {
    resetForm();

    setModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditingPackage(pkg);

    setName(pkg.name);

    setDurationInDays(
      String(pkg.durationInDays)
    );

    setPrice(
      String(pkg.price / 100)
    );

    setOriginalPrice(
      pkg.originalPrice
        ? String(
            pkg.originalPrice / 100
          )
        : ""
    );

    setDescription(
      pkg.description || ""
    );

    setIsActive(pkg.isActive);

    setModalOpen(true);
  };

  /* =========================
      SUBMIT
  ========================= */

  const handleSubmit = async () => {
    if (
      !name ||
      !durationInDays ||
      !price
    ) {
      alert(
        "Required fields missing"
      );

      return;
    }

    setActionLoading(true);

    try {
      const payload = {
        name,

        durationInDays:
          Number(durationInDays),

        price: Math.round(
          Number(price) * 100
        ),

        originalPrice:
          originalPrice
            ? Math.round(
                Number(originalPrice) *
                  100
              )
            : null,

        description,

        isActive,
      };

      let res;

      if (editingPackage) {
        res = await fetch(
          `/api/services/${id}/packages/${editingPackage.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
          }
        );
      } else {
        res = await fetch(
          `/api/services/${id}/packages`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
          }
        );
      }

      const data =
        await res.json();

      if (!data.success) {
        alert(
          data.message ||
            "Failed"
        );

        return;
      }

      setModalOpen(false);

      resetForm();

      fetchData();
    } catch (e) {
      console.log(e);
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================
      DELETE
  ========================= */

  const deletePackage = async (
    packageId: string
  ) => {
    const confirmDelete =
      confirm(
        "Delete package?"
      );

    if (!confirmDelete) return;

    try {
      await fetch(
        `/api/services/${id}/packages/${packageId}`,
        {
          method: "DELETE",
        }
      );

      fetchData();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="p-6">

      {/* HEADER */}
      {/* HEADER */}
<div className="mb-6 flex items-start justify-between gap-4">

<div className="flex items-start gap-3">

  {/* BACK BUTTON */}
  <button
    onClick={() => router.back()}
    className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 transition hover:border-lime-400 hover:text-lime-400"
  >
    <ArrowLeft size={18} />
  </button>

  <div>
    <h1 className="text-2xl font-bold text-white">
      {service?.name || "Service"}
    </h1>

    <p className="mt-1 text-sm text-neutral-500">
      Manage service packages
    </p>
  </div>
</div>

<button
  onClick={openCreate}
  className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black"
>
  + Add Package
</button>
</div>
      {/* LIST */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">

        {loading ? (
          <div className="p-6 text-neutral-500">
            Loading...
          </div>
        ) : packages.length ===
          0 ? (
          <div className="p-10 text-center text-neutral-500">
            No packages found
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">

            {packages.map(
              (pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-start justify-between p-5"
                >
                  <div>

                    <div className="flex items-center gap-3">

                      <h2 className="text-lg font-semibold text-white">
                        {
                          pkg.name
                        }
                      </h2>

                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] ${
                          pkg.isActive
                            ? "border-green-500/20 bg-green-500/10 text-green-400"
                            : "border-red-500/20 bg-red-500/10 text-red-400"
                        }`}
                      >
                        {pkg.isActive
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-6 text-sm">

                      <div>
                        <p className="text-neutral-500">
                          Duration
                        </p>

                        <p className="text-white">
                          {
                            pkg.durationInDays
                          }{" "}
                          Days
                        </p>
                      </div>

                      <div>
                        <p className="text-neutral-500">
                          Price
                        </p>

                        <p className="text-white">
                          ₹
                          {(
                            pkg.price /
                            100
                          ).toLocaleString()}
                        </p>
                      </div>

                      {pkg.originalPrice && (
                        <div>
                          <p className="text-neutral-500">
                            Original
                          </p>

                          <p className="text-neutral-400 line-through">
                            ₹
                            {(
                              pkg.originalPrice /
                              100
                            ).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {pkg.description && (
                      <p className="mt-4 max-w-xl text-sm text-neutral-400">
                        {
                          pkg.description
                        }
                      </p>
                    )}
                  </div>

                  {/* ACTIONS */}
                  <div className="flex gap-2">

                    <button
                      onClick={() =>
                        openEdit(
                          pkg
                        )
                      }
                      className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        deletePackage(
                          pkg.id
                        )
                      }
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}

          </div>
        )}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">

          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">

              <h2 className="text-lg font-semibold text-white">
                {editingPackage
                  ? "Edit Package"
                  : "Add Package"}
              </h2>
            </div>

            {/* BODY */}
            <div className="max-h-[80vh] overflow-y-auto px-5 py-4">

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();

                  handleSubmit();
                }}
              >

                {/* NAME */}
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Package Name
                  </label>

                  <input
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target.value
                      )
                    }
                    placeholder="Monthly Package"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm outline-none focus:border-lime-400"
                  />
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
                    onChange={(e) =>
                      setDescription(
                        e.target
                          .value
                      )
                    }
                    placeholder="Package description..."
                    className="min-h-[120px] w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm outline-none focus:border-lime-400"
                  />
                </div>

                {/* GRID */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  {/* DURATION */}
                  <div>
                    <label className="mb-2 block text-sm text-neutral-400">
                      Duration
                    </label>

                    <input
                      type="number"
                      value={
                        durationInDays
                      }
                      onChange={(e) =>
                        setDurationInDays(
                          e.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm outline-none focus:border-lime-400"
                    />
                  </div>

                  {/* PRICE */}
                  <div>
                    <label className="mb-2 block text-sm text-neutral-400">
                      Price
                    </label>

                    <input
                      type="number"
                      value={price}
                      onChange={(e) =>
                        setPrice(
                          e.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm outline-none focus:border-lime-400"
                    />
                  </div>
                </div>

                {/* ORIGINAL PRICE */}
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Original Price
                  </label>

                  <input
                    type="number"
                    value={
                      originalPrice
                    }
                    onChange={(e) =>
                      setOriginalPrice(
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm outline-none focus:border-lime-400"
                  />
                </div>

                {/* ACTIVE */}
                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black px-4 py-3">

                  <div>
                    <p className="text-sm text-white">
                      Active
                      Package
                    </p>

                    <p className="text-xs text-neutral-500">
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
                    onChange={(e) =>
                      setIsActive(
                        e.target
                          .checked
                      )
                    }
                    className="h-5 w-5"
                  />
                </div>

                {/* BUTTONS */}
                <div className="flex justify-end gap-3 pt-2">

                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(
                        false
                      );

                      resetForm();
                    }}
                    className="rounded-xl bg-zinc-800 px-5 py-2 text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      actionLoading
                    }
                    className="rounded-xl bg-lime-400 px-5 py-2 text-sm font-medium text-black disabled:opacity-50"
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