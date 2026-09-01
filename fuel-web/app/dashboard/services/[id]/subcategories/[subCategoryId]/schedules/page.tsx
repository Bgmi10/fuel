"use client";

import {
  ArrowLeft,
  Clock3,
  GripVertical,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

type ServiceSubCategory = {
  id: string;
  serviceId: string;
  name: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
};

type ServiceSchedule = {
  id: string;
  subCategoryId: string;
  label: string;
  times: unknown;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type ScheduleForm = {
  label: string;
  times: string[];
};

const Page = () => {
  const params = useParams();
  const router = useRouter();

  const serviceId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const subCategoryId =
    Array.isArray(params.subCategoryId)
      ? params.subCategoryId[0]
      : params.subCategoryId;

  const [subCategory, setSubCategory] =
    useState<ServiceSubCategory | null>(
      null
    );

  const [schedules, setSchedules] =
    useState<ServiceSchedule[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingSchedule, setEditingSchedule] =
    useState<ServiceSchedule | null>(null);

  const [label, setLabel] =
    useState("");

  const [times, setTimes] =
    useState<string[]>([""]);

  const [draggedIndex, setDraggedIndex] =
    useState<number | null>(null);

  const fetchData = async () => {
    if (!serviceId || !subCategoryId) {
      return;
    }

    try {
      setLoading(true);

      const [
        subCategoryResponse,
        scheduleResponse,
      ] = await Promise.all([
        fetch(
          `/api/services/${serviceId}/subcategories/${subCategoryId}`,
          {
            cache: "no-store",
          }
        ),

        fetch(
          `/api/services/${serviceId}/subcategories/${subCategoryId}/schedules`,
          {
            cache: "no-store",
          }
        ),
      ]);

      const subCategoryData =
        await subCategoryResponse.json();

      const scheduleData =
        await scheduleResponse.json();

      setSubCategory(
        subCategoryData.subCategory ||
          null
      );

      if (!scheduleData.success) {
        alert(
          scheduleData.message ||
            "Failed to load schedules"
        );

        return;
      }

      setSchedules(
        scheduleData.schedules || []
      );
    } catch (error) {
      console.error(error);

      alert(
        "Failed to load schedules"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    serviceId,
    subCategoryId,
  ]);

  const normalizeTimes = (
    value: unknown
  ): string[] => {
    if (Array.isArray(value)) {
      return value
        .map((item) =>
          String(item).trim()
        )
        .filter(Boolean);
    }

    if (
      typeof value === "string"
    ) {
      try {
        const parsed =
          JSON.parse(value);

        if (Array.isArray(parsed)) {
          return parsed
            .map((item) =>
              String(item).trim()
            )
            .filter(Boolean);
        }
      } catch {
        if (value.trim()) {
          return [value.trim()];
        }
      }
    }

    return [];
  };

  const resetForm = () => {
    setLabel("");
    setTimes([""]);
    setEditingSchedule(null);
  };

  const closeModal = () => {
    if (actionLoading) {
      return;
    }

    setModalOpen(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (
    schedule: ServiceSchedule
  ) => {
    setEditingSchedule(schedule);

    setLabel(schedule.label);

    const scheduleTimes =
      normalizeTimes(
        schedule.times
      );

    setTimes(
      scheduleTimes.length > 0
        ? scheduleTimes
        : [""]
    );

    setModalOpen(true);
  };

  const addTime = () => {
    setTimes((current) => [
      ...current,
      "",
    ]);
  };

  const removeTime = (
    index: number
  ) => {
    setTimes((current) => {
      if (current.length === 1) {
        return [""];
      }

      return current.filter(
        (_, currentIndex) =>
          currentIndex !== index
      );
    });
  };

  const updateTime = (
    index: number,
    value: string
  ) => {
    setTimes((current) =>
      current.map(
        (time, currentIndex) =>
          currentIndex === index
            ? value
            : time
      )
    );
  };

  const moveTime = (
    fromIndex: number,
    toIndex: number
  ) => {
    setTimes((current) => {
      if (
        toIndex < 0 ||
        toIndex >= current.length
      ) {
        return current;
      }

      const updated = [
        ...current,
      ];

      const [
        movedItem,
      ] = updated.splice(
        fromIndex,
        1
      );

      updated.splice(
        toIndex,
        0,
        movedItem
      );

      return updated;
    });
  };

  const handleSubmit = async () => {
    const normalizedLabel =
      label.trim();

    const normalizedTimes =
      times
        .map((time) =>
          time.trim()
        )
        .filter(Boolean);

    if (!normalizedLabel) {
      alert(
        "Schedule label is required"
      );

      return;
    }

    if (
      normalizedTimes.length === 0
    ) {
      alert(
        "Add at least one schedule time"
      );

      return;
    }

    if (!serviceId || !subCategoryId) {
      return;
    }

    setActionLoading(true);

    try {
      const payload = {
        label:
          normalizedLabel,

        times:
          normalizedTimes,

        sortOrder:
          editingSchedule
            ? editingSchedule.sortOrder
            : schedules.length,
      };

      const endpoint =
        editingSchedule
          ? `/api/services/${serviceId}/subcategories/${subCategoryId}/schedules/${editingSchedule.id}`
          : `/api/services/${serviceId}/subcategories/${subCategoryId}/schedules`;

      const response =
        await fetch(endpoint, {
          method:
            editingSchedule
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
        });

      const data =
        await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Failed to save schedule"
        );

        return;
      }

      closeModal();

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

  const deleteSchedule =
    async (
      scheduleId: string
    ) => {
      if (
        !serviceId ||
        !subCategoryId
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Delete this schedule?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await fetch(
            `/api/services/${serviceId}/subcategories/${subCategoryId}/schedules/${scheduleId}`,
            {
              method:
                "DELETE",
            }
          );

        const data =
          await response.json();

        if (!data.success) {
          alert(
            data.message ||
              "Failed to delete schedule"
          );

          return;
        }

        await fetchData();
      } catch (error) {
        console.error(error);

        alert(
          "Failed to delete schedule"
        );
      }
    };

  const handleDrop = (
    targetIndex: number
  ) => {
    if (
      draggedIndex === null ||
      draggedIndex === targetIndex
    ) {
      setDraggedIndex(null);
      return;
    }

    setSchedules((current) => {
      const updated = [
        ...current,
      ];

      const [
        movedSchedule,
      ] = updated.splice(
        draggedIndex,
        1
      );

      updated.splice(
        targetIndex,
        0,
        movedSchedule
      );

      return updated.map(
        (schedule, index) => ({
          ...schedule,
          sortOrder: index,
        })
      );
    });

    setDraggedIndex(null);
  };

  const saveOrder = async () => {
    if (
      !serviceId ||
      !subCategoryId
    ) {
      return;
    }

    if (schedules.length === 0) {
      return;
    }

    setActionLoading(true);

    try {
      for (
        let index = 0;
        index < schedules.length;
        index++
      ) {
        const schedule =
          schedules[index];

        await fetch(
          `/api/services/${serviceId}/subcategories/${subCategoryId}/schedules/${schedule.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              label:
                schedule.label,

              times:
                normalizeTimes(
                  schedule.times
                ),

              sortOrder:
                index,
            }),
          }
        );
      }

      await fetchData();

      alert(
        "Schedule order saved"
      );
    } catch (error) {
      console.error(error);

      alert(
        "Failed to save schedule order"
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 transition hover:border-lime-400 hover:text-lime-400"
          >
            <ArrowLeft
              size={18}
            />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                {subCategory?.name ||
                  "Subcategory"}
              </h1>

              {subCategory && (
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] ${
                    subCategory.isActive
                      ? "border-green-500/20 bg-green-500/10 text-green-400"
                      : "border-red-500/20 bg-red-500/10 text-red-400"
                  }`}
                >
                  {subCategory.isActive
                    ? "ACTIVE"
                    : "INACTIVE"}
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-neutral-500">
              Manage available
              schedules and timings
              for this subcategory.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {schedules.length > 1 && (
            <button
              type="button"
              onClick={saveOrder}
              disabled={
                actionLoading
              }
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:border-lime-400 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={15} />

              Save Order
            </button>
          )}

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
          >
            <Plus size={16} />

            Add Schedule
          </button>
        </div>
      </div>

      {subCategory?.description && (
        <div className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm leading-relaxed text-neutral-400">
            {subCategory.description}
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        {loading ? (
          <div className="p-6 text-sm text-neutral-500">
            Loading schedules...
          </div>
        ) : schedules.length ===
          0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800 text-neutral-500">
              <Clock3
                size={25}
              />
            </div>

            <h2 className="mt-4 text-base font-semibold text-white">
              No schedules found
            </h2>

            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
              Add the first schedule
              for this subcategory.
              You can add multiple
              times to each schedule.
            </p>

            <button
              type="button"
              onClick={openCreate}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
            >
              <Plus size={16} />

              Add Schedule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {schedules.map(
              (
                schedule,
                index
              ) => {
                const scheduleTimes =
                  normalizeTimes(
                    schedule.times
                  );

                return (
                  <div
                    key={
                      schedule.id
                    }
                    draggable
                    onDragStart={() =>
                      setDraggedIndex(
                        index
                      )
                    }
                    onDragOver={(event) =>
                      event.preventDefault()
                    }
                    onDrop={() =>
                      handleDrop(
                        index
                      )
                    }
                    className={`flex flex-col gap-5 p-5 transition md:flex-row md:items-start md:justify-between ${
                      draggedIndex ===
                      index
                        ? "bg-lime-400/5 opacity-50"
                        : "hover:bg-neutral-800/30"
                    }`}
                  >
                    <div className="flex min-w-0 gap-4">
                      <div className="hidden cursor-grab pt-1 text-neutral-700 hover:text-neutral-400 md:block">
                        <GripVertical
                          size={19}
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                          <Clock3
                            size={19}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-lg font-semibold text-white">
                              {
                                schedule.label
                              }
                            </h2>

                            <span className="rounded-full border border-zinc-700 bg-black px-2 py-1 text-[10px] text-neutral-500">
                              #{index +
                                1}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {scheduleTimes.length >
                            0 ? (
                              scheduleTimes.map(
                                (
                                  time,
                                  timeIndex
                                ) => (
                                  <span
                                    key={`${schedule.id}-${timeIndex}`}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-xs font-medium text-neutral-200"
                                  >
                                    <Clock3
                                      size={
                                        12
                                      }
                                      className="text-lime-400"
                                    />

                                    {
                                      time
                                    }
                                  </span>
                                )
                              )
                            ) : (
                              <span className="text-xs text-neutral-600">
                                No times
                                configured
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-xs text-neutral-600">
                            {
                              scheduleTimes.length
                            }{" "}
                            {scheduleTimes.length ===
                            1
                              ? "time"
                              : "times"}{" "}
                            configured
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEdit(
                            schedule
                          )
                        }
                        className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteSchedule(
                            schedule.id
                          )
                        }
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20"
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingSchedule
                    ? "Edit Schedule"
                    : "Add Schedule"}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  Configure a schedule
                  label and one or more
                  available times.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  actionLoading
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5">
              <form
                className="space-y-6"
                onSubmit={(
                  event
                ) => {
                  event.preventDefault();

                  handleSubmit();
                }}
              >
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Schedule Label
                  </label>

                  <input
                    value={label}
                    onChange={(
                      event
                    ) =>
                      setLabel(
                        event.target
                          .value
                      )
                    }
                    placeholder="Example: Morning Batch"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
                  />

                  <p className="mt-1.5 text-xs text-neutral-600">
                    Use a clear name such
                    as Morning, Evening,
                    Weekday or Weekend.
                  </p>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <label className="block text-sm text-neutral-400">
                        Available Times
                      </label>

                      <p className="mt-1 text-xs text-neutral-600">
                        Add every time offered
                        under this schedule.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        addTime
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-lime-400/20 bg-lime-400/10 px-3 py-1.5 text-xs font-medium text-lime-300 transition hover:bg-lime-400/20"
                    >
                      <Plus
                        size={13}
                      />

                      Add Time
                    </button>
                  </div>

                  <div className="space-y-3">
                    {times.map(
                      (
                        time,
                        index
                      ) => (
                        <div
                          key={
                            index
                          }
                          className="flex items-center gap-2"
                        >
                          <div className="flex h-11 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-black text-neutral-600">
                            <Clock3
                              size={
                                15
                              }
                            />
                          </div>

                          <input
                            value={
                              time
                            }
                            onChange={(
                              event
                            ) =>
                              updateTime(
                                index,
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Example: 6:00 AM"
                            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removeTime(
                                index
                              )
                            }
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
                          >
                            <Trash2
                              size={
                                15
                              }
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <div className="flex items-start gap-3">
                    <Clock3
                      size={17}
                      className="mt-0.5 shrink-0 text-lime-400"
                    />

                    <div>
                      <p className="text-sm font-medium text-white">
                        Schedule Preview
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {times
                          .map(
                            (
                              time
                            ) =>
                              time.trim()
                          )
                          .filter(
                            Boolean
                          )
                          .map(
                            (
                              time,
                              index
                            ) => (
                              <span
                                key={
                                  index
                                }
                                className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300"
                              >
                                {
                                  time
                                }
                              </span>
                            )
                          )}

                        {times.every(
                          (
                            time
                          ) =>
                            !time.trim()
                        ) && (
                          <span className="text-xs text-neutral-600">
                            Times will
                            appear here.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-zinc-800 pt-5">
                  <button
                    type="button"
                    onClick={
                      closeModal
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
                    className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save
                          size={15}
                        />

                        {editingSchedule
                          ? "Update Schedule"
                          : "Create Schedule"}
                      </>
                    )}
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
