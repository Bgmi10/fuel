
"use client";

import { useState } from "react";

export const ContactForm = ({ open, setOpen }: any) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    preferredTimeToContact: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  // ---------------- VALIDATION ----------------
  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (!/^[0-9]{10}$/.test(form.phone))
      return "Enter valid 10-digit phone number";
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

      if (!res.ok || !data.success) {
        alert(data.message || "Failed to send your message");
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- SUCCESS UI ----------------
  if (success) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={() => {
            setOpen(false);
            setSuccess(false);
          }}
        />

        <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-lime-400 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lime-400/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-lime-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white">
            Message Sent!
          </h2>

          <p className="text-neutral-400 mt-3 text-sm">
            Thanks for contacting Fuel Gym.
            Our team will get back to you within 24 hours.
          </p>

          <button
            onClick={() => {
              setOpen(false);
              setSuccess(false);
              setForm({
                name: "",
                phone: "",
                email: "",
                message: "",
                preferredTimeToContact: "",
              });
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => setOpen(false)}
      />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-neutral-200 text-center">
          Contact Fuel Gym
        </h2>

        <p className="text-neutral-500 text-sm text-center mt-2">
          We’ll get back to you within 24 hours
        </p>

        <div className="mt-6 space-y-4">
          {/* Name */}
          <input
            type="text"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none"
          />

          {/* Phone */}
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value.replace(/\D/g, "").slice(0, 10),
              })
            }
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email (optional)"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none"
          />

          {/* Preferred Time to Contact */}
          <div>
            <label
              htmlFor="preferredTimeToContact"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Preferred Time to Contact You Back
              <span className="text-neutral-500 font-normal">
                {" "}(optional)
              </span>
            </label>

            <select
              id="preferredTimeToContact"
              value={form.preferredTimeToContact}
              onChange={(e) =>
                setForm({
                  ...form,
                  preferredTimeToContact: e.target.value,
                })
              }
              className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none"
            >
              <option value="">Select preferred time</option>
              <option value="MORNING">Morning (9 AM – 12 PM)</option>
              <option value="AFTERNOON">Afternoon (12 PM – 4 PM)</option>
              <option value="EVENING">Evening (4 PM – 8 PM)</option>
              <option value="ANYTIME">Anytime</option>
            </select>
          </div>

          {/* Message */}
          <textarea
            placeholder="Your Message..."
            rows={4}
            value={form.message}
            onChange={(e) =>
              setForm({ ...form, message: e.target.value })
            }
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none resize-none"
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-md bg-lime-400 text-black font-semibold hover:bg-lime-300 transition shadow-[0_0_25px_rgba(198,255,0,0.3)] disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
};
