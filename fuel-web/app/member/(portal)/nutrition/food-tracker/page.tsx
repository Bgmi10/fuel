"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Apple,
  Flame,
  Beef,
  Wheat,
  Droplets,
} from "lucide-react";

import { useAuth } from "@/app/contexts/MemberAuthContext";
import FoodTrackingMealCard from "./FoodTrackingMealCard";


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
          {(percent).toFixed(1)}%
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
              {(
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


const page = () => {
    const { user } = useAuth();

const [loading, setLoading] =
  useState(true);

  
  const [meals, setMeals] =
  useState<any[]>([]);


const [data, setData] =
  useState<any>(null);


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

  const updateMeal = (
    mealId: string,
    updatedMeal: any
  ) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.id === mealId
          ? updatedMeal
          : meal
      )
    );
  };

  
 useEffect(() => {
  if (!user?.id) return;

  initializeTracker();
}, [user?.id]);

const initializeTracker = async () => {
  try {
    setLoading(true);

    const res = await fetch(
      `/api/member/food-tracker/today?memberId=${user?.id}`
    );

    const json = await res.json();

    if (json.data?.hasLogToday) {
      setData(json.data);
      return;
    }

    // Automatically create today's empty log
    await fetch("/api/member/food-tracker/start-empty", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        memberId: user?.id,
      }),
    });

    // Reload newly-created tracker
    const reload = await fetch(
      `/api/member/food-tracker/today?memberId=${user?.id}`
    );

    const reloadJson = await reload.json();

    setData(reloadJson.data);
  } finally {
    setLoading(false);
  }
};


useEffect(() => {
  if (data?.foodLog?.meals) {
    setMeals(
      data.foodLog.meals
    );
  }
}, [data]);



  
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }


  if (!data?.activePlan) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
        <Apple
          size={50}
          className="mx-auto text-neutral-600"
        />
  
        <h2 className="text-xl font-semibold mt-4">
          No Active Diet Plan
        </h2>
  
        <p className="text-neutral-400 mt-2">
          Your coach has not assigned
          a plan yet.
        </p>
      </div>
    );
  }



  const copyMealFromAssignedPlan = async (
    mealId: string
  ) => {
    try {
      const res = await fetch(
        `/api/member/food-tracker/copy-meal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberId: user?.id,
            mealId,
          }),
        }
      );
  
      if (res.status === 404) {
        alert('Meal not found') 
      }

      if (!res.ok) throw new Error();
  
      await initializeTracker();

      
    } catch (e)  {
      console.log(e);
    }
  };



  return (
    <div>
  <div className="space-y-6">
  <TrackerSummary
  data={{
    ...data,
    consumed: liveConsumed,
  }}
/>

    <div className="space-y-4">

      <div className="space-y-4">
  {meals.map(
    (meal: any) => (
      <FoodTrackingMealCard
        key={meal.id}
        meal={meal}
        allowAddFood={true}

    onCopyFromAssignedPlan={copyMealFromAssignedPlan}
        onUpdateMeal={
          updateMeal
        }
      />
    )
  )}
</div>

    </div>

  </div>
    </div>
  )
}


export default page;