"use client";

import { Branch, Service } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ServiceWithBranches = Service & {
  branches: Branch[];
  _count?: {
    packages: number;
  };
};

const Page = () => {
  const [services, setServices] = useState<ServiceWithBranches[]>([]);
  const [loading, setLoading] = useState(true);

  const [createModal, setCreateModal] = useState(false);

  const [name, setName] = useState("");

  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  const [actionLoading, setActionLoading] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");
      const data = await res.json();

      setServices(data.services || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();

      setBranches(data.branches || []);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchBranches();
  }, []);

  const toggleBranch = (id: string) => {
    setSelectedBranches((prev) =>
      prev.includes(id)
        ? prev.filter((b) => b !== id)
        : [...prev, id]
    );
  };

  const createService = async () => {
    if (!name.trim()) {
      alert("Service name required");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          branchIds: selectedBranches,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed");
        return;
      }

      setCreateModal(false);

      setName("");
      setSelectedBranches([]);

      fetchServices();
    } catch (e) {
      console.log(e);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteService = async (id: string) => {
    const confirmDelete = confirm(
      "Delete this service?"
    );

    if (!confirmDelete) return;

    try {
      await fetch(`/api/services/${id}`, {
        method: "DELETE",
      });

      fetchServices();
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
            Services
          </h1>

          <p className="text-sm text-neutral-500 mt-1">
            Manage gym services and linked branches
          </p>
        </div>

        <button
          onClick={() => setCreateModal(true)}
          className="px-4 py-2 bg-lime-400 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition"
        >
          + Create Service
        </button>
      </div>

      {/* LIST */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">

        {loading ? (
          <div className="p-6 text-neutral-500">
            Loading...
          </div>
        ) : services.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            No services found
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">

            {services.map((service) => (
              <div
                key={service.id}
                className="p-5 flex items-start justify-between hover:bg-neutral-900/80 transition"
              >
                <div>

                  <h2 className="text-white font-semibold text-lg">
                    {service.name}
                  </h2>

                  {/* BRANCHES */}
                  <div className="flex flex-wrap gap-2 mt-3">

                    {service.branches?.map((branch) => (
                      <span
                        key={branch.id}
                        className="px-2 py-1 rounded-md bg-neutral-800 text-xs text-neutral-300 border border-neutral-700"
                      >
                        {branch.name}
                      </span>
                    ))}

                  </div>

                  {/* PACKAGE COUNT */}
                  <p className="text-xs text-lime-400 mt-3">
                    {service._count?.packages || 0} Packages
                  </p>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-2">

                <button
  className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20 hover:bg-blue-500/20 transition"
  onClick={() => {
    router.push(`/dashboard/services/${service.id}`);
  }}
>
  Manage Packages
</button>

                  <button
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs border border-red-500/20 hover:bg-red-500/20 transition"
                    onClick={() => deleteService(service.id)}
                  >
                    Delete
                  </button>

                </div>
              </div>
            ))}

          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold text-white mb-5">
              Create Service
            </h2>

            {/* NAME */}
            <div className="mb-4">
              <label className="text-sm text-neutral-400 mb-2 block">
                Service Name
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Gym"
                className="w-full h-11 rounded-xl bg-neutral-900 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400"
              />
            </div>

            {/* DESCRIPTION */}

            {/* BRANCHES */}
            <div className="mb-6">
              <label className="text-sm text-neutral-400 mb-3 block">
                Link Branches
              </label>

              <div className="flex flex-wrap gap-2">

                {branches.map((branch) => {
                  const active =
                    selectedBranches.includes(branch.id);

                  return (
                    <button
                      key={branch.id}
                      onClick={() =>
                        toggleBranch(branch.id)
                      }
                      className={`px-3 py-2 rounded-xl text-sm border transition ${
                        active
                          ? "bg-lime-400 text-black border-lime-400"
                          : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-600"
                      }`}
                    >
                      {branch.name}
                    </button>
                  );
                })}

              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3">

              <button
                onClick={() => {
                    setCreateModal(false);
                }}
                className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
              >
                Cancel
              </button>

              <button
                disabled={actionLoading}
                onClick={createService}
                className="px-5 py-2 rounded-xl bg-lime-400 text-black font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading
                  ? "Creating..."
                  : "Create Service"}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;