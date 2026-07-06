"use client";

import { useEffect, useState } from "react";
import { Branch, Service, ServicePackage } from "@prisma/client";
import { useRouter } from "next/navigation";

type PackageWithService = ServicePackage & {
  service: Service;
};

type Slot = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
  branchId: string;
  packageId: string;
  branch?: Branch;
  package?: PackageWithService;
  _count: {
    bookings: number;
  }
};

const Page = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<PackageWithService[]>([]);
  const [editModal, setEditModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  

  const [createModal, setCreateModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    startTime: "",
    endTime: "",
    capacity: "",
    branchId: "",
    packageId: "",
  });

  const openEditModal = (slot: Slot) => {
    setEditingSlotId(slot.id);
  
    setForm({
      name: slot.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: String(slot.capacity),
      branchId: slot.branchId,
      packageId: slot.packageId,
    });
  
    setEditModal(true);
  };


  const updateSlot = async () => {
    if (!editingSlotId) return;
  
    setActionLoading(true);
  
    try {
      const res = await fetch(`/api/slot/${editingSlotId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          capacity: Number(form.capacity),
        }),
      });
  
      const data = await res.json();
  
      if (!data) {
        alert("Update failed");
        return;
      }
  
      setEditModal(false);
      setEditingSlotId(null);
  
      setForm({
        name: "",
        startTime: "",
        endTime: "",
        capacity: "",
        branchId: "",
        packageId: "",
      });
  
      fetchSlots();
    } catch (e) {
      console.log(e);
    } finally {
      setActionLoading(false);
    }
  };



  // ---------------- FETCH SLOTS ----------------
  const fetchSlots = async () => {
    try {
      const res = await fetch("/api/slot");
      const data = await res.json();
      setSlots(data || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- FETCH BRANCHES ----------------
  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      setBranches(data.branches || []);
    } catch (e) {
      console.log(e);
    }
  };

  // ---------------- FETCH PACKAGES ----------------
  const fetchPackages = async () => {
    try {
      const res = await fetch("/api/services");
      const data = await res.json();

      const allPackages =
        data.services?.flatMap((s: any) =>
          s.packages.map((p: any) => ({
            ...p,
            service: s,
          }))
        ) || [];

      setPackages(allPackages);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchSlots();
    fetchBranches();
    fetchPackages();
  }, []);

  // ---------------- CREATE SLOT ----------------
  const createSlot = async () => {
    if (
      !form.name ||
      !form.startTime ||
      !form.endTime ||
      !form.branchId ||
      !form.packageId
    ) {
      alert("Fill all fields");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch("/api/slot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          capacity: Number(form.capacity),
        }),
      });

      const data = await res.json();

      if (!data) {
        alert("Failed");
        return;
      }

      setCreateModal(false);

      setForm({
        name: "",
        startTime: "",
        endTime: "",
        capacity: "",
        branchId: "",
        packageId: "",
      });

      fetchSlots();
    } catch (e) {
      console.log(e);
    } finally {
      setActionLoading(false);
    }
  };

  // ---------------- DELETE SLOT (SOFT) ----------------
  const deleteSlot = async (id: string) => {
    const ok = confirm("Disable this slot?");
    if (!ok) return;

    try {
      await fetch(`/api/slot/${id}`, {
        method: "DELETE",
      });

      fetchSlots();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Slots
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage gym time slots
          </p>
        </div>

        <button
          onClick={() => setCreateModal(true)}
          className="px-4 py-2 bg-lime-400 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition"
        >
          + Create Slot
        </button>
      </div>

      {/* LIST */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">

        {loading ? (
          <div className="p-6 text-neutral-500">
            Loading...
          </div>
        ) : slots.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            No slots found
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">

            {slots.map((slot) => {
              const pkg = slot.package;

              return (
                <div
                  key={slot.id}
                  className="p-5 flex items-center justify-between hover:bg-neutral-900/80 transition"
                >
                  <div>
                    <h2 className="text-white font-semibold">
                      {slot.name}
                    </h2>

                    <p className="text-sm text-neutral-400 mt-1">
                      {slot.startTime} - {slot.endTime} • Capacity:{" "}
                      {slot.capacity}
                    </p>

                    <p className="text-xs text-lime-400 mt-2">
                      {pkg?.service?.name} - {pkg?.name} . {slot?.branch?.name}
                    </p>
                  </div>

<div className="flex items-center gap-2">

<button
  onClick={() => router.push(`/dashboard/slots/${slot.id}/bookings`)}
  className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20 hover:bg-blue-500/20 transition"
>
  View bookings ({slot?._count?.bookings})
</button> 

<button
  onClick={() => openEditModal(slot)}
  className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20 hover:bg-blue-500/20 transition"
>
  Edit
</button>

                  <button
                    onClick={() => deleteSlot(slot.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs border border-red-500/20 hover:bg-red-500/20 transition"
                  >
                    Disable
                  </button>
</div>
                  
                </div>
              );
            })}

          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold text-white mb-5">
              Create Slot
            </h2>

            {/* NAME */}
            <input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              placeholder="Slot Name"
              className="w-full h-11 mb-3 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white outline-none"
            />

            {/* TIME */}
            <div className="grid grid-cols-2 gap-3 mb-3">

              <input
                type="time"
                value={form.startTime}
                onChange={(e) =>
                  setForm({
                    ...form,
                    startTime: e.target.value,
                  })
                }
                className="h-11 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white"
              />

              <input
                type="time"
                value={form.endTime}
                onChange={(e) =>
                  setForm({
                    ...form,
                    endTime: e.target.value,
                  })
                }
                className="h-11 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white"
              />
            </div>

            {/* CAPACITY */}
            <input
              type="number"
              value={form.capacity}
              onChange={(e) =>
                setForm({
                  ...form,
                  capacity: e.target.value,
                })
              }
              placeholder="Capacity"
              className="w-full h-11 mb-3 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white"
            />

            {/* BRANCH */}
            <select
              value={form.branchId}
              onChange={(e) =>
                setForm({
                  ...form,
                  branchId: e.target.value,
                })
              }
              className="w-full h-11 mb-3 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white"
            >
              <option value="">Select Branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* PACKAGE */}
            <select
              value={form.packageId}
              onChange={(e) =>
                setForm({
                  ...form,
                  packageId: e.target.value,
                })
              }
              className="w-full h-11 mb-5 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white"
            >
              <option value="">Select Package</option>

              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.service.name} - {p.name}
                </option>
              ))}
            </select>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3">

              <button
                onClick={() => setCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300"
              >
                Cancel
              </button>

              <button
                onClick={createSlot}
                disabled={actionLoading}
                className="px-5 py-2 bg-lime-400 text-black rounded-xl font-semibold disabled:opacity-50"
              >
                {actionLoading ? "Creating..." : "Create Slot"}
              </button>

            </div>

          </div>
        </div>
      )}


{editModal && (
  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

    <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl p-6">

      <h2 className="text-xl font-bold text-white mb-5">
        Edit Slot
      </h2>

      {/* NAME */}
      <input
        value={form.name}
        onChange={(e) =>
          setForm({ ...form, name: e.target.value })
        }
        className="w-full h-11 mb-3 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white"
      />

      {/* TIME */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input
          type="time"
          value={form.startTime}
          onChange={(e) =>
            setForm({
              ...form,
              startTime: e.target.value,
            })
          }
          className="h-11 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white"
        />

        <input
          type="time"
          value={form.endTime}
          onChange={(e) =>
            setForm({
              ...form,
              endTime: e.target.value,
            })
          }
          className="h-11 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white"
        />
      </div>

      {/* CAPACITY */}
      <input
        type="number"
        value={form.capacity}
        onChange={(e) =>
          setForm({
            ...form,
            capacity: e.target.value,
          })
        }
        className="w-full h-11 mb-3 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white"
      />

      {/* BRANCH */}
      <select
        value={form.branchId}
        onChange={(e) =>
          setForm({
            ...form,
            branchId: e.target.value,
          })
        }
        className="w-full h-11 mb-3 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white"
      >
        <option value="">Select Branch</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      {/* PACKAGE */}
      <select
        value={form.packageId}
        onChange={(e) =>
          setForm({
            ...form,
            packageId: e.target.value,
          })
        }
        className="w-full h-11 mb-5 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white"
      >
        <option value="">Select Package</option>
        {packages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.service.name} - {p.name}
          </option>
        ))}
      </select>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3">

        <button
          onClick={() => {
            setEditModal(false);
            setEditingSlotId(null);
          }}
          className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300"
        >
          Cancel
        </button>

        <button
          onClick={updateSlot}
          disabled={actionLoading}
          className="px-5 py-2 bg-blue-500 text-white rounded-xl font-semibold disabled:opacity-50"
        >
          {actionLoading ? "Updating..." : "Update Slot"}
        </button>

      </div>

    </div>
  </div>
)}

    </div>
  );
};

export default Page;