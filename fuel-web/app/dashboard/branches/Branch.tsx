"use client";

import { useEffect, useState } from "react";
import { Branch as BranchType } from "@prisma/client";

export const Branch = () => {
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);

  const [editing, setEditing] = useState<BranchType | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    gstNumber: "",
    supportEmail: "",
    supportPhone: "",
    terms: "",
  });

  const fetchBranches = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/branches");
      const data = await res.json();

      setBranches(data.branches || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      fetchBranches();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      address: "",
      gstNumber: "",
      supportEmail: "",
      supportPhone: "",
      terms: "",
    });

    setEditing(null);
  };

  const handleSubmit = async () => {
    if (
      !form.name ||
      !form.phone ||
      !form.address ||
      !form.gstNumber ||
      !form.terms
    ) {
      alert("Please fill required fields");
      return;
    }

    try {
      const res = await fetch(
        editing
          ? `/api/branches/${editing.id}`
          : "/api/branches",
        {
          method: editing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Something went wrong");
        return;
      }

      fetchBranches();
      setOpen(false);
      resetForm();
    } catch (e) {
      console.log(e);
      alert("Something went wrong");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this branch?"
    );

    if (!confirmDelete) return;

    try {
      await fetch(`/api/branches/${id}`, {
        method: "DELETE",
      });

      fetchBranches();
    } catch (e) {
      console.log(e);
    }
  };

  const openEdit = (branch: BranchType) => {
    setEditing(branch);

    setForm({
      name: branch.name,
      phone: branch.phone,
      address: branch.address,
      gstNumber: branch.gstNumber,
      supportEmail: branch.supportEmail || "",
      supportPhone: branch.supportPhone || "",
      terms: branch.terms ?? '',
    });

    setOpen(true);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Branches
          </h2>

          <p className="text-sm text-neutral-500 mt-1">
            Manage gym branches and invoice settings
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="px-4 py-2 bg-lime-400 text-black rounded-lg font-semibold"
        >
          + Add Branch
        </button>
      </div>

      {/* LIST */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-800 text-neutral-400">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th>Phone</th>
              <th>GST</th>
              <th>Support</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {branches.map((branch) => (
              <tr
                key={branch.id}
                className="border-b border-neutral-800"
              >
                <td className="p-4 text-white">
                  {branch.name}
                </td>

                <td className="text-neutral-300">
                  {branch.phone}
                </td>

                <td className="text-neutral-400">
                  {branch.gstNumber}
                </td>

                <td className="text-neutral-400">
                  {branch.supportPhone || "-"}
                </td>

                <td>
                  <div className="flex gap-3">
                    <button
                      onClick={() => openEdit(branch)}
                      className="text-xs text-lime-400"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(branch.id)}
                      className="text-xs text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && branches.length === 0 && (
          <div className="p-6 text-sm text-neutral-500">
            No branches found
          </div>
        )}
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-6">

            <h2 className="text-xl font-bold text-white mb-5">
              {editing ? "Edit Branch" : "Add Branch"}
            </h2>

            <div className="grid grid-cols-2 gap-4">

              <input
                placeholder="Branch Name *"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white"
              />

              <input
                placeholder="Phone *"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value,
                  })
                }
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white"
              />

              <input
                placeholder="GST Number *"
                value={form.gstNumber}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gstNumber: e.target.value,
                  })
                }
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white"
              />

              <input
                placeholder="Support Email"
                value={form.supportEmail}
                onChange={(e) =>
                  setForm({
                    ...form,
                    supportEmail: e.target.value,
                  })
                }
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white"
              />

              <input
                placeholder="Support Phone"
                value={form.supportPhone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    supportPhone: e.target.value,
                  })
                }
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white"
              />

              <div />

              <textarea
                placeholder="Address *"
                value={form.address}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: e.target.value,
                  })
                }
                className="col-span-2 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white min-h-[100px]"
              />

              <textarea
                placeholder="Invoice Terms *"
                value={form.terms}
                onChange={(e) =>
                  setForm({
                    ...form,
                    terms: e.target.value,
                  })
                }
                className="col-span-2 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white min-h-[120px]"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">

              <button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-neutral-800 text-white rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-lime-400 text-black rounded-lg font-semibold"
              >
                {editing ? "Update Branch" : "Create Branch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};