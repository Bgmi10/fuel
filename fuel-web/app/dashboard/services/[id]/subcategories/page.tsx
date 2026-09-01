"use client";

import type {
  Service,
  ServiceSubCategory,
} from "@prisma/client";

import {
  ArrowLeft,
  Edit,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";

type SubCategory = ServiceSubCategory;

const Page = () => {
  const params = useParams();
  const router = useRouter();

  const serviceId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const [service, setService] =
    useState<Service | null>(null);

  const [subCategories, setSubCategories] =
    useState<SubCategory[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingSubCategory, setEditingSubCategory] =
    useState<SubCategory | null>(null);

  /* =========================
     FORM STATE
  ========================= */

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [image, setImage] =
    useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [sortOrder, setSortOrder] =
    useState("0");

  const [isActive, setIsActive] =
    useState(true);

  /* =========================
     UPLOAD FILE
  ========================= */

  async function uploadFile(
    file: File
  ): Promise<string> {
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
  }

  /* =========================
     FETCH DATA
  ========================= */

  const fetchData = async () => {
    if (!serviceId) {
      return;
    }

    try {
      setLoading(true);

      const [
        serviceResponse,
        subCategoryResponse,
      ] = await Promise.all([
        fetch(
          `/api/services/${serviceId}`,
          {
            cache: "no-store",
          }
        ),

        fetch(
          `/api/services/${serviceId}/subcategories`,
          {
            cache: "no-store",
          }
        ),
      ]);

      const serviceData =
        await serviceResponse.json();

      const subCategoryData =
        await subCategoryResponse.json();

      setService(
        serviceData.service || null
      );

      if (!subCategoryData.success) {
        alert(
          subCategoryData.message ||
            "Failed to load subcategories"
        );

        return;
      }

      setSubCategories(
        subCategoryData.subCategories ||
          subCategoryData.subcategories ||
          []
      );
    } catch (error) {
      console.error(error);

      alert(
        "Failed to load subcategories"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [serviceId]);

  /* =========================
     RESET FORM
  ========================= */

  const resetForm = () => {
    setName("");
    setDescription("");
    setImage("");
    setImageFile(null);
    setImagePreview("");
    setSortOrder("0");
    setIsActive(true);
    setEditingSubCategory(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  /* =========================
     CREATE
  ========================= */

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  /* =========================
     EDIT
  ========================= */

  const openEdit = (
    subCategory: SubCategory
  ) => {
    setEditingSubCategory(
      subCategory
    );

    setName(
      subCategory.name
    );

    setDescription(
      subCategory.description || ""
    );

    setImage(
      subCategory.image || ""
    );

    setImageFile(null);

    setImagePreview(
      subCategory.image || ""
    );

    setSortOrder(
      String(
        subCategory.sortOrder
      )
    );

    setIsActive(
      subCategory.isActive
    );

    setModalOpen(true);
  };

  /* =========================
     IMAGE SELECT
  ========================= */

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    /*
     * Optional client-side validation.
     */

    if (!file.type.startsWith("image/")) {
      alert(
        "Please select a valid image file."
      );

      event.target.value = "";

      return;
    }

    /*
     * 5MB limit.
     * Change this if your upload API
     * allows a different size.
     */

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      alert(
        "Image size must be less than 5MB."
      );

      event.target.value = "";

      return;
    }

    setImageFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(
      previewUrl
    );
  };

  /* =========================
     REMOVE IMAGE
  ========================= */

  const removeImage = () => {
    setImage("");

    setImageFile(null);

    setImagePreview("");
  };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit = async () => {
    if (!serviceId) {
      return;
    }

    const normalizedName =
      name.trim();

    const normalizedDescription =
      description.trim();

    const order =
      Number(sortOrder);

    if (!normalizedName) {
      alert(
        "Subcategory name is required"
      );

      return;
    }

    if (
      !Number.isInteger(order) ||
      order < 0
    ) {
      alert(
        "Sort order must be a positive whole number or zero"
      );

      return;
    }

    setActionLoading(true);

    try {
      /*
       * Upload a new image only if
       * the user selected one.
       *
       * If editing and no new image
       * was selected, the existing
       * image URL remains unchanged.
       */

      let imageUrl =
        image || null;

      if (imageFile) {
        imageUrl =
          await uploadFile(
            imageFile
          );
      }

      const payload = {
        name: normalizedName,

        description:
          normalizedDescription ||
          null,

        image: imageUrl,

        sortOrder: order,

        isActive,
      };

      const endpoint =
        editingSubCategory
          ? `/api/services/${serviceId}/subcategories/${editingSubCategory.id}`
          : `/api/services/${serviceId}/subcategories`;

      const response =
        await fetch(
          endpoint,
          {
            method:
              editingSubCategory
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

      if (!data.success) {
        alert(
          data.message ||
            "Failed to save subcategory"
        );

        return;
      }

      closeModal();

      await fetchData();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================
     DELETE
  ========================= */

  const deleteSubCategory =
    async (
      subCategoryId: string
    ) => {
      if (!serviceId) {
        return;
      }

      const confirmed =
        window.confirm(
          "Delete this subcategory? Any schedules associated with it may also be affected."
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await fetch(
            `/api/services/${serviceId}/subcategories/${subCategoryId}`,
            {
              method: "DELETE",
            }
          );

        const data =
          await response.json();

        if (!data.success) {
          alert(
            data.message ||
              "Failed to delete subcategory"
          );

          return;
        }

        await fetchData();
      } catch (error) {
        console.error(error);

        alert(
          "Failed to delete subcategory"
        );
      }
    };

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="p-6">
      {/* =========================
          HEADER
      ========================= */}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 transition hover:border-lime-400 hover:text-lime-400"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-white">
              {service?.name ||
                "Service"}
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Manage subcategories for
              this service
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
        >
          <Plus size={16} />
          Add Subcategory
        </button>
      </div>

      {/* =========================
          LIST
      ========================= */}

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        {loading ? (
          <div className="p-6 text-sm text-neutral-500">
            Loading subcategories...
          </div>
        ) : subCategories.length ===
          0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800 text-neutral-500">
              <GripVertical size={24} />
            </div>

            <h2 className="mt-4 text-sm font-semibold text-white">
              No subcategories yet
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Create your first
              subcategory for this
              service.
            </p>

            <button
              type="button"
              onClick={openCreate}
              className="mt-5 rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
            >
              Create Subcategory
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {subCategories.map(
              (
                subCategory
              ) => (
                <div
                  key={
                    subCategory.id
                  }
                  className="flex flex-col justify-between gap-5 p-5 transition hover:bg-neutral-900/80 md:flex-row md:items-center"
                >
                  {/* LEFT */}
                  <div className="flex min-w-0 items-start gap-4">
                    {/* IMAGE */}

                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-800 bg-black">
                      {subCategory.image ? (
                        <img
                          src={
                            subCategory.image
                          }
                          alt={
                            subCategory.name
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

                    {/* DRAG ICON */}

                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-500">
                      <GripVertical
                        size={17}
                      />
                    </div>

                    {/* CONTENT */}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-white">
                          {
                            subCategory.name
                          }
                        </h2>

                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-medium ${
                            subCategory.isActive
                              ? "border-green-500/20 bg-green-500/10 text-green-400"
                              : "border-red-500/20 bg-red-500/10 text-red-400"
                          }`}
                        >
                          {subCategory.isActive
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>

                        <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-1 text-[10px] text-neutral-400">
                          ORDER{" "}
                          {
                            subCategory.sortOrder
                          }
                        </span>
                      </div>

                      {subCategory.description && (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
                          {
                            subCategory.description
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/services/${serviceId}/subcategories/${subCategory.id}/schedules`
                        )
                      }
                      className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-400 transition hover:bg-violet-500/20"
                    >
                      Schedules
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openEdit(
                          subCategory
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20"
                    >
                      <Edit size={13} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteSubCategory(
                          subCategory.id
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
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingSubCategory
                    ? "Edit Subcategory"
                    : "Add Subcategory"}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  Configure the service
                  subcategory.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={
                  actionLoading
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL FORM */}

            <div className="overflow-y-auto">
              <form
                className="space-y-5 px-5 py-5"
                onSubmit={(event) => {
                  event.preventDefault();

                  handleSubmit();
                }}
              >
                {/* NAME */}

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Subcategory Name
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="Example: Personal Training"
                    disabled={
                      actionLoading
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
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
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="Describe this subcategory..."
                    disabled={
                      actionLoading
                    }
                    className="min-h-[100px] w-full resize-none rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                  />
                </div>

                {/* IMAGE */}

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Subcategory Image
                  </label>

                  <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                    {imagePreview ? (
                      <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                        <img
                          src={
                            imagePreview
                          }
                          alt="Subcategory preview"
                          className="h-48 w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={
                            removeImage
                          }
                          disabled={
                            actionLoading
                          }
                          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 bg-black/80 text-red-400 backdrop-blur transition hover:bg-red-500/20 disabled:opacity-50"
                        >
                          <X
                            size={16}
                          />
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950 px-5 py-8 transition hover:border-lime-400/50 hover:bg-zinc-900">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-neutral-500">
                          <Upload
                            size={21}
                          />
                        </div>

                        <p className="mt-3 text-sm font-medium text-white">
                          Upload Image
                        </p>

                        <p className="mt-1 text-xs text-neutral-600">
                          PNG, JPG, WEBP up to
                          5MB
                        </p>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={
                            handleImageChange
                          }
                          disabled={
                            actionLoading
                          }
                          className="hidden"
                        />
                      </label>
                    )}

                    {imagePreview && (
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-neutral-500">
                            {imageFile
                              ? imageFile.name
                              : "Existing image"}
                          </p>

                          {imageFile && (
                            <p className="mt-1 text-[11px] text-neutral-700">
                              Image will be
                              uploaded when you
                              save.
                            </p>
                          )}
                        </div>

                        <label className="shrink-0 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-lime-400 hover:text-lime-400">
                          Change Image

                          <input
                            type="file"
                            accept="image/*"
                            onChange={
                              handleImageChange
                            }
                            disabled={
                              actionLoading
                            }
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* SORT ORDER */}

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    Sort Order
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(
                        event.target.value
                      )
                    }
                    disabled={
                      actionLoading
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400 disabled:opacity-50"
                  />

                  <p className="mt-1.5 text-xs text-neutral-600">
                    Lower numbers appear
                    first.
                  </p>
                </div>

                {/* ACTIVE */}

                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black px-4 py-3">
                  <div>
                    <p className="text-sm text-white">
                      Active Subcategory
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Active subcategories
                      are available to
                      customers.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) =>
                      setIsActive(
                        event.target.checked
                      )
                    }
                    disabled={
                      actionLoading
                    }
                    className="h-5 w-5 accent-lime-400"
                  />
                </div>

                {/* ACTIONS */}

                <div className="flex justify-end gap-3 border-t border-zinc-800 pt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={
                      actionLoading
                    }
                    className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm text-white transition hover:bg-zinc-700 disabled:opacity-50"
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
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {editingSubCategory
                          ? "Update Subcategory"
                          : "Create Subcategory"}
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
