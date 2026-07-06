"use client";

import { Branch, Member } from "@prisma/client";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  member?: Member | null;
  onSuccess?: () => void;
};

export const MemberModal = ({
  open,
  setOpen,
  member,
  onSuccess,
}: Props) => {
  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] =
    useState(false);

const [form, setForm] = useState({
  name: "",
  phone: "",
  branchId: "",
  email: "",
  dob: "",
  age: "",
  height: "",
  weight: "",
  gender: "",
  emergencyContact: "",
  profileImage: "",
  address: "",
});

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const fetchBranches = async () => {
    try {
      const res = await fetch(
        "/api/branches"
      );

      const data = await res.json();

      setBranches(data.branches);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name || "",
        phone: member.phone || "",
        email: member.email || "",
        branchId: member.branchId || "",
        dob: member.dob || "",
        age: member?.age?.toString() || "",
height: member?.height?.toString() || "",
weight: member?.weight?.toString() || "",
        gender: member.gender || "",
        emergencyContact:
          member.emergencyContact || "",
        profileImage:
          member.profileImage || "",
        address: member.address || "",
      });
    } else {
      setForm({
        name: "",
        phone: "",
        branchId: "",
        email: "",
        dob: "",
        age: "",
        height: "",
        weight: "",
        gender: "",
        emergencyContact: "",
        profileImage: "",
        address: "",
      });
    }

    fetchBranches();
  }, [member]);

  if (!open) return null;

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const file = e.target.files?.[0];

      if (!file) return;

      setUploading(true);

      const formData = new FormData();

      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setForm((prev) => ({
          ...prev,
          profileImage: data.url,
        }));
      } else {
        alert("Image upload failed");
      }
    } catch (error) {
      console.log(error);

      alert("Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !form.name ||
      !form.phone ||
      !form.email ||
      !form.branchId
    ) {
      alert(
        "Please fill all required fields"
      );

      return;
    }

    try {
      setLoading(true);

      const url = member
        ? `/api/members/${member.id}`
        : `/api/members`;

      const method = member
        ? "PUT"
        : "POST";

      const data = await fetch(url, {
        method,

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(form),
      });
      const res = await data.json();

      if (res.success) {
        console.log("success");
      
        if (onSuccess) {
          console.log("calling onSuccess");
          onSuccess();
        }
      
        setOpen(false);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto">

        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-neutral-900/95 backdrop-blur-xl border-b border-neutral-800 px-6 py-5 flex items-center justify-between">

          <div>
            <h2 className="text-2xl font-bold text-white">
              {member
                ? "Edit Member"
                : "Add Member"}
            </h2>

            <p className="text-sm text-neutral-500 mt-1">
              Manage member details
              and profile information
            </p>
          </div>

          <button
            onClick={() =>
              setOpen(false)
            }
            className="h-10 w-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pt-5">

</div>

        <div className="p-6 space-y-6">

          {/* PROFILE IMAGE */}
          <div className="flex flex-col items-center justify-center">

            <div className="relative">

              <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-neutral-800 bg-neutral-800 flex items-center justify-center">

                {form.profileImage ? (
                  <img
                    src={
                      form.profileImage
                    }
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-5xl">
                    👤
                  </div>
                )}
              </div>

              <label className="absolute bottom-1 right-1 h-10 w-10 rounded-full bg-lime-400 text-black flex items-center justify-center cursor-pointer font-bold shadow-lg hover:scale-105 transition">
                +

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={
                    handleImageUpload
                  }
                />
              </label>
            </div>

            <p className="text-sm text-neutral-400 mt-4">
              Upload Profile Image
            </p>

            {uploading && (
              <p className="text-sm text-lime-400 mt-2">
                Uploading image...
              </p>
            )}
          </div>

          {/* BASIC INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* NAME */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-400">
                Full Name{" "}
                <span className="text-red-400">
                  *
                </span>
              </label>

              <input
                placeholder="Enter full name"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-lime-400 transition"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name:
                      e.target.value,
                  })
                }
              />
            </div>

            {/* PHONE */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-400">
                Phone Number{" "}
                <span className="text-red-400">
                  *
                </span>
              </label>

              <input
                placeholder="Enter phone number"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-lime-400 transition"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone:
                      e.target.value,
                  })
                }
              />
            </div>

            {/* EMAIL */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-400">
                Email Address{" "}
                <span className="text-red-400">
                  *
                </span>
              </label>

              <input
                placeholder="Enter email"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-lime-400 transition"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email:
                      e.target.value,
                  })
                }
              />
            </div>

            {/* BRANCH */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-400">
                Branch{" "}
                <span className="text-red-400">
                  *
                </span>
              </label>

              <select
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-lime-400 transition"
                value={form.branchId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    branchId:
                      e.target.value,
                  })
                }
              >
                <option value="">
                  Select Branch
                </option>

                {branches.map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                  >
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* DOB */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-400">
                Date of Birth
              </label>

              <input
                type="date"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-lime-400 transition [color-scheme:dark]"
                value={form.dob}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dob:
                      e.target.value,
                  })
                }
              />
            </div>


            <div className="space-y-2">
  <label className="text-sm text-neutral-400">
    Age
  </label>

  <input
    type="number"
    value={form.age}
    onChange={(e) =>
      setForm({
        ...form,
        age: e.target.value,
      })
    }
    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl"
  />
</div>

<div className="space-y-2">
  <label className="text-sm text-neutral-400">
    Height (cm)
  </label>

  <input
    type="number"
    value={form.height}
    onChange={(e) =>
      setForm({
        ...form,
        height: e.target.value,
      })
    }
    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl"
  />
</div>

<div className="space-y-2">
  <label className="text-sm text-neutral-400">
    Weight (kg)
  </label>

  <input
    type="number"
    value={form.weight}
    onChange={(e) =>
      setForm({
        ...form,
        weight: e.target.value,
      })
    }
    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl"
  />
</div>

            {/* GENDER */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-400">
                Gender
              </label>

              <select
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-lime-400 transition"
                value={form.gender}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gender:
                      e.target.value,
                  })
                }
              >
                <option value="">
                  Select Gender
                </option>

                <option value="Male">
                  Male
                </option>

                <option value="Female">
                  Female
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>
          </div>

          {/* EMERGENCY CONTACT */}
          <div className="space-y-2">
            <label className="text-sm text-neutral-400">
              Emergency Contact
            </label>

            <input
              placeholder="Emergency contact number"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:border-lime-400 transition"
              value={
                form.emergencyContact
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  emergencyContact:
                    e.target.value,
                })
              }
            />
          </div>

          {/* ADDRESS */}
          <div className="space-y-2">
            <label className="text-sm text-neutral-400">
              Address
            </label>

            <textarea
              placeholder="Enter address"
              className="w-full min-h-[120px] px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none resize-none focus:border-lime-400 transition"
              value={form.address}
              onChange={(e) =>
                setForm({
                  ...form,
                  address:
                    e.target.value,
                })
              }
            />
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col md:flex-row gap-3 pt-3">

            <button
              onClick={handleSubmit}
              disabled={
                loading || uploading
              }
              className="flex-1 py-3 rounded-xl bg-lime-400 text-black font-semibold hover:bg-lime-300 transition disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : member
                ? "Update Member"
                : "Create Member"}
            </button>

            <button
              onClick={() =>
                setOpen(false)
              }
              className="flex-1 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 transition"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>

  );
};