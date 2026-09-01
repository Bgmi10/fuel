"use client";

import type {
  Branch,
  Service,
} from "@prisma/client";

import {
  Edit,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

type ServiceWithBranches = Service & {
  branches: Branch[];
  _count?: {
    packages: number;
  };
};

const Page = () => {
  const router = useRouter();

  const [services, setServices] =
    useState<ServiceWithBranches[]>([]);

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingService, setEditingService] =
    useState<ServiceWithBranches | null>(null);

  /* =========================
     FORM STATE
  ========================= */

  const [name, setName] =
    useState("");

  const [thumbnailImage, setThumbnailImage] =
    useState("");

  const [coverImage, setCoverImage] =
    useState("");

  const [selectedBranches, setSelectedBranches] =
    useState<string[]>([]);

  const [thumbnailUploading, setThumbnailUploading] =
    useState(false);

  const [coverUploading, setCoverUploading] =
    useState(false);

  /* =========================
     FETCH SERVICES
  ========================= */

  const fetchServices = async () => {
    try {
      setLoading(true);

      const res =
        await fetch(
          "/api/services",
          {
            cache: "no-store",
          }
        );

      const data =
        await res.json();

      setServices(
        data.services || []
      );
    } catch (error) {
      console.error(error);

      alert(
        "Failed to load services"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH BRANCHES
  ========================= */

  const fetchBranches = async () => {
    try {
      const res =
        await fetch(
          "/api/branches",
          {
            cache: "no-store",
          }
        );

      const data =
        await res.json();

      setBranches(
        data.branches || []
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchBranches();
  }, []);

  /* =========================
     UPLOAD FILE
  ========================= */

  const uploadFile = async (
    file: File
  ): Promise<string> => {
    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    const response =
      await fetch(
        "/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

    let payload: any;

    try {
      payload =
        await response.json();
    } catch {
      throw new Error(
        `Upload server returned an invalid response (${response.status}).`
      );
    }

    if (
      !response.ok ||
      !payload?.url
    ) {
      throw new Error(
        payload?.message ||
          "File upload failed."
      );
    }

    if (
      typeof payload.url !==
      "string"
    ) {
      throw new Error(
        "Invalid upload URL returned."
      );
    }

    return payload.url;
  };

  /* =========================
     BRANCH TOGGLE
  ========================= */

  const toggleBranch = (
    branchId: string
  ) => {
    setSelectedBranches(
      (previous) =>
        previous.includes(branchId)
          ? previous.filter(
              (id) =>
                id !== branchId
            )
          : [
              ...previous,
              branchId,
            ]
    );
  };

  /* =========================
     RESET FORM
  ========================= */

  const resetForm = () => {
    setName("");
    setThumbnailImage("");
    setCoverImage("");
    setSelectedBranches([]);

    setEditingService(null);

    setThumbnailUploading(false);
    setCoverUploading(false);
  };

  /* =========================
     CLOSE MODAL
  ========================= */

  const closeModal = () => {
    if (actionLoading) {
      return;
    }

    setModalOpen(false);
    resetForm();
  };

  /* =========================
     OPEN CREATE
  ========================= */

  const openCreate = () => {
    resetForm();

    setModalOpen(true);
  };

  /* =========================
     OPEN EDIT
  ========================= */

  const openEdit = (
    service: ServiceWithBranches
  ) => {
    setEditingService(
      service
    );

    setName(
      service.name
    );

    setThumbnailImage(
      service.thumbnailImage ||
        ""
    );

    setCoverImage(
      service.coverImage ||
        ""
    );

    setSelectedBranches(
      service.branches?.map(
        (branch) =>
          branch.id
      ) || []
    );

    setModalOpen(true);
  };

  /* =========================
     THUMBNAIL UPLOAD
  ========================= */

  const handleThumbnailUpload =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      try {
        setThumbnailUploading(
          true
        );

        const url =
          await uploadFile(
            file
          );

        setThumbnailImage(
          url
        );
      } catch (error) {
        console.error(error);

        alert(
          error instanceof Error
            ? error.message
            : "Thumbnail upload failed"
        );
      } finally {
        setThumbnailUploading(
          false
        );

        event.target.value = "";
      }
    };

  /* =========================
     COVER UPLOAD
  ========================= */

  const handleCoverUpload =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      try {
        setCoverUploading(
          true
        );

        const url =
          await uploadFile(
            file
          );

        setCoverImage(
          url
        );
      } catch (error) {
        console.error(error);

        alert(
          error instanceof Error
            ? error.message
            : "Cover image upload failed"
        );
      } finally {
        setCoverUploading(
          false
        );

        event.target.value = "";
      }
    };

  /* =========================
     CREATE / UPDATE SERVICE
  ========================= */

  const saveService =
    async () => {
      const normalizedName =
        name.trim();

      if (!normalizedName) {
        alert(
          "Service name is required"
        );

        return;
      }

      if (
        thumbnailUploading ||
        coverUploading
      ) {
        alert(
          "Please wait for image uploads to finish."
        );

        return;
      }

      setActionLoading(
        true
      );

      try {
        const payload = {
          name:
            normalizedName,

          thumbnailImage:
            thumbnailImage.trim() ||
            null,

          coverImage:
            coverImage.trim() ||
            null,

          branchIds:
            selectedBranches,
        };

        const endpoint =
          editingService
            ? `/api/services/${editingService.id}`
            : "/api/services";

        const response =
          await fetch(
            endpoint,
            {
              method:
                editingService
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

        if (!response.ok || !data.success) {
          alert(
            data.message ||
              "Failed to save service"
          );

          return;
        }

        setModalOpen(false);

        resetForm();

        await fetchServices();
      } catch (error) {
        console.error(error);

        alert(
          "Something went wrong while saving the service."
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /* =========================
     DELETE SERVICE
  ========================= */

  const deleteService =
    async (
      serviceId: string
    ) => {
      const confirmed =
        window.confirm(
          "Delete this service?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await fetch(
            `/api/services/${serviceId}`,
            {
              method: "DELETE",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          alert(
            data.message ||
              "Failed to delete service"
          );

          return;
        }

        await fetchServices();
      } catch (error) {
        console.error(error);

        alert(
          "Failed to delete service"
        );
      }
    };

  return (
    <div className="p-6">
      {/* =========================
          HEADER
      ========================= */}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Services
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Manage gym services, images
            and linked branches
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300"
        >
          <Plus size={16} />
          Create Service
        </button>
      </div>

      {/* =========================
          SERVICE LIST
      ========================= */}

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        {loading ? (
          <div className="p-6 text-sm text-neutral-500">
            Loading services...
          </div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800 text-neutral-600">
              <ImageIcon size={24} />
            </div>

            <h2 className="mt-4 text-sm font-semibold text-white">
              No services found
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Create your first service.
            </p>

            <button
              type="button"
              onClick={openCreate}
              className="mt-5 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black hover:bg-lime-300"
            >
              Create Service
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {services.map(
              (service) => (
                <div
                  key={
                    service.id
                  }
                  className="flex flex-col gap-5 p-5 transition hover:bg-neutral-900/80 md:flex-row md:items-center md:justify-between"
                >
                  {/* SERVICE INFO */}

                  <div className="flex min-w-0 items-start gap-4">
                    {/* THUMBNAIL */}

                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-800 bg-black">
                      {service.thumbnailImage ? (
                        <img
                          src={
                            service.thumbnailImage
                          }
                          alt={
                            service.name
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon
                          size={22}
                          className="text-neutral-700"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-white">
                        {
                          service.name
                        }
                      </h2>

                      {/* BRANCHES */}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {service
                          .branches
                          ?.length >
                        0 ? (
                          service.branches.map(
                            (
                              branch
                            ) => (
                              <span
                                key={
                                  branch.id
                                }
                                className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
                              >
                                {
                                  branch.name
                                }
                              </span>
                            )
                          )
                        ) : (
                          <span className="text-xs text-neutral-600">
                            No branches
                            linked
                          </span>
                        )}
                      </div>

                      {/* PACKAGE COUNT */}

                      <p className="mt-3 text-xs text-lime-400">
                        {service
                          ._count
                          ?.packages ||
                          0}{" "}
                        Packages
                      </p>
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEdit(
                          service
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20"
                    >
                      <Edit
                        size={13}
                      />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/services/${service.id}`
                        )
                      }
                      className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-400 transition hover:bg-violet-500/20"
                    >
                      Manage
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteService(
                          service.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20"
                    >
                      <Trash2
                        size={13}
                      />
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* =========================
          CREATE / EDIT MODAL
      ========================= */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingService
                    ? "Edit Service"
                    : "Create Service"}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  Configure service details,
                  images and branches.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="overflow-y-auto px-5 py-5">
              <div className="space-y-6">
                {/* NAME */}

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Service Name
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Example: Gym"
                    className="w-full rounded-xl border border-neutral-800 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400"
                  />
                </div>

                {/* =========================
                    THUMBNAIL
                ========================= */}

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Thumbnail Image
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-800 bg-black">
                      {thumbnailImage ? (
                        <img
                          src={
                            thumbnailImage
                          }
                          alt="Thumbnail preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon
                          size={28}
                          className="text-neutral-700"
                        />
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-center">
                      <p className="text-xs text-neutral-500">
                        Upload an image
                        used as the
                        service thumbnail.
                      </p>

                      <label className="mt-3 inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white transition hover:border-lime-400 hover:text-lime-400">
                        <Upload
                          size={15}
                        />

                        {thumbnailUploading
                          ? "Uploading..."
                          : "Upload Thumbnail"}

                        <input
                          type="file"
                          accept="image/*"
                          disabled={
                            thumbnailUploading ||
                            actionLoading
                          }
                          onChange={
                            handleThumbnailUpload
                          }
                          className="hidden"
                        />
                      </label>

                      {thumbnailImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setThumbnailImage(
                              ""
                            )
                          }
                          className="mt-2 w-fit text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                          thumbnail
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* =========================
                    COVER IMAGE
                ========================= */}

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Cover Image
                  </label>

                  <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black">
                    <div className="flex h-44 items-center justify-center">
                      {coverImage ? (
                        <img
                          src={
                            coverImage
                          }
                          alt="Cover preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center">
                          <ImageIcon
                            size={28}
                            className="mx-auto text-neutral-700"
                          />

                          <p className="mt-2 text-xs text-neutral-600">
                            No cover image
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-neutral-800 p-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white transition hover:border-lime-400 hover:text-lime-400">
                        <Upload
                          size={15}
                        />

                        {coverUploading
                          ? "Uploading..."
                          : "Upload Cover Image"}

                        <input
                          type="file"
                          accept="image/*"
                          disabled={
                            coverUploading ||
                            actionLoading
                          }
                          onChange={
                            handleCoverUpload
                          }
                          className="hidden"
                        />
                      </label>

                      {coverImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setCoverImage(
                              ""
                            )
                          }
                          className="ml-3 text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                          cover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* =========================
                    BRANCHES
                ========================= */}

                <div>
                  <label className="mb-3 block text-sm text-neutral-400">
                    Link Branches
                  </label>

                  {branches.length ===
                  0 ? (
                    <div className="rounded-xl border border-neutral-800 bg-black p-4 text-sm text-neutral-600">
                      No branches
                      available.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {branches.map(
                        (
                          branch
                        ) => {
                          const active =
                            selectedBranches.includes(
                              branch.id
                            );

                          return (
                            <button
                              type="button"
                              key={
                                branch.id
                              }
                              onClick={() =>
                                toggleBranch(
                                  branch.id
                                )
                              }
                              disabled={
                                actionLoading
                              }
                              className={`rounded-xl border px-3 py-2 text-sm transition ${
                                active
                                  ? "border-lime-400 bg-lime-400 text-black"
                                  : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-600"
                              }`}
                            >
                              {
                                branch.name
                              }
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-neutral-600">
                    Select all branches
                    where this service is
                    available.
                  </p>
                </div>
              </div>
            </div>

            {/* MODAL ACTIONS */}

            <div className="flex justify-end gap-3 border-t border-neutral-800 px-5 py-4">
              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  actionLoading
                }
                className="rounded-xl bg-neutral-800 px-5 py-2.5 text-sm text-white transition hover:bg-neutral-700 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveService
                }
                disabled={
                  actionLoading ||
                  thumbnailUploading ||
                  coverUploading
                }
                className="rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? editingService
                    ? "Updating..."
                    : "Creating..."
                  : editingService
                  ? "Update Service"
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
