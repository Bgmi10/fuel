'use client'

import { useState } from "react";
import { ChevronDown, LogOut, ScanBarcode, ShieldCheck, User } from "lucide-react";
import { AdminAuthProvider, useAuth } from "../contexts/AdminAuthContext";
import Sidebar from "./Sidebar";
import { useRouter } from "next/navigation";

function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter()

  return (
    <header className="h-16 border-b border-neutral-800 bg-neutral-950 px-6 flex items-center justify-end">


      <div className="flex gap-2 items-center">

<button className="bg-lime-400 text-black flex items-center gap-1 p-2 cursor-pointer font-bold rounded-lg" onClick={() => {
  window.location.href = '/scanner'
}}>
          Attendance Scanner <ScanBarcode />
        </button>

      
      <div
        className="relative"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >


        {/* PROFILE BUTTON */}
        <button className="flex items-center gap-3 rounded-xl bg-neutral-900/70 px-3 py-2 hover:border-lime-400/40 hover:bg-neutral-900 transition-all duration-300">

          {/* AVATAR */}
          <div className="h-10 w-10 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.15)]">
            <User size={18} className="text-lime-400" />
          </div>

          {/* INFO */}
          <div className="text-left leading-tight">
            <p className="text-sm font-medium text-white">
              {user?.name || "Admin"}
            </p>

            <p className="text-xs text-neutral-400">
              {user?.role || "Administrator"}
            </p>
          </div>

          <ChevronDown
            size={16}
            className={`text-neutral-400 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />

        </button>

        {/* DROPDOWN */}
        <div
          className={`z-50 absolute right-0 top-16 w-72 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/40 transition-all duration-300 ${
            open
              ? "opacity-100 translate-y-0 visible"
              : "opacity-0 -translate-y-2 invisible"
          }`}
        >

          {/* TOP */}
          <div className="border-b border-neutral-800 bg-neutral-900/40 p-5">

            <div className="flex items-center gap-4">

              <div className="h-14 w-14 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                <User size={24} className="text-lime-400" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white">
                  {user?.name || "Admin User"}
                </h3>

                <p className="text-xs text-neutral-400 mt-1 break-all">
                  {user?.email || "admin@example.com"}
                </p>
              </div>

            </div>

          </div>

          {/* ROLE */}
          <div className="px-5 py-4 border-b border-neutral-800">

            <div className="flex items-center gap-3 text-sm">
              <ShieldCheck size={18} className="text-lime-400" />

              <div>
                <p className="text-neutral-400 text-xs">
                  Role
                </p>

                <p className="text-white font-medium">
                  {user?.role || "Administrator"}
                </p>
              </div>
            </div>

          </div>

          {/* ACTIONS */}
          <div className="p-3">

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-300"
            >
              <LogOut size={18} />
              Logout
            </button>

          </div>

        </div>

      </div>

      </div>


    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>

      <div className="flex h-screen bg-black text-white overflow-hidden">

        {/* SIDEBAR */}
       <Sidebar />

        {/* RIGHT SIDE */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* HEADER */}
          <Header />

          {/* MAIN */}
          <main className="flex-1 overflow-y-auto bg-black p-6">
            {children}
          </main>

        </div>

      </div>

    </AdminAuthProvider>
  );
}