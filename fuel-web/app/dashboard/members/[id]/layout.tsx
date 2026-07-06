// app/dashboard/members/[id]/layout.tsx
"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { id } = useParams()

  const base = `/dashboard/members/${id}`;

  const tabs = [
    { name: "Overview", href: base },
    { name: "Memberships", href: `${base}/memberships` },
    { name: "Assessments", href: `${base}/assessments` },
    { name: "Workout", href: `${base}/workout-plans` },
    { name: "Diet", href: `${base}/diet-plans` },
    { name: "Referrals", href: `${base}/referrals` },
  ];

  return (
    <div className="p-6 space-y-6">

      {/* TABS */}
      <div className="flex gap-2 flex-wrap border-b border-white/10 pb-3">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 rounded-xl text-sm transition ${
                active
                  ? "bg-lime-400 text-black font-semibold"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      {/* PAGE CONTENT */}
      <div>{children}</div>
    </div>
  );
}