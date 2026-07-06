"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NutritionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Your Plan",
      href: "/member/nutrition/diet-plans",
    },
    {
      name: "Food Tracker",
      href: "/member/nutrition/food-tracker",
    },
  ];

  return (
    <div className="space-y-6 pb-6">

    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
  
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Nutrition
          </h1>
  
          <p className="mt-2 text-neutral-400">
            Manage your meal plans and track your daily nutrition.
          </p>
        </div>
      </div>
  
      <div className="mt-6 flex gap-3">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href ||
              (tab.href !== "/member/nutrition" &&
                pathname.startsWith(tab.href));

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition-all ${
                  active
                    ? "bg-lime-400 text-black shadow-lg shadow-lime-400/20"
                    : "bg-white/[0.04] text-neutral-400 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {tab.name}

              </Link>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>
    </div>
  );
}