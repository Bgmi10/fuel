"use client";

import { useEffect, useMemo, useState } from "react";
import type { Branch, Service, SlotWeekday } from "@prisma/client";
import { useRouter } from "next/navigation";
import { formatTime } from "@/app/utils/date";

type ServiceSubCategory = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

type ServiceWithSubCategories = Service & {
  subCategories: ServiceSubCategory[];
};

type Slot = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
  daysOfWeek: SlotWeekday[];

  branchId: string;
  serviceId: string;
  subCategoryId: string | null;

  branch?: Branch;
  service?: Service;

  subCategory?: {
    id: string;
    name: string;
  };

  _count?: {
    bookings: number;
  };
};

const WEEKDAYS: {
  value: SlotWeekday;
  label: string;
  shortLabel: string;
}[] = [
  {
    value: "MONDAY",
    label: "Monday",
    shortLabel: "Mon",
  },
  {
    value: "TUESDAY",
    label: "Tuesday",
    shortLabel: "Tue",
  },
  {
    value: "WEDNESDAY",
    label: "Wednesday",
    shortLabel: "Wed",
  },
  {
    value: "THURSDAY",
    label: "Thursday",
    shortLabel: "Thu",
  },
  {
    value: "FRIDAY",
    label: "Friday",
    shortLabel: "Fri",
  },
  {
    value: "SATURDAY",
    label: "Saturday",
    shortLabel: "Sat",
  },
  {
    value: "SUNDAY",
    label: "Sunday",
    shortLabel: "Sun",
  },
];

const ALL_WEEKDAYS: SlotWeekday[] = WEEKDAYS.map(
  (day) => day.value
);

function formatSlotDays(daysOfWeek: SlotWeekday[]) {
  if (!daysOfWeek || daysOfWeek.length === 7) {
    return "Every day";
  }

  if (daysOfWeek.length === 0) {
    return "No days selected";
  }

  return WEEKDAYS.filter((day) =>
    daysOfWeek.includes(day.value)
  )
    .map((day) => day.shortLabel)
    .join(", ");
}

type SessionForm = {
  startTime: string;
  endTime: string;
  capacity: string;
};

type CreateForm = {
  branchId: string;
  daysOfWeek: SlotWeekday[];
  serviceId: string;
  subCategoryId: string;
  sessionCount: string;
  sessions: SessionForm[];
};

type EditForm = {
  name: string;
  startTime: string;
  daysOfWeek: SlotWeekday[];
  endTime: string;
  capacity: string;
  branchId: string;
  serviceId: string;
  subCategoryId: string;
};

const createEmptySession = (): SessionForm => ({
  startTime: "",
  endTime: "",
  capacity: "",
});

const initialCreateForm = (): CreateForm => ({
  branchId: "",
  serviceId: "",
  subCategoryId: "",
  sessionCount: "1",
  daysOfWeek: [...ALL_WEEKDAYS],
  sessions: [createEmptySession()],
});

const initialEditForm = (): EditForm => ({
  name: "",
  startTime: "",
  endTime: "",
  daysOfWeek: [...ALL_WEEKDAYS],
  capacity: "",
  branchId: "",
  serviceId: "",
  subCategoryId: "",
});

export default function Page() {
  const router = useRouter();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<
    ServiceWithSubCategories[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);

  const [editingSlotId, setEditingSlotId] =
    useState<string | null>(null);

  const [createForm, setCreateForm] =
    useState<CreateForm>(initialCreateForm);

  const [editForm, setEditForm] =
    useState<EditForm>(initialEditForm);

  /*
   * -------------------------------------------------------
   * SELECTED SERVICES / SUBCATEGORIES
   * -------------------------------------------------------
   */

  const selectedCreateService = useMemo(() => {
    return services.find(
      (service) =>
        service.id === createForm.serviceId
    );
  }, [services, createForm.serviceId]);

  const selectedEditService = useMemo(() => {
    return services.find(
      (service) =>
        service.id === editForm.serviceId
    );
  }, [services, editForm.serviceId]);

  const availableCreateSubCategories =
    selectedCreateService?.subCategories
      ?.filter((subCategory) => subCategory.isActive)
      .sort(
        (a, b) => a.sortOrder - b.sortOrder
      ) ?? [];

  const availableEditSubCategories =
    selectedEditService?.subCategories
      ?.filter((subCategory) => subCategory.isActive)
      .sort(
        (a, b) => a.sortOrder - b.sortOrder
      ) ?? [];

  /*
   * -------------------------------------------------------
   * WEEKDAY HELPERS
   * -------------------------------------------------------
   */

  const toggleCreateWeekday = (
    weekday: SlotWeekday
  ) => {
    setCreateForm((current) => {
      const selected =
        current.daysOfWeek.includes(weekday);

      return {
        ...current,
        daysOfWeek: selected
          ? current.daysOfWeek.filter(
              (day) => day !== weekday
            )
          : [
              ...current.daysOfWeek,
              weekday,
            ],
      };
    });
  };

  const toggleEditWeekday = (
    weekday: SlotWeekday
  ) => {
    setEditForm((current) => {
      const selected =
        current.daysOfWeek.includes(weekday);

      return {
        ...current,
        daysOfWeek: selected
          ? current.daysOfWeek.filter(
              (day) => day !== weekday
            )
          : [
              ...current.daysOfWeek,
              weekday,
            ],
      };
    });
  };

  /*
   * -------------------------------------------------------
   * FETCH SLOTS
   * -------------------------------------------------------
   */

  const fetchSlots = async () => {
    try {
      const res = await fetch("/api/slot");

      if (!res.ok) {
        throw new Error("Failed to fetch slots");
      }

      const data = await res.json();

      setSlots(
        Array.isArray(data)
          ? data
          : data.slots || []
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /*
   * -------------------------------------------------------
   * FETCH BRANCHES
   * -------------------------------------------------------
   */

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");

      if (!res.ok) {
        throw new Error(
          "Failed to fetch branches"
        );
      }

      const data = await res.json();

      setBranches(data.branches || []);
    } catch (error) {
      console.error(error);
    }
  };

  /*
   * -------------------------------------------------------
   * FETCH SERVICES
   * -------------------------------------------------------
   */

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");

      if (!res.ok) {
        throw new Error(
          "Failed to fetch services"
        );
      }

      const data = await res.json();

      setServices(
        data.services || []
      );
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

  /*
   * -------------------------------------------------------
   * CREATE FORM HELPERS
   * -------------------------------------------------------
   */

  const updateSessionCount = (
    value: string
  ) => {
    if (value === "") {
      setCreateForm((current) => ({
        ...current,
        sessionCount: "",
      }));

      return;
    }

    const parsedCount =
      Number.parseInt(value, 10);

    if (
      !Number.isInteger(parsedCount) ||
      parsedCount < 1 ||
      parsedCount > 20
    ) {
      setCreateForm((current) => ({
        ...current,
        sessionCount: value,
      }));

      return;
    }

    setCreateForm((current) => ({
      ...current,
      sessionCount: value,
      sessions: Array.from(
        { length: parsedCount },
        (_, index) =>
          current.sessions[index] ||
          createEmptySession()
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
      sessions: current.sessions.map(
        (session, sessionIndex) =>
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

  /*
   * -------------------------------------------------------
   * CREATE SERVICE CHANGE
   * -------------------------------------------------------
   */

  const handleCreateServiceChange = (
    serviceId: string
  ) => {
    setCreateForm((current) => ({
      ...current,
      serviceId,
      subCategoryId: "",
    }));
  };

  /*
   * -------------------------------------------------------
   * CREATE SUBCATEGORY CHANGE
   * -------------------------------------------------------
   */

  const handleCreateSubCategoryChange = (
    subCategoryId: string
  ) => {
    setCreateForm((current) => ({
      ...current,
      subCategoryId,
    }));
  };

  /*
   * -------------------------------------------------------
   * CREATE MULTIPLE SESSIONS
   * -------------------------------------------------------
   */

  const createSlots = async () => {
    if (!createForm.branchId) {
      alert("Please select a branch");
      return;
    }

    if (!createForm.serviceId) {
      alert("Please select a service");
      return;
    }

    if (createForm.daysOfWeek.length === 0) {
      alert(
        "Please select at least one operating day."
      );
      return;
    }

    if (
      createForm.sessions.length === 0
    ) {
      alert(
        "Please configure at least one session"
      );
      return;
    }

    const hasInvalidSession =
      createForm.sessions.some(
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

    const sessionCount =
      Number.parseInt(
        createForm.sessionCount,
        10
      );

    if (
      !Number.isInteger(sessionCount) ||
      sessionCount < 1 ||
      sessionCount > 20
    ) {
      alert(
        "Number of sessions must be between 1 and 20"
      );
      return;
    }

    if (
      createForm.sessions.length !==
      sessionCount
    ) {
      alert(
        "Session configuration is incomplete"
      );
      return;
    }

    const hasInvalidTime =
      createForm.sessions.some(
        (session) =>
          session.startTime >=
          session.endTime
      );

    if (hasInvalidTime) {
      alert(
        "Session end time must be after its start time"
      );
      return;
    }

    /*
     * Make sure the selected subcategory
     * actually belongs to the selected service.
     */
    if (createForm.subCategoryId) {
      const validSubCategory =
        availableCreateSubCategories.some(
          (subCategory) =>
            subCategory.id ===
            createForm.subCategoryId
        );

      if (!validSubCategory) {
        alert(
          "Selected subcategory is not available for this service"
        );
        return;
      }
    }

    setActionLoading(true);

    try {
      const serviceName =
        selectedCreateService?.name ||
        "Service";

      const payload = {
        branchId: createForm.branchId,
        serviceId: createForm.serviceId,

        subCategoryId:
          createForm.subCategoryId ||
          null,

        daysOfWeek:
          createForm.daysOfWeek,

        sessionCount:
          Number.parseInt(
            createForm.sessionCount,
            10
          ),

        sessions:
          createForm.sessions.map(
            (session, index) => ({
              name: `${serviceName} - Session ${
                index + 1
              }`,
              startTime:
                session.startTime,
              endTime:
                session.endTime,
              capacity:
                Number.parseInt(
                  session.capacity,
                  10
                ),
            })
          ),
      };

      const res = await fetch(
        "/api/slot",
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to create sessions"
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

  /*
   * -------------------------------------------------------
   * EDIT SLOT
   * -------------------------------------------------------
   */

  const openEditModal = (slot: Slot) => {
    setEditingSlotId(slot.id);

    setEditForm({
      name: slot.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: String(slot.capacity),
      branchId: slot.branchId,
      serviceId: slot.serviceId,
      subCategoryId:
        slot.subCategoryId ?? "",
      daysOfWeek:
        slot.daysOfWeek?.length > 0
          ? [...slot.daysOfWeek]
          : [...ALL_WEEKDAYS],
    });

    setEditModal(true);
  };

  const closeEditModal = () => {
    setEditModal(false);
    setEditingSlotId(null);
    setEditForm(initialEditForm());
  };

  /*
   * -------------------------------------------------------
   * EDIT SERVICE CHANGE
   * -------------------------------------------------------
   */

  const handleEditServiceChange = (
    serviceId: string
  ) => {
    setEditForm((current) => ({
      ...current,
      serviceId,
      subCategoryId: "",
    }));
  };

  /*
   * -------------------------------------------------------
   * EDIT SUBCATEGORY CHANGE
   * -------------------------------------------------------
   */

  const handleEditSubCategoryChange = (
    subCategoryId: string
  ) => {
    setEditForm((current) => ({
      ...current,
      subCategoryId,
    }));
  };

  /*
   * -------------------------------------------------------
   * UPDATE SLOT
   * -------------------------------------------------------
   */

  const updateSlot = async () => {
    if (!editingSlotId) {
      return;
    }

    if (editForm.daysOfWeek.length === 0) {
      alert(
        "Please select at least one operating day."
      );
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

    if (
      editForm.startTime >=
      editForm.endTime
    ) {
      alert(
        "End time must be after start time"
      );
      return;
    }

    if (Number(editForm.capacity) <= 0) {
      alert(
        "Capacity must be greater than zero"
      );
      return;
    }

    /*
     * Validate subcategory against
     * the currently selected service.
     */
    if (editForm.subCategoryId) {
      const validSubCategory =
        availableEditSubCategories.some(
          (subCategory) =>
            subCategory.id ===
            editForm.subCategoryId
        );

      if (!validSubCategory) {
        alert(
          "Selected subcategory is not available for this service"
        );
        return;
      }
    }

    setActionLoading(true);

    try {
      const res = await fetch(
        `/api/slot/${editingSlotId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ...editForm,

            name: editForm.name.trim(),

            capacity: Number(
              editForm.capacity
            ),

            subCategoryId:
              editForm.subCategoryId ||
              null,

            daysOfWeek:
              editForm.daysOfWeek,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to update slot"
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

  /*
   * -------------------------------------------------------
   * DISABLE SLOT
   * -------------------------------------------------------
   */

  const deleteSlot = async (id: string) => {
    const confirmed = confirm(
      "Are you sure you want to disable this slot?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(
        `/api/slot/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json();

        throw new Error(
          data.message ||
            "Failed to disable slot"
        );
      }

      closeEditModal();

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
            Manage service sessions and
            booking capacity
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setCreateModal(true)
          }
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
                className="flex flex-col gap-5 p-6 transition hover:bg-neutral-900/80 lg:flex-row lg:items-center lg:justify-between"
              >
                {/* SESSION INFORMATION */}

                <div className="min-w-0">
                  <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                    {slot.name}
                  </h2>

                  {/* SESSION TIMING */}

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-lime-400 sm:text-xl">
                      {formatTime(
                        slot.startTime
                      )}
                    </span>

                    <span className="text-sm text-neutral-600">
                      →
                    </span>

                    <span className="text-lg font-bold text-lime-400 sm:text-xl">
                      {formatTime(
                        slot.endTime
                      )}
                    </span>
                  </div>

                  {/* CAPACITY + DAYS */}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <span className="text-neutral-400">
                      Capacity:{" "}
                      <span className="font-semibold text-neutral-200">
                        {slot.capacity}
                      </span>
                    </span>

                    <span className="hidden text-neutral-700 sm:inline">
                      •
                    </span>

                    <span className="text-neutral-400">
                      Runs on:{" "}
                      <span className="font-medium text-neutral-300">
                        {formatSlotDays(
                          slot.daysOfWeek ||
                            ALL_WEEKDAYS
                        )}
                      </span>
                    </span>
                  </div>

                  {/* SERVICE + BRANCH */}

                  <p className="mt-2 text-xs font-medium text-lime-400">
                    {slot.service?.name ||
                      "Service unavailable"}
                    {" • "}
                    {slot.branch?.name ||
                      "Branch unavailable"}
                  </p>

                  {/* SUBCATEGORY */}

                  {slot.subCategory && (
                    <p className="mt-1 text-xs text-neutral-500">
                      Sub Category:{" "}
                      <span className="font-medium text-neutral-300">
                        {
                          slot
                            .subCategory
                            .name
                        }
                      </span>
                    </p>
                  )}
                </div>

                {/* ACTIONS */}

                <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
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
                    {slot._count
                      ?.bookings ?? 0}
                    )
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openEditModal(slot)
                    }
                    className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          CREATE MODAL
          ===================================================== */}

      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                Create New Slot
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Select a service, optional
                subcategory and configure
                each session.
              </p>
            </div>

            {/* BRANCH + SERVICE */}

            <div className="grid gap-4 md:grid-cols-2">
              {/* BRANCH */}

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Branch
                </label>

                <select
                  value={
                    createForm.branchId
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        branchId:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
                >
                  <option value="">
                    Select Branch
                  </option>

                  {branches.map(
                    (branch) => (
                      <option
                        key={branch.id}
                        value={
                          branch.id
                        }
                      >
                        {branch.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* SERVICE */}

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Service
                </label>

                <select
                  value={
                    createForm.serviceId
                  }
                  onChange={(event) =>
                    handleCreateServiceChange(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
                >
                  <option value="">
                    Select Service
                  </option>

                  {services.map(
                    (service) => (
                      <option
                        key={service.id}
                        value={
                          service.id
                        }
                      >
                        {service.name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* SUBCATEGORY */}

            {availableCreateSubCategories.length >
              0 && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Sub Category
                </label>

                <select
                  value={
                    createForm.subCategoryId
                  }
                  onChange={(event) =>
                    handleCreateSubCategoryChange(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none focus:border-lime-400"
                >
                  <option value="">
                    Select Sub Category
                  </option>

                  {availableCreateSubCategories.map(
                    (subCategory) => (
                      <option
                        key={
                          subCategory.id
                        }
                        value={
                          subCategory.id
                        }
                      >
                        {
                          subCategory.name
                        }
                      </option>
                    )
                  )}
                </select>

                <p className="mt-1.5 text-xs text-neutral-500">
                  This slot will belong to
                  the selected subcategory.
                </p>
              </div>
            )}

            {/* OPERATING DAYS */}

            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-300">
                    Operating Days
                  </label>

                  <p className="mt-1 text-xs text-neutral-500">
                    Select the days on which
                    these sessions will be
                    available.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm(
                        (current) => ({
                          ...current,
                          daysOfWeek: [
                            ...ALL_WEEKDAYS,
                          ],
                        })
                      )
                    }
                    className="text-xs font-medium text-lime-400"
                  >
                    Select all
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm(
                        (current) => ({
                          ...current,
                          daysOfWeek: [],
                        })
                      )
                    }
                    className="text-xs font-medium text-neutral-500"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {WEEKDAYS.map((day) => {
                  const selected =
                    createForm.daysOfWeek.includes(
                      day.value
                    );

                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() =>
                        toggleCreateWeekday(
                          day.value
                        )
                      }
                      className={`rounded-xl border px-2 py-3 text-xs font-semibold transition-colors ${
                        selected
                          ? "border-lime-400 bg-lime-400 text-black"
                          : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-white"
                      }`}
                    >
                      <span className="sm:hidden">
                        {
                          day.shortLabel
                        }
                      </span>

                      <span className="hidden sm:inline">
                        {day.label.slice(
                          0,
                          3
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {createForm.daysOfWeek
                .length > 0 && (
                <p className="mt-3 text-xs text-lime-400">
                  Sessions will run on{" "}
                  {formatSlotDays(
                    createForm.daysOfWeek
                  )}
                  .
                </p>
              )}
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
                value={
                  createForm.sessionCount
                }
                onChange={(event) =>
                  updateSessionCount(
                    event.target.value
                  )
                }
                onBlur={() => {
                  const count =
                    Number.parseInt(
                      createForm.sessionCount,
                      10
                    );

                  if (
                    !Number.isInteger(
                      count
                    ) ||
                    count < 1 ||
                    count > 20
                  ) {
                    updateSessionCount(
                      "1"
                    );
                  }
                }}
                className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none"
              />

              <p className="mt-1 text-xs text-neutral-500">
                You can configure up to 20
                sessions at once.
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
                          Session{" "}
                          {index + 1}
                        </h3>

                        {selectedCreateService && (
                          <p className="mt-1 text-xs text-neutral-500">
                            {
                              selectedCreateService.name
                            }{" "}
                            - Session{" "}
                            {index + 1}
                          </p>
                        )}

                        {createForm.subCategoryId && (
                          <p className="mt-1 text-xs text-lime-400">
                            {
                              availableCreateSubCategories.find(
                                (
                                  subCategory
                                ) =>
                                  subCategory.id ===
                                  createForm.subCategoryId
                              )?.name
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      {/* START */}

                      <div>
                        <label className="mb-2 block text-xs font-medium text-neutral-400">
                          Start Time
                        </label>

                        <input
                          type="time"
                          value={
                            session.startTime
                          }
                          onChange={(event) =>
                            updateSession(
                              index,
                              "startTime",
                              event.target
                                .value
                            )
                          }
                          style={{
                            colorScheme:
                              "dark",
                          }}
                          className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 text-white outline-none"
                        />
                      </div>

                      {/* END */}

                      <div>
                        <label className="mb-2 block text-xs font-medium text-neutral-400">
                          End Time
                        </label>

                        <input
                          type="time"
                          value={
                            session.endTime
                          }
                          onChange={(event) =>
                            updateSession(
                              index,
                              "endTime",
                              event.target
                                .value
                            )
                          }
                          style={{
                            colorScheme:
                              "dark",
                          }}
                          className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 text-white outline-none"
                        />
                      </div>

                      {/* CAPACITY */}

                      <div>
                        <label className="mb-2 block text-xs font-medium text-neutral-400">
                          Maximum Bookings
                        </label>

                        <input
                          type="number"
                          min={1}
                          value={
                            session.capacity
                          }
                          onChange={(event) =>
                            updateSession(
                              index,
                              "capacity",
                              event.target
                                .value
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
                onClick={
                  closeCreateModal
                }
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
                      createForm.sessions
                        .length
                    } ${
                      createForm.sessions
                        .length === 1
                        ? "Session"
                        : "Sessions"
                    }`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          EDIT MODAL
          ===================================================== */}

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
            {/* HEADER */}

            <div className="shrink-0 border-b border-neutral-800 px-6 py-5">
              <h2 className="text-xl font-bold text-white">
                Edit Slot
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Update slot details,
                subcategory and operating
                days.
              </p>
            </div>

            {/* CONTENT */}

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {/* SLOT NAME */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Slot Name
                </label>

                <input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm(
                      (current) => ({
                        ...current,
                        name: event.target
                          .value,
                      })
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none focus:border-lime-400"
                />
              </div>

              {/* TIME */}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Start Time
                  </label>

                  <input
                    type="time"
                    value={
                      editForm.startTime
                    }
                    onChange={(event) =>
                      setEditForm(
                        (current) => ({
                          ...current,
                          startTime:
                            event.target
                              .value,
                        })
                      )
                    }
                    style={{
                      colorScheme: "dark",
                    }}
                    className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    End Time
                  </label>

                  <input
                    type="time"
                    value={
                      editForm.endTime
                    }
                    onChange={(event) =>
                      setEditForm(
                        (current) => ({
                          ...current,
                          endTime:
                            event.target
                              .value,
                        })
                      )
                    }
                    style={{
                      colorScheme: "dark",
                    }}
                    className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              {/* CAPACITY */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Maximum Bookings
                </label>

                <input
                  type="number"
                  min={1}
                  value={
                    editForm.capacity
                  }
                  onChange={(event) =>
                    setEditForm(
                      (current) => ({
                        ...current,
                        capacity:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none focus:border-lime-400"
                />
              </div>

              {/* BRANCH */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Branch
                </label>

                <select
                  value={
                    editForm.branchId
                  }
                  onChange={(event) =>
                    setEditForm(
                      (current) => ({
                        ...current,
                        branchId:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none focus:border-lime-400"
                >
                  <option value="">
                    Select Branch
                  </option>

                  {branches.map(
                    (branch) => (
                      <option
                        key={branch.id}
                        value={
                          branch.id
                        }
                      >
                        {branch.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* SERVICE */}

              <div>
                <label className="mb-2 block text-sm text-neutral-400">
                  Service
                </label>

                <select
                  value={
                    editForm.serviceId
                  }
                  onChange={(event) =>
                    handleEditServiceChange(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none focus:border-lime-400"
                >
                  <option value="">
                    Select Service
                  </option>

                  {services.map(
                    (service) => (
                      <option
                        key={service.id}
                        value={
                          service.id
                        }
                      >
                        {service.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* SUBCATEGORY */}

              {availableEditSubCategories.length >
                0 && (
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Sub Category
                  </label>

                  <select
                    value={
                      editForm.subCategoryId
                    }
                    onChange={(event) =>
                      handleEditSubCategoryChange(
                        event.target
                          .value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-white outline-none focus:border-lime-400"
                  >
                    <option value="">
                      No Sub Category
                    </option>

                    {availableEditSubCategories.map(
                      (
                        subCategory
                      ) => (
                        <option
                          key={
                            subCategory.id
                          }
                          value={
                            subCategory.id
                          }
                        >
                          {
                            subCategory.name
                          }
                        </option>
                      )
                    )}
                  </select>

                  <p className="mt-1.5 text-xs text-neutral-500">
                    The subcategory must
                    belong to the selected
                    service.
                  </p>
                </div>
              )}

              {/* OPERATING DAYS */}

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300">
                      Operating Days
                    </label>

                    <p className="mt-1 text-xs text-neutral-500">
                      Select when this slot
                      is available.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setEditForm(
                          (current) => ({
                            ...current,
                            daysOfWeek: [
                              ...ALL_WEEKDAYS,
                            ],
                          })
                        )
                      }
                      className="text-xs font-medium text-lime-400"
                    >
                      Select all
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setEditForm(
                          (current) => ({
                            ...current,
                            daysOfWeek: [],
                          })
                        )
                      }
                      className="text-xs font-medium text-neutral-500"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {WEEKDAYS.map((day) => {
                    const selected =
                      editForm.daysOfWeek.includes(
                        day.value
                      );

                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() =>
                          toggleEditWeekday(
                            day.value
                          )
                        }
                        className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition ${
                          selected
                            ? "border-lime-400 bg-lime-400 text-black"
                            : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-white"
                        }`}
                      >
                        {
                          day.shortLabel
                        }
                      </button>
                    );
                  })}
                </div>

                {editForm.daysOfWeek
                  .length === 0 && (
                  <p className="mt-3 text-xs text-red-400">
                    Select at least one
                    operating day.
                  </p>
                )}
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-neutral-800 bg-neutral-950 px-6 py-4">
              <button
                type="button"
                onClick={
                  closeEditModal
                }
                disabled={actionLoading}
                className="rounded-xl border border-neutral-700 px-4 py-2 text-neutral-300 transition hover:bg-neutral-900 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  deleteSlot(
                    editingSlotId ?? ""
                  )
                }
                disabled={
                  actionLoading ||
                  !editingSlotId
                }
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete Slot
              </button>

              <button
                type="button"
                onClick={updateSlot}
                disabled={
                  actionLoading ||
                  editForm.daysOfWeek
                    .length === 0
                }
                className="rounded-xl bg-blue-500 px-5 py-2 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
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
