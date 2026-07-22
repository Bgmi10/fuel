"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Book,
  Building2,
  CalendarDays,
  CalendarX2,
  ClipboardCheck,
  MessageSquare,
  MonitorPlay,
  Settings,
  Shield,
  TicketPercent,
  Users,
  Video,
  ListChecks,
  Wallet2,
  Wrench,
  CalendarClock,
  LayoutDashboard,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Gym Management",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
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
    ],
  },
  {
    label: "Workout Broadcasting",
  
        items: [
          {
            label: "Fuel TV",
            href: "/dashboard/tv",
            icon: MonitorPlay,
          },
          {
            label: "Workout Videos",
            href: "/dashboard/workout-videos",
            icon: Video,
          },
          {
            label: "Workout Programs",
            href: "/dashboard/workout-programs",
            icon: ListChecks,
          },
          {
            label: "Broadcast Schedule",
            href: "/dashboard/workout-schedules",
            icon: CalendarClock,
          },
    ],
  },
  {
    label: "Administration",
    items: [
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
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col overflow-y-auto border-r border-neutral-800 bg-neutral-950 p-5">
      <div className="mb-8">
        <img
          src="/logo.png"
          alt="Fuel Gym"
          className="w-20"
        />
      </div>

      <nav className="space-y-7">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">
              {section.label}
            </p>

            <div className="space-y-2">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href;

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
                          ? "bg-neutral-900 text-lime-400"
                          : "text-neutral-300 hover:bg-neutral-900 hover:text-lime-400"
                      }
                    `}
                  >
                    {!isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-lime-400/5 via-lime-400/10 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
                    )}

                    <Icon
                      size={18}
                      className={`relative z-10 transition-all duration-300 ${
                        isActive
                          ? "text-lime-400"
                          : "text-neutral-500 group-hover:text-lime-400"
                      }`}
                    />

                    <span className="relative z-10">
                      {item.label}
                    </span>

                    {isActive && (
                      <div className="absolute right-0 top-2 h-8 w-1 rounded-l-full bg-lime-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}