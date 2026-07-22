"use client";

import { useEffect, useMemo, useState } from "react";
import { Branch, Service } from "@prisma/client";
import { useRouter } from "next/navigation";  
import { formatTime } from "@/app/utils/date";

type Slot = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;

  branchId: string;
  serviceId: string;

  branch?: Branch;
  service?: Service;

  _count?: {
    bookings: number;
  };
};

type SessionForm = {
  startTime: string;
  endTime: string;
  capacity: string;
};

type CreateForm = {
  branchId: string;
  serviceId: string;
  sessionCount: string;
  sessions: SessionForm[];
};

type EditForm = {
  name: string;
  startTime: string;
  endTime: string;
  capacity: string;
  branchId: string;
  serviceId: string;
};

const createEmptySession = (): SessionForm => ({
  startTime: "",
  endTime: "",
  capacity: "",
});

const initialCreateForm = (): CreateForm => ({
  branchId: "",
  serviceId: "",
  sessionCount: "1",
  sessions: [createEmptySession()],
});

const initialEditForm = (): EditForm => ({
  name: "",
  startTime: "",
  endTime: "",
  capacity: "",
  branchId: "",
  serviceId: "",
});

export default function Page() {
  const router = useRouter();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(
    null
  );

  const [createForm, setCreateForm] = useState<CreateForm>(
    initialCreateForm
  );

  const [editForm, setEditForm] = useState<EditForm>(
    initialEditForm
  );

  const selectedService = useMemo(() => {
    return services.find(
      (service) => service.id === createForm.serviceId
    );
  }, [services, createForm.serviceId]);

  // -------------------------------------------------------
  // FETCH SLOTS
  // -------------------------------------------------------

  const fetchSlots = async () => {
    try {
      const res = await fetch("/api/slot");

      if (!res.ok) {
        throw new Error("Failed to fetch slots");
      }

      const data = await res.json();

      setSlots(Array.isArray(data) ? data : data.slots || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // FETCH BRANCHES
  // -------------------------------------------------------

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");

      if (!res.ok) {
        throw new Error("Failed to fetch branches");
      }

      const data = await res.json();

      setBranches(data.branches || []);
    } catch (error) {
      console.error(error);
    }
  };

  // -------------------------------------------------------
  // FETCH SERVICES
  // -------------------------------------------------------

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");

      if (!res.ok) {
        throw new Error("Failed to fetch services");
      }

      const data = await res.json();

      setServices(data.services || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    void Promise.all([
      fetchSlots(),
      fetchBranches(),
      fetchServices(),
    ]);
  }, []);

  // -------------------------------------------------------
  // CREATE FORM HELPERS
  // -------------------------------------------------------

  const updateSessionCount = (value: string) => {
    // Always preserve the raw input so the field can be cleared.
    setCreateForm((current) => ({
      ...current,
      sessionCount: value,
    }));
  
    if (value.trim() === "") {
      return;
    }
  
    const parsedCount = Number.parseInt(value, 10);
  
    if (
      !Number.isInteger(parsedCount) ||
      parsedCount < 1 ||
      parsedCount > 20
    ) {
      return;
    }
  
    setCreateForm((current) => ({
      ...current,
      sessionCount: value,
  
      sessions: Array.from(
        { length: parsedCount },
        (_, index) =>
          current.sessions[index] || createEmptySession()
      ),
    }));
  };

  const updateSession = (
    index: number,
    field: keyof SessionForm,
    value: string
  ) => {
    setCreateForm((current) => ({
      ...current,
      sessions: current.sessions.map((session, sessionIndex) =>
        sessionIndex === index
          ? {
              ...session,
              [field]: value,
            }
          : session
      ),
    }));
  };

  const resetCreateForm = () => {
    setCreateForm(initialCreateForm());
  };

  const closeCreateModal = () => {
    setCreateModal(false);
    resetCreateForm();
  };

  // -------------------------------------------------------
  // CREATE MULTIPLE SESSIONS
  // -------------------------------------------------------

  const createSlots = async () => {
    if (!createForm.branchId) {
      alert("Please select a branch");
      return;
    }

    if (!createForm.serviceId) {
      alert("Please select a service");
      return;
    }

    const hasInvalidSession = createForm.sessions.some(
      (session) =>
        !session.startTime ||
        !session.endTime ||
        !session.capacity ||
        Number(session.capacity) <= 0
    );

    if (hasInvalidSession) {
      alert(
        "Please provide start time, end time and maximum bookings for every session"
      );
      return;
    }


    const sessionCount = Number.parseInt(
      createForm.sessionCount,
      10
    );
    
    if (
      !Number.isInteger(sessionCount) ||
      sessionCount < 1 ||
      sessionCount > 20
    ) {
      alert("Number of sessions must be between 1 and 20");
      return;
    }
    
    if (createForm.sessions.length !== sessionCount) {
      alert("Session configuration is incomplete");
      return;
    }


    const hasInvalidTime = createForm.sessions.some(
      (session) => session.startTime >= session.endTime
    );

    if (hasInvalidTime) {
      alert("Session end time must be after its start time");
      return;
    }

    setActionLoading(true);

    try {
      const serviceName =
        selectedService?.name || "Service";

     const payload = {
  branchId: createForm.branchId,
  serviceId: createForm.serviceId,
  sessionCount: Number.parseInt(
    createForm.sessionCount,
    10
  ),

  sessions: createForm.sessions.map(
    (session, index) => ({
      name: `${serviceName} - Session ${index + 1}`,
      startTime: session.startTime,
      endTime: session.endTime,
      capacity: Number.parseInt(
        session.capacity,
        10
      ),
    })
  ),
};

      const res = await fetch("/api/slot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to create sessions"
        );
      }

      closeCreateModal();
      await fetchSlots();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create sessions"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------
  // EDIT SLOT
  // -------------------------------------------------------

  const openEditModal = (slot: Slot) => {
    setEditingSlotId(slot.id);

    setEditForm({
      name: slot.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: String(slot.capacity),
      branchId: slot.branchId,
      serviceId: slot.serviceId,
    });

    setEditModal(true);
  };

  const closeEditModal = () => {
    setEditModal(false);
    setEditingSlotId(null);
    setEditForm(initialEditForm());
  };

  const updateSlot = async () => {
    if (!editingSlotId) {
      return;
    }

    if (
      !editForm.name.trim() ||
      !editForm.startTime ||
      !editForm.endTime ||
      !editForm.capacity ||
      !editForm.branchId ||
      !editForm.serviceId
    ) {
      alert("Please fill all fields");
      return;
    }

    if (editForm.startTime >= editForm.endTime) {
      alert("End time must be after start time");
      return;
    }

    if (Number(editForm.capacity) <= 0) {
      alert("Capacity must be greater than zero");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(
        `/api/slot/${editingSlotId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...editForm,
            name: editForm.name.trim(),
            capacity: Number(editForm.capacity),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to update slot"
        );
      }

      closeEditModal();
      await fetchSlots();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update slot"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------
  // DISABLE SLOT
  // -------------------------------------------------------

  const deleteSlot = async (id: string) => {
    const confirmed = confirm(
      "Are you sure you want to disable this slot?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/slot/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();

        throw new Error(
          data.message || "Failed to disable slot"
        );
      }

      await fetchSlots();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to disable slot"
      );
    }
  };

  return (
    <div className="p-6">
      {/* HEADER */}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Slots
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Manage service sessions and booking capacity
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModal(true)}
          className="rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
        >
          + Create New Slot
        </button>
      </div>

      {/* SLOT LIST */}

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
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
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex flex-col gap-4 p-5 transition hover:bg-neutral-900/80 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <h2 className="font-semibold text-white">
                    {slot.name}
                  </h2>

                  <p className="mt-1 text-sm text-neutral-400">
  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
  {" • "}
  Capacity: {slot.capacity}
</p>

                  <p className="mt-2 text-xs text-lime-400">
                    {slot.service?.name || "Service unavailable"}
                    {" • "}
                    {slot.branch?.name || "Branch unavailable"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/slots/${slot.id}/bookings`
                      )
                    }
                    className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20"
                  >
                    View bookings (
                    {slot._count?.bookings ?? 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(slot)}
                    className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteSlot(slot.id)}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20"
                  >
                    Disable
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}

      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                Create New Slot
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Select a service and configure each session
              </p>
            </div>

            {/* BRANCH AND SERVICE */}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Branch
                </label>

                <select
                  value={createForm.branchId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      branchId: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
                >
                  <option value="">Select Branch</option>

                  {branches.map((branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                    >
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Service
                </label>

                <select
                  value={createForm.serviceId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      serviceId: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
                >
                  <option value="">Select Service</option>

                  {services.map((service) => (
                    <option
                      key={service.id}
                      value={service.id}
                    >
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SESSION COUNT */}

            <div className="mt-4">
  <label className="mb-2 block text-sm font-medium text-neutral-300">
    Number of Sessions
  </label>

  <input
    type="number"
    min={1}
    max={20}
    value={createForm.sessionCount}
    onChange={(event) =>
      updateSessionCount(event.target.value)
    }
    onBlur={() => {
      const count = Number.parseInt(
        createForm.sessionCount,
        10
      );

      if (
        !Number.isInteger(count) ||
        count < 1 ||
        count > 20
      ) {
        updateSessionCount("1");
      }
    }}
    className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
  />

  <p className="mt-1 text-xs text-neutral-500">
    You can configure up to 20 sessions at once.
  </p>
</div>

            {/* SESSION CONFIGURATION */}

            <div className="mt-6 space-y-4">
              {createForm.sessions.map(
                (session, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white">
                          Session {index + 1}
                        </h3>

                        {selectedService && (
                          <p className="mt-1 text-xs text-neutral-500">
                            {selectedService.name} - Session{" "}
                            {index + 1}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-neutral-400">
                          Start Time
                        </label>

                        <input
                          type="time"
                          value={session.startTime}
                          onChange={(event) =>
                            updateSession(
                              index,
                              "startTime",
                              event.target.value
                            )
                          }
                          style={{
                            colorScheme: "dark",
                          }}
                          className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium text-neutral-400">
                          End Time
                        </label>

                        <input
                          type="time"
                          
                          style={{
                            colorScheme: "dark",
                          }}
                          value={session.endTime}
                          onChange={(event) =>
                            updateSession(
                              index,
                              "endTime",
                              event.target.value
                            )
                          }
                          className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium text-neutral-400">
                          Maximum Bookings
                        </label>

                        <input
                          type="number"
                          min={1}
                          value={session.capacity}
                          onChange={(event) =>
                            updateSession(
                              index,
                              "capacity",
                              event.target.value
                            )
                          }
                          placeholder="Example: 20"
                          className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* CREATE ACTIONS */}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={actionLoading}
                className="rounded-xl border border-neutral-700 px-4 py-2 text-neutral-300 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createSlots}
                disabled={actionLoading}
                className="rounded-xl bg-lime-400 px-5 py-2 font-semibold text-black disabled:opacity-50"
              >
                {actionLoading
  ? "Creating..."
  : `Create ${
      createForm.sessions.length
    } ${
      createForm.sessions.length === 1
        ? "Session"
        : "Sessions"
    }`}

              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <h2 className="mb-5 text-xl font-bold text-white">
              Edit Slot
            </h2>

            <div>
              <label className="mb-2 block text-sm text-neutral-400">
                Slot Name
              </label>

              <input
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mb-3 h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
              />
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Start Time
                </label>

                <input
                  type="time"
                  value={editForm.startTime}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      startTime: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  End Time
                </label>

                <input
                  type="time"
                  value={editForm.endTime}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      endTime: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-400">
                Maximum Bookings
              </label>

              <input
                type="number"
                min={1}
                value={editForm.capacity}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    capacity: event.target.value,
                  }))
                }
                className="mb-3 h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-400">
                Branch
              </label>

              <select
                value={editForm.branchId}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    branchId: event.target.value,
                  }))
                }
                className="mb-3 h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
              >
                <option value="">Select Branch</option>

                {branches.map((branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-400">
                Service
              </label>

              <select
                value={editForm.serviceId}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    serviceId: event.target.value,
                  }))
                }
                className="mb-5 h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
              >
                <option value="">Select Service</option>

                {services.map((service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={actionLoading}
                className="rounded-xl border border-neutral-700 px-4 py-2 text-neutral-300 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={updateSlot}
                disabled={actionLoading}
                className="rounded-xl bg-blue-500 px-5 py-2 font-semibold text-white disabled:opacity-50"
              >
                {actionLoading
                  ? "Updating..."
                  : "Update Slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}