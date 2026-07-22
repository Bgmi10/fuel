"use client";

import Link from "next/link";
import { usePathname, } from "next/navigation";
import { memberNavItems } from "./member-nav";

export const MemberSidebar = () => {
  const pathname = usePathname();


  return (
    <aside
  className="
    fixed
    bottom-0
    left-0
    top-[var(--member-portal-offset)]
    z-40
    hidden
    w-[280px]
    flex-col
    overflow-y-auto
    border-r border-slate-800
    bg-slate-950
    transition-[top]
    duration-300
    lg:flex
  "
>
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl border-r border-white/10" />
      
      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Logo */}
        <div className="p-6">
          <Link href="/member/dashboard" className="flex items-center gap-3">
              <img src="/logo.png" className="w-20"/>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 pb-6">
          <div className="space-y-1">
            {memberNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
          </div>
        </nav>

       
      </div>
    </aside>
  );
};