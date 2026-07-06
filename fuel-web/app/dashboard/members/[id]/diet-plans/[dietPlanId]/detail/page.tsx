"use client";

import { formatDate } from "@/app/utils/helper";
import { Apple } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type FoodItem = {
  id: string;

  foodId: string;

  name: string;

  calories: number;

  protein: number;

  carbs: number;

  fat: number;

  quantity: number;

  servingValue: number;

  servingUnit: string;
};

type Meal = {
  id: string;

  name: string;

  items: FoodItem[];
};


export default function DietPlanView() {
  const router = useRouter();
  const { dietPlanId }= useParams();

  const [loading, setLoading] =
  useState(true);

const [plan, setPlan] =
  useState<any>(null);

const [meals, setMeals] =
  useState<Meal[]>([]);


  useEffect(() => {
    if (!dietPlanId) return;
  
    loadDietPlan();
  }, [dietPlanId]);
  
  const loadDietPlan = async () => {
    try {
      setLoading(true);
  
      const res = await fetch(
        `/api/diet-plans/${dietPlanId}`
      );
  
      if (!res.ok) {
        throw new Error();
      }
  
      const data = await res.json();
  
      setPlan(data.data);
  
      setMeals(data.data.meals || []);
    } catch (err) {
      console.error(err);
  
      alert("Failed to load diet plan.");
    } finally {
      setLoading(false);
    }
  };



  
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-neutral-400">
        Loading diet plan...
      </div>
    );
  }
  
  if (!plan) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-red-400">
        Diet plan not found.
      </div>
    );
  }



  const targetProtein =
    plan.macroDistributionType === "GRAMS"
      ? plan.targetProtein
      : (plan.targetCalories *
          plan.targetProteinPercentage) /
          100 /
          4;

  const targetCarbs =
    plan.macroDistributionType === "GRAMS"
      ? plan.targetCarbs
      : (plan.targetCalories *
          plan.targetCarbsPercentage) /
          100 /
          4;

  const targetFat =
    plan.macroDistributionType === "GRAMS"
      ? plan.targetFat
      : (plan.targetCalories *
          plan.targetFatPercentage) /
          100 /
          9;

  const nutritionTotals = meals.reduce(
    (acc, meal) => {
      meal.items.forEach((food: any) => {
        const multiplier =
          food.quantity /
          food.servingValue;

        acc.calories +=
          food.calories *
          multiplier;

        acc.protein +=
          food.protein *
          multiplier;

        acc.carbs +=
          food.carbs *
          multiplier;

        acc.fat +=
          food.fat *
          multiplier;

        acc.foodCount++;
      });

      return acc;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      foodCount: 0,
    }
  );

  const caloriePercent = Math.min(
    (nutritionTotals.calories /
      plan.targetCalories) *
      100,
    100
  );

  const proteinPercent = Math.min(
    (nutritionTotals.protein /
      targetProtein) *
      100,
    100
  );

  const carbPercent = Math.min(
    (nutritionTotals.carbs /
      targetCarbs) *
      100,
    100
  );

  const fatPercent = Math.min(
    (nutritionTotals.fat /
      targetFat) *
      100,
    100
  );


  
  
  return (
    <div className="p-6 text-white">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_320px] gap-6">

        {/* MAIN */}

        <div className="space-y-6">

          <button
            onClick={() => router.back()}
            className="text-neutral-400 hover:text-white"
          >
            ← Back
          </button>

          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Apple className="text-lime-400" />

              Diet Plan Details
            </h1>
          </div>

          {/* PLAN INFO */}

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

            <h2 className="text-lg font-semibold mb-6">
              Plan Information
            </h2>

            <div className="grid md:grid-cols-2 gap-6">

              <div>
                <p className="text-sm text-neutral-500">
                  Plan Name
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {plan.title}
                </p>
              </div>

              <div>
                <p className="text-sm text-neutral-500">
                  Target Calories
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {plan.targetCalories} kcal
                </p>
              </div>

              <div>
                <p className="text-sm text-neutral-500">
                  Start Date
                </p>

                <p className="mt-2">
                  {formatDate(plan.startDate) || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-neutral-500">
                  End Date
                </p>

                <p className="mt-2">
                  {formatDate(plan.endDate) || "-"}
                </p>
              </div>

            </div>

            <div className="mt-8">

              <p className="text-sm text-neutral-500 mb-3">
                Instructions
              </p>

              <div className="rounded-2xl bg-neutral-800 p-5 whitespace-pre-wrap leading-7">
                {plan.instructions || "No instructions provided."}
              </div>

            </div>

          </div>

          {/* MACRO TARGETS */}

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

            <h2 className="font-semibold text-lg mb-6">
              Macro Targets
            </h2>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">

              <div className="rounded-2xl bg-neutral-800 p-5">
                <p className="text-sm text-neutral-500">
                  Calories
                </p>

                <p className="text-2xl font-bold mt-2">
                  {plan.targetCalories.toFixed(1)}
                </p>

                <p className="text-sm text-neutral-500 mt-1">
                  kcal/day
                </p>
              </div>

              <div className="rounded-2xl bg-neutral-800 p-5">
                <p className="text-sm text-neutral-500">
                  Protein
                </p>

                <p className="text-2xl font-bold mt-2">
                  {targetProtein.toFixed(1)} g
                </p>

                {plan.macroDistributionType === "PERCENTAGE" && (
                  <p className="text-sm text-lime-400 mt-2">
                    {plan.targetProteinPercentage}%
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-neutral-800 p-5">
                <p className="text-sm text-neutral-500">
                  Carbs
                </p>

                <p className="text-2xl font-bold mt-2">
                  {targetCarbs.toFixed(1)} g
                </p>

                {plan.macroDistributionType === "PERCENTAGE" && (
                  <p className="text-sm text-lime-400 mt-2">
                    {plan.targetCarbsPercentage}%
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-neutral-800 p-5">
                <p className="text-sm text-neutral-500">
                  Fat
                </p>

                <p className="text-2xl font-bold mt-2">
                  {targetFat.toFixed(1)} g
                </p>

                {plan.macroDistributionType === "PERCENTAGE" && (
                  <p className="text-sm text-lime-400 mt-2">
                    {plan.targetFatPercentage}%
                  </p>
                )}
              </div>

            </div>

          </div>

          {/* MEALS START HERE */}

                    {/* MEALS */}

                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

<h2 className="text-lg font-semibold mb-6">
  Meals
</h2>

<div className="space-y-6">

  {meals.map((meal) => {

    const mealTotals = meal.items.reduce(
      (acc, food: any) => {

        const multiplier =
          food.quantity /
          food.servingValue;

        acc.calories +=
          food.calories *
          multiplier;

        acc.protein +=
          food.protein *
          multiplier;

        acc.carbs +=
          food.carbs *
          multiplier;

        acc.fat +=
          food.fat *
          multiplier;

        return acc;

      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }
    );

    return (

      <div
        key={meal.id}
        className="rounded-3xl border border-neutral-800 overflow-hidden"
      >

        {/* Meal Header */}

        <div className="bg-neutral-800 px-6 py-5 flex items-center justify-between">

          <div>

            <h3 className="text-xl font-bold">
              {meal.name}
            </h3>

            <p className="text-sm text-neutral-400 mt-1">
              {meal.items.length} food
              {meal.items.length !== 1 && "s"}
            </p>

          </div>

          <div className="text-right">

            <p className="text-sm text-neutral-500">
              Total Calories
            </p>

            <p className="text-2xl font-bold text-lime-400">
              {mealTotals.calories.toFixed(1)}
            </p>

          </div>

        </div>

        {/* Foods */}

        {meal.items.length === 0 ? (

          <div className="py-10 text-center text-neutral-500">
            No foods added.
          </div>

        ) : (

          <div className="divide-y divide-neutral-800">

            {meal.items.map((food: any) => {

              const multiplier =
                food.quantity /
                food.servingValue;

              const calories =
                food.calories *
                multiplier;

              const protein =
                food.protein *
                multiplier;

              const carbs =
                food.carbs *
                multiplier;

              const fat =
                food.fat *
                multiplier;

              return (

                <div
                  key={food.id}
                  className="p-6 hover:bg-neutral-900 transition"
                >

                  <div className="flex justify-between items-start">

                    <div>

                      <h4 className="text-lg font-semibold">
                        {food.foodName}
                      </h4>

                      <p className="text-neutral-500 mt-2">
                        {food.quantity}{" "}
                        {food.servingUnit}
                      </p>

                    </div>

                    <div className="text-right">

                      <p className="text-sm text-neutral-500">
                        Calories
                      </p>

                      <p className="text-xl font-bold">
                        {calories.toFixed(1)}
                      </p>

                    </div>

                  </div>

                  <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 mt-6">

                    <div className="rounded-xl bg-neutral-800 p-4">

                      <p className="text-xs text-neutral-500">
                        Protein
                      </p>

                      <p className="text-lg font-semibold mt-1">
                        {protein.toFixed(1)} g
                      </p>

                    </div>

                    <div className="rounded-xl bg-neutral-800 p-4">

                      <p className="text-xs text-neutral-500">
                        Carbs
                      </p>

                      <p className="text-lg font-semibold mt-1">
                        {carbs.toFixed(1)} g
                      </p>

                    </div>

                    <div className="rounded-xl bg-neutral-800 p-4">

                      <p className="text-xs text-neutral-500">
                        Fat
                      </p>

                      <p className="text-lg font-semibold mt-1">
                        {fat.toFixed(1)} g
                      </p>

                    </div>

                    <div className="rounded-xl bg-neutral-800 p-4">

                      <p className="text-xs text-neutral-500">
                        Serving
                      </p>

                      <p className="text-lg font-semibold mt-1">
                        {food.quantity} {food.servingUnit}
                      </p>

                    </div>

                  </div>

                </div>

              );

            })}

          </div>

        )}

        {/* Meal Footer */}

        <div className="border-t border-neutral-800 bg-neutral-900 px-6 py-5">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <div>

              <p className="text-xs text-neutral-500">
                Calories
              </p>

              <p className="text-xl font-bold mt-1">
                {mealTotals.calories.toFixed(1)}
              </p>

            </div>

            <div>

              <p className="text-xs text-neutral-500">
                Protein
              </p>

              <p className="text-xl font-bold mt-1">
                {mealTotals.protein.toFixed(1)} g
              </p>

            </div>

            <div>

              <p className="text-xs text-neutral-500">
                Carbs
              </p>

              <p className="text-xl font-bold mt-1">
                {mealTotals.carbs.toFixed(1)} g
              </p>

            </div>

            <div>

              <p className="text-xs text-neutral-500">
                Fat
              </p>

              <p className="text-xl font-bold mt-1">
                {mealTotals.fat.toFixed(1)} g
              </p>

            </div>

          </div>

        </div>

      </div>

    );

  })}

</div>

</div>


</div>

{/* SIDEBAR */}

<div>

  <div className="sticky top-6 space-y-4">

    {/* OVERVIEW */}

    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

      <h3 className="font-semibold text-lg mb-5">
        Diet Summary
      </h3>

      <div className="grid grid-cols-2 gap-4">

        <div className="rounded-2xl bg-neutral-800 p-4">

          <p className="text-sm text-neutral-500">
            Meals
          </p>

          <p className="text-3xl font-bold mt-2">
            {meals.length}
          </p>

        </div>

        <div className="rounded-2xl bg-neutral-800 p-4">

          <p className="text-sm text-neutral-500">
            Foods
          </p>

          <p className="text-3xl font-bold mt-2">
            {nutritionTotals.foodCount}
          </p>

        </div>

      </div>

    </div>

    {/* CALORIES */}

    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

      <h3 className="font-semibold text-lg mb-5">
        Calories
      </h3>

      <div className="flex justify-between mb-3">

        <span className="text-neutral-400">
          Planned
        </span>

        <span className="font-semibold">

          {nutritionTotals.calories.toFixed(1)}

          {" / "}

          {plan.targetCalories.toFixed(1)}

          kcal

        </span>

      </div>

      <div className="h-3 rounded-full bg-neutral-800 overflow-hidden">

        <div
          className="h-full bg-lime-400 transition-all"
          style={{
            width: `${caloriePercent}%`,
          }}
        />

      </div>

    </div>

    {/* MACROS */}

    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

      <h3 className="font-semibold text-lg mb-6">
        Macro Breakdown
      </h3>

      <div className="space-y-6">

        <div>

          <div className="flex justify-between mb-2">

            <span>
              Protein
            </span>

            <span>

              {nutritionTotals.protein.toFixed(1)}

              g /

              {targetProtein.toFixed(1)}

              g

            </span>

          </div>

          <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">

            <div
              className="h-full bg-lime-400"
              style={{
                width: `${proteinPercent}%`,
              }}
            />

          </div>

        </div>

        <div>

          <div className="flex justify-between mb-2">

            <span>
              Carbs
            </span>

            <span>

              {nutritionTotals.carbs.toFixed(1)}

              g /

              {targetCarbs.toFixed(1)}

              g

            </span>

          </div>

          <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">

            <div
              className="h-full bg-lime-400"
              style={{
                width: `${carbPercent}%`,
              }}
            />

          </div>

        </div>

        <div>

          <div className="flex justify-between mb-2">

            <span>
              Fat
            </span>

            <span>

              {nutritionTotals.fat.toFixed(1)}

              g /

              {targetFat.toFixed(1)}

              g

            </span>

          </div>

          <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">

            <div
              className="h-full bg-lime-400"
              style={{
                width: `${fatPercent}%`,
              }}
            />

          </div>

        </div>

      </div>

    </div>

    {/* REMAINING */}

    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

      <h3 className="font-semibold text-lg mb-5">
        Remaining
      </h3>

      <div className="space-y-4">

        <div className="flex justify-between">

          <span className="text-neutral-400">
            Calories
          </span>

          <span className="font-semibold">

            {(
              plan.targetCalories -
              nutritionTotals.calories
            ).toFixed(1)}

            kcal

          </span>

        </div>

        <div className="flex justify-between">

          <span className="text-neutral-400">
            Protein
          </span>

          <span className="font-semibold">

            {(
              targetProtein -
              nutritionTotals.protein
            ).toFixed(1)}

            g

          </span>

        </div>

        <div className="flex justify-between">

          <span className="text-neutral-400">
            Carbs
          </span>

          <span className="font-semibold">

            {(
              targetCarbs -
              nutritionTotals.carbs
            ).toFixed(1)}

            g

          </span>

        </div>

        <div className="flex justify-between">

          <span className="text-neutral-400">
            Fat
          </span>

          <span className="font-semibold">

            {(
              targetFat -
              nutritionTotals.fat
            ).toFixed(1)}

            g

          </span>

        </div>

      </div>

    </div>

  </div>

</div>

</div>

</div>

);
}
