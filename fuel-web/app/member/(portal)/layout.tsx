"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { MemberSidebar } from "./MemberSidebar";
import { MemberHeader } from "./MemberHeader";

import { useAuth } from "@/app/contexts/MemberAuthContext";


export default function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user: member,
    loading,
  } = useAuth();

  const [mobileSidebarOpen, setMobileSidebarOpen] =
  useState(false);
  const router = useRouter();


  useEffect(() => {
    if (!loading && !member) {
      router.replace("/member/login");
    }
  }, [loading, member, router]);



  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-lime-400 border-t-transparent" />

          <p className="text-slate-300">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!member) {
    return null;
  }


  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
    >
     

      {/* Pushes the complete portal below the fixed banner */}
      <div
        className="
          min-h-screen
          pt-[var(--member-portal-offset)]
          transition-[padding-top]
          duration-300
        "
      >
         <MemberSidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() =>
          setMobileSidebarOpen(false)
        }
      />

        <div className="lg:pl-[280px]">
          <MemberHeader member={member}   mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} />

          <main className="relative p-4 lg:p-8">
            <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-lime-400/5 via-transparent to-green-400/5" />

            <div className="relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}