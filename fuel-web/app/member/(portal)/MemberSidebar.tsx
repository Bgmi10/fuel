"use client";

import Link from "next/link";
import { usePathname, } from "next/navigation";
import { memberNavItems } from "./member-nav";

export const MemberSidebar = () => {
  const pathname = usePathname();


  return (
    <aside className="hidden lg:flex flex-col w-[280px] h-screen fixed left-0 top-0 z-40">
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