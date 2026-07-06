"use client";

import { useState } from "react";

export const ContactForm = ({ open, setOpen }: any) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  // ---------------- VALIDATION ----------------
  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (!form.phone.match(/^[0-9]{10}$/)) return "Enter valid 10-digit phone number";
    if (!form.message.trim()) return "Message cannot be empty";
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

      const res = await fetch("/api/contact", {
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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">

        {/* Blur */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={() => {
            setOpen(false);
            setSuccess(false);
          }}
        />

        {/* Success Card */}
        <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-lime-400 rounded-2xl p-8 text-center shadow-2xl">

          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lime-400/20 flex items-center justify-center">
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

          <h2 className="text-2xl font-bold text-white">
            Message Sent!
          </h2>

          <p className="text-neutral-400 mt-3 text-sm">
            Thanks for contacting Fuel Gym 💪  
            Our team will get back to you within 24 hours.
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">

      {/* Blur background */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => setOpen(false)}
      />

      {/* Form Card */}
      <div className="relative z-10 w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">

        {/* Title */}
        <h2 className="text-2xl font-bold text-neutral-200 text-center">
          Contact Fuel Gym
        </h2>

        <p className="text-neutral-500 text-sm text-center mt-2">
          We’ll get back to you within 24 hours
        </p>

        {/* Form */}
        <div className="mt-6 space-y-4">

          {/* Name */}
          <input
            type="text"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none"
          />

          {/* Phone */}
          <input
            type="text"
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email (optional)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none"
          />

          {/* Message */}
          <textarea
            placeholder="Your Message..."
            rows={4}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none resize-none"
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-md bg-lime-400 text-black font-semibold
                       hover:bg-lime-300 transition
                       shadow-[0_0_25px_rgba(198,255,0,0.3)]
                       disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>

        </div>
      </div>
    </div>
  );
};