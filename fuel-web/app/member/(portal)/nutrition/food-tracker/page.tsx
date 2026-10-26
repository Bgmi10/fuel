"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Apple,
  Flame,
  Beef,
  Wheat,
  Droplets,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

import { useAuth } from "@/app/contexts/MemberAuthContext";
import FoodTrackingMealCard from "./FoodTrackingMealCard";

/* ---------------------------------------------------------- */
/* Date helpers (all in Asia/Kolkata, "YYYY-MM-DD")            */
/* ---------------------------------------------------------- */

const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date()
  );

const shiftDate = (key: string, days: number) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const prettyDate = (key: string) =>
  new Date(`${key}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

/* ---------------------------------------------------------- */
/* Progress ring                                               */
/* ---------------------------------------------------------- */

function ProgressCard({ icon, title, consumed, target }: any) {
  const percent = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-lime-400">{icon}</span>
        <span className="text-md text-neutral-300">{percent.toFixed(1)}%</span>
      </div>

      <div className="mt-4 flex justify-center">
        <div className="relative w-24 h-24">
          <svg className="-rotate-90" width="96" height="96">
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
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-bold text-lg">{Number(consumed).toFixed(1)}</p>
            <p className="text-sm text-neutral-500">
              / {Number(target).toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-md text-neutral-300 mt-3">{title}</p>
    </div>
  );
}

function TrackerSummary({ data }: any) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <ProgressCard
        icon={<Flame />}
        title="Calories"
        consumed={data.consumed.calories}
        target={data.targets.calories}
      />
      <ProgressCard
        icon={<Beef />}
        title="Protein"
        consumed={data.consumed.protein}
        target={data.targets.protein}
      />
      <ProgressCard
        icon={<Wheat />}
        title="Carbs"
        consumed={data.consumed.carbs}
        target={data.targets.carbs}
      />
      <ProgressCard
        icon={<Droplets />}
        title="Fat"
        consumed={data.consumed.fat}
        target={data.targets.fat}
      />
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Date bar                                                    */
/* ---------------------------------------------------------- */

function DateBar({
  selectedDate,
  today,
  isToday,
  onChange,
}: {
  selectedDate: string;
  today: string;
  isToday: boolean;
  onChange: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-2xl p-3">
        <button
          onClick={() => onChange(shiftDate(selectedDate, -1))}
          className="h-10 w-10 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-3">
          <CalendarDays size={18} className="text-lime-400" />
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="bg-transparent text-white outline-none [color-scheme:dark]"
          />
          <span className="text-sm text-neutral-400">
            {isToday ? "Today" : prettyDate(selectedDate)}
          </span>
        </div>

        <button
          disabled={isToday}
          onClick={() => onChange(shiftDate(selectedDate, 1))}
          className="h-10 w-10 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {!isToday && (
        <button
          onClick={() => onChange(today)}
          className="text-sm text-lime-400"
        >
          Back to today
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Page                                                        */
/* ---------------------------------------------------------- */

const Page = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const today = todayKey();
  const isToday = selectedDate === today;

  // Guards against a slow response for an old date overwriting a newer one
  const requestId = useRef(0);

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
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals]);

  const updateMeal = (mealId: string, updatedMeal: any) => {
    setMeals((prev) =>
      prev.map((meal) => (meal.id === mealId ? updatedMeal : meal))
    );
  };

  /* ---------- TODAY: auto-creates an empty log ---------- */
  const initializeTracker = async () => {
    const myRequest = ++requestId.current;

    try {
      setLoading(true);

      const res = await fetch(
        `/api/member/food-tracker/today?memberId=${user?.id}`
      );
      const json = await res.json();

      if (myRequest !== requestId.current) return;

      if (json.data?.hasLogToday) {
        setData(json.data);
        return;
      }

      // Automatically create today's empty log
      await fetch("/api/member/food-tracker/start-empty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: user?.id }),
      });

      // Reload newly-created tracker
      const reload = await fetch(
        `/api/member/food-tracker/today?memberId=${user?.id}`
      );
      const reloadJson = await reload.json();

      if (myRequest !== requestId.current) return;

      setData(reloadJson.data);
    } finally {
      if (myRequest === requestId.current) setLoading(false);
    }
  };

  /* ---------- PAST DATES: read only, never creates a log ---------- */
  const loadHistory = async (dateKey: string) => {
    const myRequest = ++requestId.current;

    try {
      setLoading(true);

      const res = await fetch(
        `/api/member/food-tracker/history?memberId=${user?.id}&date=${dateKey}`
      );
      const json = await res.json();

      if (myRequest !== requestId.current) return;

      setData(json.data);
    } finally {
      if (myRequest === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    if (isToday) initializeTracker();
    else loadHistory(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedDate]);

  // Runs even when foodLog is null, so old meals don't linger on an empty day
  useEffect(() => {
    setMeals(data?.foodLog?.meals ?? []);
  }, [data]);

  const copyMealFromAssignedPlan = async (mealId: string) => {
    try {
      const res = await fetch(`/api/member/food-tracker/copy-meal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: user?.id, mealId }),
      });

      if (res.status === 404) {
        alert("Meal not found");
      }

      if (!res.ok) throw new Error();

      await initializeTracker();
    } catch (e) {
      console.log(e);
    }
  };

  const dateBar = (
    <DateBar
      selectedDate={selectedDate}
      today={today}
      isToday={isToday}
      onChange={setSelectedDate}
    />
  );

  /* ---------- Loading (date bar stays visible) ---------- */
  if (loading) {
    return (
      <div className="space-y-6">
        {dateBar}
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-lime-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  /* ---------- Today with no plan ---------- */
  if (isToday && !data?.activePlan) {
    return (
      <div className="space-y-6">
        {dateBar}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
          <Apple size={50} className="mx-auto text-neutral-600" />

          <h2 className="text-xl font-semibold mt-4">No Active Diet Plan</h2>

          <p className="text-neutral-400 mt-2">
            Your coach has not assigned a plan yet.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- Past date with no log ---------- */
  if (!isToday && !data?.foodLog) {
    return (
      <div className="space-y-6">
        {dateBar}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center text-neutral-400">
          <Apple size={50} className="mx-auto text-neutral-600 mb-4" />
          No food log for {prettyDate(selectedDate)}.
        </div>
      </div>
    );
  }

  /* ---------- Main view ---------- */
  return (
    <div className="space-y-6">
      {dateBar}

      <TrackerSummary
        data={{
          ...data,
          consumed: liveConsumed,
        }}
      />

      <div className="space-y-4">
        {meals.map((meal: any) => (
          <FoodTrackingMealCard
            key={meal.id}
            meal={meal}
            allowAddFood={isToday}
            readOnly={!isToday}
            onCopyFromAssignedPlan={copyMealFromAssignedPlan}
            onUpdateMeal={updateMeal}
          />
        ))}
      </div>
    </div>
  );
};

export default Page;