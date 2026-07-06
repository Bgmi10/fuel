"use client";

import { useState, useEffect } from "react";
import { Menu, X, Bell, LogOut, ChevronDown, User, ShieldCheck, User2, CreditCard } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { memberNavItems } from "./member-nav";
import { Member } from "@prisma/client";


export const MemberHeader = ({ member }: {member: Member}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const data = await fetch("/api/member/logout");
      const res = await data.json();
      if (res.success) {
        router.push("/member/login");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const currentPage = memberNavItems.find(item => item.href === pathname)?.label || "Dashboard";

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden lg:flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
            <Bell size={20} className="text-gray-400" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-lime-400 rounded-full" />
          </button>

          {/* Profile Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setProfileOpen(true)}
            onMouseLeave={() => setProfileOpen(false)}
          >
            {/* Profile Button */}
            <button className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/5 px-3 py-2 hover:bg-white/[0.05] transition-all duration-300">
              {/* Avatar */}
              <div className="h-10 w-10 rounded-full overflow-hidden bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.15)]">
                {member?.profileImage ? (
                  <img
                    src={member.profileImage}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lime-400 font-bold text-lg">
                    {member?.name?.charAt(0) || "M"}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="hidden xl:block text-left leading-tight">
                <p className="text-sm font-medium text-white">
                  {member?.name || "Member"}
                </p>
                <p className="text-xs text-neutral-400">
                  Active Member
                </p>
              </div>

              <ChevronDown
                size={16}
                className={`text-neutral-500 transition-transform duration-300 ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown */}
            <div
              className={`absolute right-0 top-16 z-50 w-72 overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 shadow-[0_20px_80px_rgba(0,0,0,0.5)] transition-all duration-300 ${
                profileOpen
                  ? "opacity-100 translate-y-0 visible"
                  : "opacity-0 -translate-y-2 invisible"
              }`}
            >
              {/* User Info */}
              <div className="border-b border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full overflow-hidden bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                    {member?.profileImage ? (
                      <img
                        src={member.profileImage}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lime-400 text-xl font-bold">
                        {member?.name?.charAt(0) || "M"}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {member?.name || "Member"}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 break-all">
                      {member?.email || "member@fuelgym.com"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Membership Status */}
             

              {/* Actions */}
              <div className="p-3">
                <Link
                  href="/member/profile"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-white transition-all duration-300"
                >
                  <User size={18} />
                  Profile
                </Link>
                <Link
                  href="/member/membership"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-white transition-all duration-300"
                >
                  <CreditCard size={18} />
                  View Membership
                </Link>

                <button
                  onClick={handleLogout}
                  className="mt-1 w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-300"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-white/5">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <Menu size={20} className="text-white" />
        </button>

        <span className="text-white font-semibold">{currentPage}</span>


<div className="flex items-center gap-2 ">

<button className="flex items-center justify-center" onClick={() => {
  router.push('/member/profile')
}}>
  {member?.profileImage ? (
    <img
      src={member.profileImage}
      alt="Profile"
      className="w-8 h-8 rounded-full object-cover"
    />
  ) : (
    <User2 className="w-8 h-8 text-gray-500" />
  )}
</button>

        <button className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <Bell size={20} className="text-gray-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-lime-400 rounded-full" />
        </button>
</div>

      </header>

      {/* Mobile Menu Drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute left-0 top-0 h-full w-[280px] bg-neutral-950 border-r border-white/10 transform transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer Header */}
          <div className="p-6">
          <Link href="/member/dashboard" className="flex items-center gap-3">
              <img src="/logo.png" className="w-20"/>
          </Link>
        </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {memberNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200
                    ${
                      isActive
                        ? "bg-lime-400 text-black font-semibold"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <Icon size={20} className={isActive ? "text-black" : ""} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all duration-200"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};