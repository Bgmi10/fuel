"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import {
    Book,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Flame,
    Beef,
    Wheat,
    Droplets,
  } from "lucide-react";



  function MacroBadge({
    label,
    value,
  }: any) {
    return (
      <div className="rounded-xl bg-neutral-800 px-4 py-3 text-center min-w-[72px]">
  
        <p className="text-xs text-neutral-500">
          {label}
        </p>
  
        <p className="mt-1 font-semibold">
          {value}
        </p>
  
      </div>
    );
  }



  function NutritionCard({
    label,
    value,
    unit,
  }: any) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-center">
  
        <p className="text-xs text-neutral-500">
          {label}
        </p>
  
        <p className="mt-2 font-semibold">
          {value}
          <span className="ml-1 text-xs text-neutral-500">
            {unit}
          </span>
        </p>
  
      </div>
    );
  }



  function FoodRow({
    food,
  }: {
    food: any;
  }) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-black/20 p-5 transition hover:border-neutral-700">
  
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
  
          {/* Left */}
  
          <div className="flex gap-4 flex-1">
  
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center text-xl">
              🍽️
            </div>
  
            <div>
  
              <h3 className="font-semibold text-lg">
                {food.foodName}
              </h3>
  
              {food.brandName && (
                <p className="text-sm text-neutral-500 mt-1">
                  {food.brandName}
                </p>
              )}
  
              <div className="flex flex-wrap gap-2 mt-4">
  
                <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                  {food.quantity}{" "}
                  {food.servingUnit}
                </span>
  
                {food.consumed ? (
                  <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs text-lime-400">
                    ✓ Consumed
                  </span>
                ) : (
                  <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs text-orange-400">
                    Pending
                  </span>
                )}
  
                {food.consumedAt && (
                  <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-400">
                    {new Date(
                      food.consumedAt
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
  
              </div>
  
            </div>
  
          </div>
  
          {/* Right */}
  
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:w-[420px]">
  
            <NutritionCard
              label="Calories"
              value={food.calories.toFixed(0)}
              unit="kcal"
            />
  
            <NutritionCard
              label="Protein"
              value={food.protein.toFixed(1)}
              unit="g"
            />
  
            <NutritionCard
              label="Carbs"
              value={food.carbs.toFixed(1)}
              unit="g"
            />
  
            <NutritionCard
              label="Fat"
              value={food.fat.toFixed(1)}
              unit="g"
            />
  
          </div>
  
        </div>
  
      </div>
    );
  }


  function MemberMealCard({
    meal,
  }: {
    meal: any;
  }) {
    const totals = meal.items.reduce(
      (acc: any, item: any) => {
        acc.calories += Number(item.calories);
        acc.protein += Number(item.protein);
        acc.carbs += Number(item.carbs);
        acc.fat += Number(item.fat);
  
        if (item.consumed) acc.consumed++;
        else acc.pending++;
  
        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        consumed: 0,
        pending: 0,
      }
    );
  
    return (
      <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
  
        {/* Header */}
  
        <div className="border-b border-neutral-800 p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
  
          <div>
  
            <div className="flex items-center gap-3">
  
              <div className="w-12 h-12 rounded-2xl bg-lime-400/10 flex items-center justify-center text-xl">
                🍽️
              </div>
  
              <div>
  
                <h2 className="text-xl font-bold">
                  {meal.name}
                </h2>
  
                <p className="text-sm text-neutral-500 mt-1">
                  {meal.items.length} Foods
                </p>
  
              </div>
  
            </div>
  
            <div className="flex gap-2 mt-4 flex-wrap">
  
              <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs text-lime-400">
                {totals.consumed} Consumed
              </span>
  
              <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs text-orange-400">
                {totals.pending} Pending
              </span>
  
            </div>
  
          </div>
  
          <div className="grid grid-cols-4 gap-3">
  
            <MacroBadge
              label="Cal"
              value={totals.calories.toFixed(0)}
            />
  
            <MacroBadge
              label="P"
              value={`${totals.protein.toFixed(1)}g`}
            />
  
            <MacroBadge
              label="C"
              value={`${totals.carbs.toFixed(1)}g`}
            />
  
            <MacroBadge
              label="F"
              value={`${totals.fat.toFixed(1)}g`}
            />
  
          </div>
  
        </div>
  
        {/* Foods */}
  
        <div className="p-6 space-y-4">
  
          {meal.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-700 py-10 text-center text-neutral-500">
              No foods logged.
            </div>
          ) : (
            meal.items.map((food: any) => (
              <FoodRow
                key={food.id}
                food={food}
              />
            ))
          )}
  
        </div>
  
      </div>
    );
  }
  

  function ProgressCard({
    icon,
    title,
    consumed,
    target,
  }: any) {
    const percent = Math.min(
      (consumed / target) * 100,
      100
    );
  
    const radius = 44;
    const circumference =
      2 * Math.PI * radius;
  
    const offset =
      circumference -
      (percent / 100) *
        circumference;
  
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5">
  
        <div className="flex items-center justify-between">
          <span className="text-lime-400">
            {icon}
          </span>
  
          <span className="text-md text-neutral-300">
            {Math.round(percent)}%
          </span>
        </div>
  
        <div className="mt-4 flex justify-center">
  
          <div className="relative w-24 h-24">
  
            <svg
              className="-rotate-90"
              width="96"
              height="96"
            >
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="rgba(255,255,255,.08)"
                strokeWidth="5"
                fill="none"
              />
  
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="#A3E635"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={
                  circumference
                }
                strokeDashoffset={
                  offset
                }
              />
            </svg>
  
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-bold text-lg">
                {Math.round(
                  consumed
                ).toFixed(1)}
              </p>
  
              <p className="text-sm text-neutral-500">
                / {target.toFixed(1)}
              </p>
            </div>
  
          </div>
  
        </div>
  
        <p className="text-center text-md text-neutral-300 mt-3">
          {title}
        </p>
  
      </div>
    );
  }
  
  
  
  function TrackerSummary({
      data,
    }: any) {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    
          <ProgressCard
            icon={<Flame />}
            title="Calories"
            consumed={
              data.consumed
                .calories
            }
            target={
              data.targets
                .calories
            }
          />
    
          <ProgressCard
            icon={<Beef />}
            title="Protein"
            consumed={
              data.consumed
                .protein
            }
            target={
              data.targets
                .protein
            }
          />
    
          <ProgressCard
            icon={<Wheat />}
            title="Carbs"
            consumed={
              data.consumed.carbs
            }
            target={
              data.targets.carbs
            }
          />
    
          <ProgressCard
            icon={<Droplets />}
            title="Fat"
            consumed={
              data.consumed.fat
            }
            target={
              data.targets.fat
            }
          />
    
        </div>
      );
    }
  
export default function MemberLogsPage() {
  const { id: memberId } = useParams();

  const [data, setData] = useState<any>(null);
const [meals, setMeals] = useState<any[]>([]);

  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] =
    useState(today);

  const [loading, setLoading] =
    useState(false);



  const fetchLog = async (
    date: string
  ) => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/member/food-tracker?memberId=${memberId}&date=${date}`
      );

      const data = await res.json();

      setData(data.data )
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (memberId) {
      fetchLog(selectedDate);
    }
  }, [memberId, selectedDate]);

  const changeDay = (days: number) => {
    const date = new Date(selectedDate);

    date.setDate(date.getDate() + days);

    setSelectedDate(
      date.toISOString().split("T")[0]
    );
  };


  
  useEffect(() => {
    if (data?.foodLog?.meals) {
      setMeals(data.foodLog.meals);
    } else {
      setMeals([]);
    }
  }, [data]);



  const liveConsumed = useMemo(() => {
    return meals.reduce(
      (acc, meal) => {
        meal.items.forEach((item: any) => {
          if (!item.consumed) return;
  
          acc.calories += Number(item.calories || 0);
          acc.protein += Number(item.protein || 0);
          acc.carbs += Number(item.carbs || 0);
          acc.fat += Number(item.fat || 0);
        });
  
        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }
    );
  }, [meals]);



  return (
    <div className="p-6 space-y-6 text-white">
      {/* Header */}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Book className="text-lime-400" />
            Member Food Logs
          </h1>

          <p className="text-neutral-400 mt-2">
            Review meals consumed by the member
            on a selected day.
          </p>
        </div>

        {/* Date Navigation */}

        <div className="flex items-center gap-3">

          <button
            onClick={() => changeDay(-1)}
            className="h-11 w-11 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 transition flex items-center justify-center"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="relative">
          <input
  type="date"
  value={selectedDate}
  onChange={(e) => setSelectedDate(e.target.value)}
  className="h-11 pl-10 bg-lime-500 pr-4 rounded-xl text-black  font-bold outline-none transition"
/>
          </div>

          <button
            onClick={() => changeDay(1)}
            className="h-11 w-11 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 transition flex items-center justify-center"
          >
            <ChevronRight size={18} />
          </button>

        </div>

      </div>

      {/* Divider */}

      <div className="border-t border-neutral-800" />

      {/* Content */}

      {loading && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 flex items-center justify-center">
          <div className="text-neutral-400">
            Loading member log...
          </div>
        </div>
      )}

      {!loading && !data?.foodLog && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-16 text-center">

          <Book
            size={52}
            className="mx-auto mb-5 text-neutral-700"
          />

          <h2 className="text-xl font-semibold">
            No Food Log Found
          </h2>

          <p className="text-neutral-500 mt-2">
            There are no meals recorded for{" "}
            <span className="text-neutral-300">
              {new Date(
                selectedDate
              ).toLocaleDateString()}
            </span>
            .
          </p>

        </div>
      )}

      {!loading && data?.foodLog && (
        <div className="space-y-6">
<TrackerSummary
  data={{
    ...data,
    consumed: liveConsumed,
  }}
/>


<div className="space-y-6">
{meals.map((meal: any) => (
  <MemberMealCard
    key={meal.id}
    meal={meal}
  />
))}
</div>

        </div>
      )}
    </div>
  );
}