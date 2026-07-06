"use client";

import { useAuth } from "@/app/contexts/MemberAuthContext";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const page = () => {
  const { user, loading, checkSession } =
    useAuth();

  const router = useRouter();

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

    const [form, setForm] = useState({
      name: "",
      dob: "",
      age: "",
      height: "",
      weight: "",
      gender: "",
      emergencyContact: "",
      profileImage: "",
      address: "",
    });

  useEffect(() => {
    if (
      user &&
      (
        user.address && user.dob && user.email && user.emergencyContact
         && user.gender &&
        user.phone &&
        user.profileImage && user.age && user.height && user.weight
      )
    ) {
      router.push('/member/complete-profile-1');
    }
  }, [user, router]);


  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        dob: user.dob || "",
        age: user.age?.toString() || "",
        height: user.height?.toString() || "",
        weight: user.weight?.toString() || "",
        gender: user.gender || "",
        emergencyContact: user.emergencyContact || "",
        profileImage: user.profileImage || "",
        address: user.address || "",
      });
    }
  }, [user]);

  const isComplete = useMemo(() => {
    return (
      form.name.trim() &&
      form.dob.trim() &&
      form.age.trim() &&
      form.height.trim() &&
      form.weight.trim() &&
      form.gender.trim() &&
      form.emergencyContact.trim() &&
      form.profileImage.trim() &&
      form.address.trim()
    );
  }, [form]);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const file = e.target.files?.[0];

      if (!file) return;

      setUploading(true);

      const formData = new FormData();

      formData.append("file", file);

      const res = await fetch(
        "/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (data.success) {
        setForm((prev) => ({
          ...prev,
          profileImage: data.url,
        }));
      }
    } catch (e) {
      console.log(e);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!isComplete) {
      alert(
        "Please complete all profile fields"
      );

      return;
    }

    try {
      setSaving(true);

      const res = await fetch(
        `/api/members/${user.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: form.name,
            dob: form.dob,
            age: parseInt(form.age),
            height: parseFloat(form.height),
            weight: parseFloat(form.weight),
            gender: form.gender,
            emergencyContact: form.emergencyContact,
            profileImage: form.profileImage,
            address: form.address,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        await checkSession();

        router.push(
          "/member/complete-profile-1"
        );
      } else {
        alert(
          "Failed to update profile"
        );
      }
    } catch (e) {
      console.log(e);

      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-5">

      {/* BG */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-lime-400/10 blur-[180px]" />

      </div>
      <div>
            <img src="/logo.png" alt="" className="lg:w-28 w-20"/>
        </div>
      <div className="relative z-10 max-w-3xl mx-auto">
      
        {/* TOP */}
        <div className="mb-8 text-center">


          <h1 className="text-xl md:text-3xl font-black leading-tight">

            Finish Setting Up
            <span className="block text-lime-400">
              Your Member Profile
            </span>

          </h1>

          <p className="text-neutral-400 mt-5 text-xs mx-auto leading-relaxed">

            Complete your profile to
            access your dashboard,
            invoices, subscriptions and
            membership details.

          </p>
        </div>

        {/* CARD */}
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 space-y-8">

          {/* PROFILE IMAGE */}
          <div className="flex flex-col items-center">

            <div className="relative group">

              <div className="h-36 w-36 rounded-full overflow-hidden border-4 border-white/10 bg-neutral-900">

                {form.profileImage ? (
                  <img
                    src={
                      form.profileImage
                    }
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl bg-neutral-800">
                    👤
                  </div>
                )}
              </div>

              {<label className="absolute inset-0 rounded-full bg-black/60 transition flex items-center justify-center cursor-pointer">

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={
                    handleUpload
                  }
                />

                <span className="text-sm font-semibold">
                  upload
                </span>
              </label>}
            </div>

            <p className="text-sm text-neutral-500 mt-4">
              Profile Image *
            </p>

            {uploading && (
              <p className="text-lime-400 text-sm mt-2">
                Uploading image...
              </p>
            )}
          </div>

          {/* FORM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* NAME */}
            <div className="space-y-2">

              <label className="text-sm text-neutral-400">
                Full Name *
              </label>

              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                placeholder="Enter full name"
                className="w-full h-14 px-4 rounded-2xl bg-neutral-900 border border-white/10 outline-none focus:border-lime-400 transition"
              />
            </div>

            {/* DOB */}
            <div className="space-y-2">

              <label className="text-sm text-neutral-400">
                Date of Birth *
              </label>

              <input
                type="date"
                value={form.dob}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dob: e.target.value,
                  })
                }
                className="w-full h-14 px-4 rounded-2xl bg-neutral-900 border border-white/10 outline-none focus:border-lime-400 transition [color-scheme:dark]"
              />
            </div>


            {/* AGE */}
<div className="space-y-2">
  <label className="text-sm text-neutral-400">
    Age *
  </label>

  <input
    type="number"
    min={1}
    value={form.age}
    onChange={(e) =>
      setForm({
        ...form,
        age: e.target.value,
      })
    }
    placeholder="Enter age"
    className="w-full h-14 px-4 rounded-2xl bg-neutral-900 border border-white/10 outline-none focus:border-lime-400 transition"
  />
</div>

{/* HEIGHT */}
<div className="space-y-2">
  <label className="text-sm text-neutral-400">
    Height (cm) *
  </label>

  <input
    type="number"
    step="0.1"
    value={form.height}
    onChange={(e) =>
      setForm({
        ...form,
        height: e.target.value,
      })
    }
    placeholder="170"
    className="w-full h-14 px-4 rounded-2xl bg-neutral-900 border border-white/10 outline-none focus:border-lime-400 transition"
  />
</div>

{/* WEIGHT */}
<div className="space-y-2">
  <label className="text-sm text-neutral-400">
    Weight (kg) *
  </label>

  <input
    type="number"
    step="0.1"
    value={form.weight}
    onChange={(e) =>
      setForm({
        ...form,
        weight: e.target.value,
      })
    }
    placeholder="75.5"
    className="w-full h-14 px-4 rounded-2xl bg-neutral-900 border border-white/10 outline-none focus:border-lime-400 transition"
  />
</div>

            {/* GENDER */}
            <div className="space-y-2">

              <label className="text-sm text-neutral-400">
                Gender *
              </label>

              <select
                value={form.gender}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gender:
                      e.target.value,
                  })
                }
                className="w-full h-14 px-4 rounded-2xl bg-neutral-900 border border-white/10 outline-none focus:border-lime-400 transition"
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

            {/* EMERGENCY */}
            <div className="space-y-2">

              <label className="text-sm text-neutral-400">
                Emergency Contact *
              </label>

              <input
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
                placeholder="Emergency phone number"
                className="w-full h-14 px-4 rounded-2xl bg-neutral-900 border border-white/10 outline-none focus:border-lime-400 transition"
              />
            </div>
          </div>

          {/* ADDRESS */}
          <div className="space-y-2">

            <label className="text-sm text-neutral-400">
              Address *
            </label>

            <textarea
              rows={5}
              value={form.address}
              onChange={(e) =>
                setForm({
                  ...form,
                  address:
                    e.target.value,
                })
              }
              placeholder="Enter your address"
              className="w-full p-4 rounded-2xl bg-neutral-900 border border-white/10 outline-none resize-none focus:border-lime-400 transition"
            />
          </div>

          {/* NOTICE */}
          {!isComplete && (
            <div className="border border-yellow-500/20 bg-yellow-500/10 rounded-2xl p-4">

              <p className="text-sm text-yellow-300 leading-relaxed">

                Please complete all
                required fields to
                continue to your member
                dashboard.

              </p>
            </div>
          )}

          {/* BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={
              !isComplete ||
              saving ||
              uploading
            }
            className="w-full h-14 rounded-2xl bg-lime-400 text-black font-bold text-lg hover:bg-lime-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Saving Profile..."
              : "Continue To Onboarding"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default page;