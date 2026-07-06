"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MemberSidebar } from "./MemberSidebar";
import { MemberHeader } from "./MemberHeader";
import { useAuth } from "@/app/contexts/MemberAuthContext";

export default function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: member, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !member) {
      router.push("/member/login");
    }
  }, [loading, member, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-lime-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Desktop Sidebar */}
      <MemberSidebar />

      {/* Main Content Area */}
      <div className="lg:pl-[280px]">
        {/* Header */}
        <MemberHeader member={member} />

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {/* Background gradient effect */}
          <div className="fixed inset-0 bg-gradient-to-br from-lime-400/5 via-transparent to-green-400/5 pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}