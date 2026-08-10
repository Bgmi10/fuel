"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Apple,
  Calendar,
  Flame,
  Beef,
  Wheat,
  Droplets,
  ChefHat,
} from "lucide-react";

import { useAuth } from "@/app/contexts/MemberAuthContext";
import { formatDate } from "@/app/utils/helper";

type FoodItem = {
  id: string;
  mealId?: string;
  externalFoodId?: string | null;
  foodName: string;
  brandName?: string | null;
  quantity: number;
  servingValue: string | number;
  servingUnit: string;
  nutritionMultiplier?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type Meal = {
  id: string;
  dietPlanId?: string;
  name: string;
  sortOrder?: number;
  items: FoodItem[];
};

type NutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/**
 * Calculate the actual nutrition for the quantity
 * assigned to the member.
 *
 * Same logic used in the admin portal:
 *
 * multiplier = quantity / servingValue
 *
 * Example:
 *
 * quantity = 4
 * servingValue = 3
 * calories = 157
 *
 * 157 * (4 / 3) = 209.33 kcal
 */
function calculateFoodNutrition(
  food: FoodItem
): NutritionTotals {
  const quantity = Number(food.quantity) || 0;

  const servingValue =
    Number(food.servingValue) || 0;

  /*
   * Prevent division by zero.
   *
   * If servingValue is missing/invalid,
   * fall back to the nutrition values
   * returned from the API.
   */
  if (servingValue <= 0) {
    return {
      calories:
        Number(food.calories) || 0,
      protein:
        Number(food.protein) || 0,
      carbs:
        Number(food.carbs) || 0,
      fat:
        Number(food.fat) || 0,
    };
  }

  const multiplier =
    quantity / servingValue;

  return {
    calories:
      (Number(food.calories) || 0) *
      multiplier,

    protein:
      (Number(food.protein) || 0) *
      multiplier,

    carbs:
      (Number(food.carbs) || 0) *
      multiplier,

    fat:
      (Number(food.fat) || 0) *
      multiplier,
  };
}

/**
 * Calculate complete meal totals from
 * the individual foods.
 */
function calculateMealTotals(
  items: FoodItem[]
): NutritionTotals {
  return items.reduce<NutritionTotals>(
    (totals, food) => {
      const nutrition =
        calculateFoodNutrition(food);

      totals.calories +=
        nutrition.calories;

      totals.protein +=
        nutrition.protein;

      totals.carbs += nutrition.carbs;

      totals.fat += nutrition.fat;

      return totals;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  );
}

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
      setLoading(true);

      const res = await fetch(
        `/api/member/diet/active?memberId=${member?.id}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message ||
            "Failed to load diet plan"
        );
      }

      setPlan(data.data);
    } catch (error) {
      console.error(
        "Failed to load diet plan:",
        error
      );

      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Convert percentage based macro targets
   * to grams, same way as admin portal.
   */
  const targetProtein = useMemo(() => {
    if (!plan) return 0;

    if (
      plan.macroDistributionType ===
      "GRAMS"
    ) {
      return (
        Number(plan.targetProtein) || 0
      );
    }

    return (
      ((Number(plan.targetCalories) || 0) *
        (Number(
          plan.targetProteinPercentage
        ) || 0)) /
      100 /
      4
    );
  }, [plan]);

  const targetCarbs = useMemo(() => {
    if (!plan) return 0;

    if (
      plan.macroDistributionType ===
      "GRAMS"
    ) {
      return (
        Number(plan.targetCarbs) || 0
      );
    }

    return (
      ((Number(plan.targetCalories) || 0) *
        (Number(
          plan.targetCarbsPercentage
        ) || 0)) /
      100 /
      4
    );
  }, [plan]);

  const targetFat = useMemo(() => {
    if (!plan) return 0;

    if (
      plan.macroDistributionType ===
      "GRAMS"
    ) {
      return Number(plan.targetFat) || 0;
    }

    return (
      ((Number(plan.targetCalories) || 0) *
        (Number(
          plan.targetFatPercentage
        ) || 0)) /
      100 /
      9
    );
  }, [plan]);

  /**
   * Calculate the entire day's nutrition
   * from foods instead of trusting
   * plan.dailyTotals from the API.
   */
  const dailyTotals =
    useMemo<NutritionTotals>(() => {
      if (!plan?.meals) {
        return {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        };
      }

      return plan.meals.reduce(
        (
          totals: NutritionTotals,
          meal: Meal
        ) => {
          const mealTotals =
            calculateMealTotals(
              meal.items || []
            );

          totals.calories +=
            mealTotals.calories;

          totals.protein +=
            mealTotals.protein;

          totals.carbs +=
            mealTotals.carbs;

          totals.fat +=
            mealTotals.fat;

          return totals;
        },
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }
      );
    }, [plan]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-lime-400 border-t-transparent" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-3xl border border-slate-600 bg-slate-900 p-10 text-center text-white shadow-lg">
        <Apple
          size={60}
          className="mx-auto text-slate-400"
        />

        <h2 className="mt-5 text-2xl font-bold text-white">
          No Nutrition Plan Yet
        </h2>

        <p className="mt-3 text-base leading-relaxed text-slate-200">
          Your coach hasn&apos;t assigned a
          nutrition plan yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-white">
      {/* HERO */}

      <section className="rounded-3xl border border-slate-600 bg-slate-900/90 p-5 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/15 px-3 py-1 text-xs font-semibold text-lime-300">
              Active Nutrition Plan
            </div>

            <h1 className="text-3xl font-bold text-white">
              {plan.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-slate-200">
              <Calendar
                size={16}
                className="text-lime-300"
              />

              <span>From</span>

              <span className="font-semibold text-white">
                {formatDate(plan.startDate)}
              </span>

              <span className="text-slate-300">
                to
              </span>

              <span className="font-semibold text-white">
                {formatDate(plan.endDate)}
              </span>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3 sm:min-w-[320px]">
            <div className="rounded-2xl border border-slate-600 bg-slate-950/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Daily Calories
              </p>

              <p className="mt-1 text-2xl font-bold text-lime-300">
                {plan.targetCalories}
              </p>

              <p className="text-xs font-medium text-slate-300">
                kcal target
              </p>
            </div>

            <div className="rounded-2xl border border-slate-600 bg-slate-950/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Meals
              </p>

              <p className="mt-1 text-2xl font-bold text-white">
                {plan.meals?.length || 0}
              </p>

              <p className="text-xs font-medium text-slate-300">
                scheduled
              </p>
            </div>
          </div>
        </div>

        {plan.instructions && (
          <div className="mt-6 border-t border-slate-600 pt-6">
            <div className="flex gap-3 rounded-2xl bg-slate-950/60 p-4">
              <ChefHat
                size={20}
                className="mt-0.5 shrink-0 text-lime-300"
              />

              <div>
                <h3 className="mb-2 font-semibold text-white">
                  Coach Instructions
                </h3>

                <p className="text-sm leading-6 text-slate-200">
                  {plan.instructions}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* DAILY TARGETS */}

      <section className="rounded-3xl border border-slate-600 bg-slate-900/90 p-5 shadow-lg shadow-black/20">
        <h2 className="mb-4 text-xl font-semibold text-white">
          🎯 Daily Nutrition Goal
        </h2>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <NutritionCard
            icon={<Flame size={20} />}
            title="Calories"
            value={
              Number(plan.targetCalories) ||
              0
            }
            unit=" kcal"
          />

          <NutritionCard
            icon={<Beef size={20} />}
            title="Protein"
            value={targetProtein}
            unit=" g"
          />

          <NutritionCard
            icon={<Wheat size={20} />}
            title="Carbs"
            value={targetCarbs}
            unit=" g"
          />

          <NutritionCard
            icon={<Droplets size={20} />}
            title="Fat"
            value={targetFat}
            unit=" g"
          />
        </div>
      </section>

      {/* MEALS */}

      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">
          🍽️ Your Daily Meals
        </h2>

        <div className="space-y-5">
          {plan.meals?.map(
            (
              meal: Meal,
              index: number
            ) => {
              /**
               * Calculate this meal
               * exactly like admin.
               */
              const mealTotals =
                calculateMealTotals(
                  meal.items || []
                );

              return (
                <article
                  key={meal.id}
                  className="overflow-hidden rounded-3xl border border-slate-600 bg-slate-900/90 shadow-lg shadow-black/20"
                >
                  {/* MEAL HEADER */}

                  <div className="border-b border-slate-600 bg-slate-800/80 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">
                          {meal.name}
                        </h3>

                        <p className="mt-1 text-sm font-medium text-slate-200">
                          Meal {index + 1}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-lime-300">
                          {mealTotals.calories.toFixed(
                            1
                          )}
                        </div>

                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                          calories
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MOBILE VIEW */}

                  <div className="space-y-3 p-3 md:hidden">
                    {meal.items?.map(
                      (item: FoodItem) => {
                        const nutrition =
                          calculateFoodNutrition(
                            item
                          );

                        return (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-slate-600 bg-slate-950/70 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="truncate text-sm font-semibold text-white">
                                  {
                                    item.foodName
                                  }
                                </h4>

                                <p className="mt-1 text-xs font-medium text-slate-200">
                                  {
                                    item.quantity
                                  }{" "}
                                  {
                                    item.servingUnit
                                  }
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-sm font-bold text-white">
                                  {nutrition.calories.toFixed(
                                    1
                                  )}
                                </p>

                                <p className="text-[11px] font-medium text-slate-300">
                                  kcal
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <MacroValue
                                label="Protein"
                                value={`${nutrition.protein.toFixed(
                                  1
                                )}g`}
                              />

                              <MacroValue
                                label="Carbs"
                                value={`${nutrition.carbs.toFixed(
                                  1
                                )}g`}
                              />

                              <MacroValue
                                label="Fat"
                                value={`${nutrition.fat.toFixed(
                                  1
                                )}g`}
                              />
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>

                  {/* DESKTOP TABLE */}

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-600 bg-slate-800 text-sm">
                          <th className="px-4 py-3 text-left font-bold text-white">
                            Food
                          </th>

                          <th className="px-3 py-3 text-center font-bold text-white">
                            Qty
                          </th>

                          <th className="px-3 py-3 text-center font-bold text-white">
                            Unit
                          </th>

                          <th className="px-3 py-3 text-center font-bold text-white">
                            Calories
                          </th>

                          <th className="px-3 py-3 text-center font-bold text-white">
                            Protein
                          </th>

                          <th className="px-3 py-3 text-center font-bold text-white">
                            Carbs
                          </th>

                          <th className="px-3 py-3 text-center font-bold text-white">
                            Fat
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {meal.items?.map(
                          (
                            item: FoodItem
                          ) => {
                            const nutrition =
                              calculateFoodNutrition(
                                item
                              );

                            return (
                              <tr
                                key={
                                  item.id
                                }
                                className="border-b border-slate-700 bg-slate-900 text-slate-100 last:border-b-0 hover:bg-slate-800/80"
                              >
                                <td className="px-4 py-4 font-semibold text-white">
                                  {
                                    item.foodName
                                  }
                                </td>

                                <td className="px-3 text-center font-medium text-slate-100">
                                  {
                                    item.quantity
                                  }
                                </td>

                                <td className="px-3 text-center font-medium text-slate-100">
                                  {
                                    item.servingUnit
                                  }
                                </td>

                                <td className="px-3 text-center font-medium text-slate-100">
                                  {nutrition.calories.toFixed(
                                    1
                                  )}
                                </td>

                                <td className="px-3 text-center font-medium text-slate-100">
                                  {nutrition.protein.toFixed(
                                    1
                                  )}
                                  g
                                </td>

                                <td className="px-3 text-center font-medium text-slate-100">
                                  {nutrition.carbs.toFixed(
                                    1
                                  )}
                                  g
                                </td>

                                <td className="px-3 text-center font-medium text-slate-100">
                                  {nutrition.fat.toFixed(
                                    1
                                  )}
                                  g
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MEAL TOTAL */}

                  <div className="border-t border-slate-600 bg-slate-800/70 px-5 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-lime-400" />

                        <span className="text-sm font-semibold text-white">
                          Meal Total
                        </span>
                      </div>

                      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                        <MealTotalCard
                          label="Calories"
                          value={mealTotals.calories.toFixed(
                            1
                          )}
                          highlight
                        />

                        <MealTotalCard
                          label="Protein"
                          value={`${mealTotals.protein.toFixed(
                            1
                          )}g`}
                        />

                        <MealTotalCard
                          label="Carbs"
                          value={`${mealTotals.carbs.toFixed(
                            1
                          )}g`}
                        />

                        <MealTotalCard
                          label="Fat"
                          value={`${mealTotals.fat.toFixed(
                            1
                          )}g`}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      </section>

      {/* DAILY TOTAL */}

      <section className="rounded-3xl border border-lime-400/40 bg-slate-900/95 p-6 shadow-lg shadow-black/20">
        <h2 className="mb-5 text-xl font-semibold text-white">
          📊 Daily Nutrition Summary
        </h2>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard
            title="Calories"
            value={dailyTotals.calories}
            unit="kcal"
            highlight
          />

          <SummaryCard
            title="Protein"
            value={dailyTotals.protein}
            unit="g"
          />

          <SummaryCard
            title="Carbs"
            value={dailyTotals.carbs}
            unit="g"
          />

          <SummaryCard
            title="Fat"
            value={dailyTotals.fat}
            unit="g"
          />
        </div>
      </section>
    </div>
  );
}

function NutritionCard({
  icon,
  title,
  value,
  unit,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-600 bg-slate-950/70 p-5">
      <div className="text-lime-300">
        {icon}
      </div>

      <h3 className="mt-3 font-semibold text-slate-100">
        {title}
      </h3>

      <div className="mt-2 text-2xl font-bold text-white">
        {Number(value).toFixed(1)}

        <span className="ml-1 text-sm font-semibold text-slate-200">
          {unit}
        </span>
      </div>
    </div>
  );
}

function MacroValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function MealTotalCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-600 bg-slate-950/80 px-3 py-2 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
        {label}
      </p>

      <p
        className={`text-lg font-bold ${
          highlight
            ? "text-lime-300"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  unit,
  highlight = false,
}: {
  title: string;
  value: number;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-600 bg-slate-950/80 p-4">
      <p className="text-sm font-semibold text-slate-200">
        {title}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          highlight
            ? "text-lime-300"
            : "text-white"
        }`}
      >
        {Number(value).toFixed(1)}{" "}
        {unit}
      </p>
    </div>
  );
}