"use client";

import { useState } from "react";

export const BookTrialForm = ({ open, setOpen }: any) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    goal: "",
    time: "",
  });

  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  // ---------------- VALIDATION ----------------
  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (!form.phone.match(/^[0-9]{10}$/)) return "Enter valid 10-digit phone number";
    if (!form.goal) return "Please select a fitness goal";
    if (!form.time) return "Please select preferred time";
    return null;
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- SUCCESS UI ----------------
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">

        {/* Blur Background */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={() => {
            setOpen(false);
            setSuccess(false);
          }}
        />

        {/* Success Card */}
        <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-lime-400 rounded-2xl p-8 text-center shadow-2xl">

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-lime-400/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-lime-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white">
            Request Submitted!
          </h2>

          <p className="text-neutral-400 mt-3 text-sm">
            Your free trial request has been received.  
            Our Fuel Gym team will contact you on WhatsApp 💪
          </p>

          <button
            onClick={() => {
              setOpen(false);
              setSuccess(false);
            }}
            className="mt-6 px-6 py-2 bg-lime-400 text-black rounded-md font-semibold hover:bg-lime-300"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ---------------- FORM UI ----------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      {/* Blur Background */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => setOpen(false)}
      />

      {/* Form Card */}
      <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">

        {/* Title */}
        <h2 className="text-2xl font-bold text-neutral-200 text-center">
          Book Free Trial
        </h2>

        <p className="text-neutral-500 text-sm text-center mt-2">
          Start your transformation at Fuel Gym
        </p>

        {/* Form */}
        <div className="mt-6 space-y-4">

          {/* Name */}
          <input
            type="text"
            placeholder="Full Name"
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          {/* Phone */}
          <input
            type="text"
            placeholder="Phone Number"
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          {/* Goal */}
          <select
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400"
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
          >
            <option value="">Select Fitness Goal</option>
            <option value="FAT_LOSS">Fat Loss</option>
            <option value="MUSCLE_GAIN">Muscle Gain</option>
            <option value="STRENGTH">Strength Training</option>
            <option value="GENERAL_FITNESS">General Fitness</option>
          </select>

          {/* Time */}
          <select
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          >
            <option value="">Select Preferred Time</option>
            <option value="MORNING">Morning</option>
            <option value="AFTERNOON">Afternoon</option>
            <option value="EVENING">Evening</option>
          </select>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-md bg-lime-400 text-black font-semibold
                       hover:bg-lime-300 transition
                       shadow-[0_0_20px_rgba(198,255,0,0.3)]
                       disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
};