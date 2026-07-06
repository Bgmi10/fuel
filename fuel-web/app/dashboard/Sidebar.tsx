'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  MessageSquare,
  Settings,
  Users,
  Building2,
  Shield,
  Wrench,
  Book,
  TicketPercent,
  ClipboardCheck,
    Wallet2,
    CalendarX2,
} from "lucide-react";

const navItems = [
  {
    label: "Trial Bookings",
    href: "/dashboard/trials",
    icon: CalendarDays,
  },
  {
    label: "Contacts",
    href: "/dashboard/contacts",
    icon: MessageSquare,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    label: "Members",
    href: "/dashboard/members",
    icon: Users,
  },
  {
    label: "Manage Slots",
    href: "/dashboard/slots",
    icon: CalendarX2,
  },
  {
    label: "Staff Attendance",
    href: "/dashboard/attendance",
    icon: ClipboardCheck,
  },
  {
    label: "Branches",
    href: "/dashboard/branches",
    icon: Building2,
  },
  {
    label: "Payroll",
    href: "/dashboard/payroll",
    icon: Wallet2,
  },
  {
    label: "Staffs",
    href: "/dashboard/users",
    icon: Shield,
  },
  {
    label: "Blogs",
    href: "/dashboard/blogs",
    icon: Book,
  },
  {
    label: "Services",
    href: "/dashboard/services",
    icon: Wrench,
  },
  {
    label: "Coupons",
    href: "/dashboard/coupons",
    icon: TicketPercent,
  },
];


export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-neutral-950 border-r border-neutral-800 p-5 flex flex-col overflow-y-auto">

      {/* LOGO */}
      <div className="mb-10">
        <img src="/logo.png" className="w-20" />
      </div>

      {/* NAVIGATION */}
      <nav className="space-y-2">

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group relative flex items-center gap-3 overflow-hidden
                rounded-xl px-4 py-3 text-sm font-medium
                transition-all duration-300
                ${
                  isActive
                    ? " bg-neutral-900 text-lime-400"
                    : "text-neutral-300 hover:bg-neutral-900 hover:text-lime-400"
                }
              `}
            >

              {/* HOVER GLOW */}
              {!isActive && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-r from-lime-400/5 via-lime-400/10 to-transparent" />
              )}

              {/* ICON */}
              <Icon
                size={18}
                className={`relative z-10 transition-all duration-300 ${
                  isActive
                    ? "text-lime-400"
                    : "text-neutral-500 group-hover:text-lime-400"
                }`}
              />

              {/* TEXT */}
              <span className="relative z-10">
                {item.label}
              </span>

              {/* ACTIVE SIDE BAR */}
              {isActive && (
                <div className="absolute right-0 top-2 h-8 w-1 rounded-l-full bg-black/80" />
              )}

            </Link>
          );
        })}

      </nav>

    </aside>
  );
}