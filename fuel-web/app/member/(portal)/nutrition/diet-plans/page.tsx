"use client";

import { useEffect, useState } from "react";
import {
  Apple,
  Calendar,
  Flame,
  Beef,
  Wheat,
  Droplets,
  ChefHat,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/app/contexts/MemberAuthContext";
import { formatDate } from "@/app/utils/helper";

export default function MemberDietPlanPage() {
  const { user: member } = useAuth();

  const [loading, setLoading] =
    useState(true);

  const [plan, setPlan] =
    useState<any>(null);

  useEffect(() => {
    if (member?.id) {
      loadPlan();
    }
  }, [member?.id]);

  const loadPlan = async () => {
    try {
      const res = await fetch(
        `/api/member/diet/active?memberId=${member?.id}`
      );

      const data =
        await res.json();

      setPlan(data.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="bg-slate-800/70 border border-slate-700 rounded-3xl p-10 text-center">
        <Apple
          size={60}
          className="mx-auto text-neutral-600"
        />

        <h2 className="text-2xl font-bold mt-5">
          No Nutrition Plan Yet
        </h2>

        <p className="text-gray-300 mt-3">
          Your coach hasn't assigned a
          nutrition plan yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* HERO */}

      <div className="border border-slate-700 rounded-3xl p-5">
  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 text-lime-400 text-xs font-medium mb-3">
        Active Nutrition Plan
      </div>

      <h1 className="text-3xl font-bold text-white">
        {plan.title}
      </h1>

      <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <Calendar size={15} />
          <span>From</span>
          <span>
             {formatDate(plan.startDate)}
          </span>
        </div>
<span> To</span>
        <div>
         {
          formatDate(plan.endDate)
         }
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 min-w-[320px]">

      <div className="bg-black/20 rounded-2xl p-4">
        <p className="text-xs text-gray-400">
          Daily Calories
        </p>

        <p className="text-2xl font-bold text-lime-400 mt-1">
          {plan.targetCalories}
        </p>

        <p className="text-xs text-gray-400">
          kcal target
        </p>
      </div>

      <div className="bg-black/20 rounded-2xl p-4">
        <p className="text-xs text-gray-400">
          Meals
        </p>

        <p className="text-2xl font-bold mt-1">
          {plan.meals.length}
        </p>

        <p className="text-xs text-gray-400">
          scheduled
        </p>
      </div>

    </div>
  </div>

  {plan.instructions && (
    <div className="mt-6 pt-6 border-t border-slate-700">
      <div className="flex gap-3">

        <ChefHat
          size={18}
          className="text-lime-400 mt-1"
        />

        <div>
          <h3 className="font-medium mb-2">
            Coach Instructions
          </h3>

          <p className="text-sm text-gray-300 leading-relaxed">
            {plan.instructions}
          </p>
        </div>
      </div>
    </div>
  )}
</div>

      {/* DAILY TARGETS */}

      <div className="border bg-black/20 border-slate-700 rounded-3xl p-5">
        <h2 className="text-xl font-semibold mb-4 text-white">
          🎯 Daily Nutrition Goal
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <NutritionCard
            icon={<Flame size={20} />}
            title="Calories"
            value={plan.targetCalories}
            unit="kcal"
          />

          <NutritionCard
            icon={<Beef size={20} />}
            title="Protein"
            value={plan.targetProtein}
            unit="g"
          />

          <NutritionCard
            icon={<Wheat size={20} />}
            title="Carbs"
            value={plan.targetCarbs}
            unit="g"
          />

          <NutritionCard
            icon={<Droplets size={20} />}
            title="Fat"
            value={plan.targetFat}
            unit="g"
          />
        </div>  
      </div>

      {/* MEALS */}

      <div>
        <h2 className="text-xl font-semibold mb-4 text-white">
          🍽️ Your Daily Meals
        </h2>

        <div className="space-y-5">
          {plan.meals.map(
            (meal: any, index: number) => (
              <div
                key={meal.id}
                className="border border-slate-700 rounded-3xl overflow-hidden"
              >
                <div className="p-5 border-b border-slate-700">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {meal.name}
                      </h3>

                      <p className="text-sm text-gray-300">
                        Meal {index + 1}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-lime-400">
                        {
                          meal.totals
                            .calories.toFixed(1)
                        }
                      </div>

                      <div className="text-xs text-gray-400">
                        calories
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile View */}
<div className="md:hidden space-y-3">
  {meal.items.map((item: any) => (
    <div
      key={item.id}
      className=" border border-slate-700 rounded-2xl p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-sm truncate text-white">
            {item.foodName}
          </h4>

          <p className="text-xs text-gray-300 mt-1">
            {item.quantity} {item.servingUnit}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="font-semibold text-sm">
            {item.calories}
          </p>
          <p className="text-[11px] text-gray-300">
            kcal
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="rounded-xl py-2 text-center">
          <p className="text-[10px] text-gray-400">
            Protein
          </p>
          <p className="font-medium text-sm">
            {item.protein}g
          </p>
        </div>

        <div className="rounded-xl py-2 text-center">
          <p className="text-[10px] text-gray-400">
            Carbs
          </p>
          <p className="font-medium text-sm">
            {item.carbs}g
          </p>
        </div>

        <div className="rounded-xl py-2 text-center">
          <p className="text-[10px] text-gray-400">
            Fat
          </p>
          <p className="font-medium text-sm">
            {item.fat}g
          </p>
        </div>
      </div>
    </div>
  ))}
</div>

{/* Desktop Table */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr className="border-b border-slate-700 text-gray-300 text-sm bg-slate-800/60">
        <th className="text-left py-3 px-3 text-gray-200 font-bold">Food</th>
        <th className="text-center py-3 text-gray-200 font-bold">Qty</th>
        <th className="text-center py-3 text-gray-200 font-bold">Unit</th>
        <th className="text-center py-3 text-gray-200 font-bold">Calories</th>
        <th className="text-center py-3 text-gray-200 font-bold">Protein</th>
        <th className="text-center py-3 text-gray-200 font-bold">Carbs</th>
        <th className="text-center py-3 text-gray-200 font-bold">Fat</th>
      </tr>
    </thead>

    <tbody>
      {meal.items.map((item: any) => (
        <tr
          key={item.id}
          className="border-b border-slate-700 text-gray-200 "
        >
          <td className="py-4 px-3 font-medium">
            {item.foodName}
          </td>

          <td className="text-center">
            {item.quantity}
          </td>

          <td className="text-center">
            {item.servingUnit}
          </td>

          <td className="text-center">
            {item.calories.toFixed(1)}
          </td>

          <td className="text-center">
            {item.protein.toFixed(1)}g
          </td>

          <td className="text-center">
            {item.carbs.toFixed(1)}g
          </td>

          <td className="text-center">
            {item.fat.toFixed(1)}g
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
<div className="mt-4 rounded-b-3xl px-5 py-3">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

    <div className="flex items-center gap-2 shrink-0">
      <div className="w-2 h-2 rounded-full bg-lime-400" />
      <span className="text-sm font-semibold text-white">
        Meal Total
      </span>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
      <div className="rounded-xl bg-black/20 px-3 py-2 text-center border border-white/5">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">
          Calories
        </p>
        <p className="text-lg font-bold text-lime-400">
          {meal.totals.calories.toFixed(1)}
        </p>
      </div>

      <div className="rounded-xl bg-black/20 px-3 py-2 text-center border border-white/5">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">
          Protein
        </p>
        <p className="text-lg font-bold text-white">
          {meal.totals.protein.toFixed(1)}g
        </p>
      </div>

      <div className="rounded-xl bg-black/20 px-3 py-2 text-center border border-white/5">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">
          Carbs
        </p>
        <p className="text-lg font-bold text-white">
          {meal.totals.carbs.toFixed(1)}g
        </p>
      </div>

      <div className="rounded-xl bg-black/20 px-3 py-2 text-center border border-white/5">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">
          Fat
        </p>
        <p className="text-lg font-bold text-white">
          {meal.totals.fat.toFixed(1)}g
        </p>
      </div>
    </div>

  </div>
</div>
              </div>
            )
          )}
        </div>
      </div>

      {/* DAILY TOTAL */}

      <div className=" border border-lime-400/20 rounded-3xl p-6">
        <h2 className="text-xl font-semibold mb-5">
          📊 Daily Nutrition Summary
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
          rawValue={plan.dailyTotals.calories}
            title="Calories"
            value={plan.dailyTotals.calories}
          />

          <SummaryCard
            title="Protein"
            value={plan.dailyTotals.protein}
          />

          <SummaryCard
            title="Carbs"
            value={plan.dailyTotals.carbs}
          />

          <SummaryCard
            title="Fat"
            value={plan.dailyTotals.fat}
          />
        </div>
      </div>
    </div>
  );
}

function NutritionCard({
  icon,
  title,
  subtitle,
  value,
  unit,
}: any) {
  return (
    <div className=" border border-slate-700 rounded-2xl p-5">
      <div className="text-lime-400">
        {icon}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        {subtitle}
      </p>

      <h3 className="font-semibold text-white">
        {title}
      </h3>

      <div className="text-2xl font-bold mt-2">
        {Number(value).toFixed(1)}
        {unit}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: any) {
  return (
    <div className="bg-black/20 rounded-2xl p-4">
      <p className="text-sm text-gray-300">
        {title}
      </p>

      <p className="text-xl font-bold mt-2">
        {(Number(value).toFixed(1))} g
      </p>
    </div>
  );
}