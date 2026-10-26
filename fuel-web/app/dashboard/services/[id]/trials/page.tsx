"use client";

import { Edit, Plus, Trash2, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Trial = {
  id: string;
  subCategoryId: string | null;
  subCategory: { id: string; name: string } | null;
  days: number;
  sellingPrice: number;
  originalPrice: number | null;
  isActive: boolean;
};

type SubCategory = { id: string; name: string };

const rupees = (paise: number) =>
  (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const toPaise = (value: string) => Math.round(Number(value) * 100);

const Page = () => {
  const params = useParams();
  const serviceId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [trials, setTrials] = useState<Trial[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Trial | null>(null);

  const [subCategoryId, setSubCategoryId] = useState("");
  const [days, setDays] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchData = async () => {
    if (!serviceId) return;
    try {
      setLoading(true);
      const [trialRes, subRes] = await Promise.all([
        fetch(`/api/services/${serviceId}/trials`, { cache: "no-store" }),
        fetch(`/api/services/${serviceId}/subcategories`, {
          cache: "no-store",
        }),
      ]);
      const trialData = await trialRes.json();
      const subData = await subRes.json();

      if (!trialData.success) {
        alert(trialData.message || "Failed to load trials");
        return;
      }
      setTrials(trialData.trials || []);
      setSubCategories(subData.subCategories || subData.subcategories || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load trials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [serviceId]);

  const resetForm = () => {
    setEditing(null);
    setSubCategoryId("");
    setDays("");
    setSellingPrice("");
    setOriginalPrice("");
    setIsActive(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (trial: Trial) => {
    setEditing(trial);
    setSubCategoryId(trial.subCategoryId || "");
    setDays(String(trial.days));
    setSellingPrice(String(trial.sellingPrice / 100));
    setOriginalPrice(
      trial.originalPrice !== null ? String(trial.originalPrice / 100) : ""
    );
    setIsActive(trial.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!days || Number(days) < 1) {
      alert("Enter the number of days");
      return;
    }
    if (sellingPrice === "" || Number(sellingPrice) < 0) {
      alert("Enter a selling price (0 for a free trial)");
      return;
    }
    if (
      originalPrice !== "" &&
      Number(originalPrice) < Number(sellingPrice)
    ) {
      alert("Original price cannot be lower than the selling price");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        subCategoryId: subCategoryId || null,
        days: Number(days),
        sellingPrice: toPaise(sellingPrice),
        originalPrice: originalPrice === "" ? null : toPaise(originalPrice),
        isActive,
      };

      const response = await fetch(
        editing
          ? `/api/services/${serviceId}/trials/${editing.id}`
          : `/api/services/${serviceId}/trials`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Failed to save trial");
        return;
      }
      closeModal();
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (trial: Trial) => {
    const next = !trial.isActive;

    // optimistic update
    setTrials((current) =>
      current.map((item) =>
        item.id === trial.id ? { ...item, isActive: next } : item
      )
    );

    try {
      const response = await fetch(
        `/api/services/${serviceId}/trials/${trial.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: next }),
        }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
    } catch (error) {
      console.error(error);
      alert("Failed to update status");
      await fetchData(); // revert
    }
  };

  const deleteTrial = async (trial: Trial) => {
    if (!window.confirm(`Delete the ${trial.days}-day trial?`)) return;

    try {
      const response = await fetch(
        `/api/services/${serviceId}/trials/${trial.id}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!data.success) {
        alert(data.message || "Failed to delete trial");
        return;
      }
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete trial");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-500">
          Configure trial offers for this service. Only active trials will be
          bookable on the website once trial booking is enabled.
        </p>

        <button
          type="button"
          onClick={openCreate}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
        >
          <Plus size={16} />
          Add Trial
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        {loading ? (
          <div className="p-6 text-sm text-neutral-500">Loading trials...</div>
        ) : trials.length === 0 ? (
          <div className="p-12 text-center">
            <h2 className="text-sm font-semibold text-white">
              No trials yet
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Add your first trial for this service.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {trials.map((trial) => (
              <div
                key={trial.id}
                className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">
                      {trial.days} {trial.days === 1 ? "Day" : "Days"} Trial
                    </h2>

                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-medium ${
                        trial.isActive
                          ? "border-green-500/20 bg-green-500/10 text-green-400"
                          : "border-red-500/20 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {trial.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>

                    {trial.subCategory && (
                      <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-1 text-[10px] text-neutral-400">
                        {trial.subCategory.name}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-sm">
                    {trial.sellingPrice === 0 ? (
                      <span className="rounded bg-lime-400/10 px-2 py-0.5 font-semibold text-lime-400">
                        Free
                      </span>
                    ) : (
                      <span className="font-semibold text-white">
                        ₹{rupees(trial.sellingPrice)}
                      </span>
                    )}

                    {trial.originalPrice !== null &&
                      trial.originalPrice > trial.sellingPrice && (
                        <span className="text-neutral-500 line-through">
                          ₹{rupees(trial.originalPrice)}
                        </span>
                      )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label className="mr-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
                    <input
                      type="checkbox"
                      checked={trial.isActive}
                      onChange={() => toggleActive(trial)}
                      className="h-4 w-4 accent-lime-400"
                    />
                    Active
                  </label>

                  <button
                    type="button"
                    onClick={() => openEdit(trial)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20"
                  >
                    <Edit size={13} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTrial(trial)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">
                {editing ? "Edit Trial" : "Add Trial"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="space-y-5 overflow-y-auto px-5 py-5"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
            >
              {subCategories.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Subcategory (optional)
                  </label>

                  <select
                    value={subCategoryId}
                    onChange={(event) => setSubCategoryId(event.target.value)}
                    disabled={saving}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                  >
                    <option value="">All / no subcategory</option>
                    {subCategories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Days
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                  placeholder="Example: 1, 3, 7, 14"
                  disabled={saving}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Selling Price (₹)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(event) => setSellingPrice(event.target.value)}
                    placeholder="0 for free"
                    disabled={saving}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Original Price (₹)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={originalPrice}
                    onChange={(event) => setOriginalPrice(event.target.value)}
                    placeholder="Optional"
                    disabled={saving}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black px-4 py-3">
                <div>
                  <p className="text-sm text-white">Active</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Inactive trials stay here but are not bookable.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  disabled={saving}
                  className="h-5 w-5 accent-lime-400"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm text-white transition hover:bg-zinc-700 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Update Trial"
                    : "Create Trial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;