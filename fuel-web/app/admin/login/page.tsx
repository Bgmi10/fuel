"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const Page = () => {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!form.email || !form.password) {
      setError("Email and password required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Login failed");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      console.log(e);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6">

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            Admin Login
          </h1>

          <p className="text-sm text-neutral-500 mt-1">
            Login to manage Fuel Gym
          </p>
        </div>

        {/* EMAIL */}
        <div className="mb-4">
          <label className="text-sm text-neutral-400 block mb-2">
            Email
          </label>

          <input
            type="email"
            placeholder="Enter email"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white outline-none focus:border-lime-400"
          />
        </div>

        {/* PASSWORD */}
        <div className="mb-5">
          <label className="text-sm text-neutral-400 block mb-2">
            Password
          </label>

          <input
            type="password"
            placeholder="Enter password"
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white outline-none focus:border-lime-400"
          />
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* BUTTON */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 bg-lime-400 hover:opacity-90 transition rounded-lg text-black font-semibold"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
};

export default Page;