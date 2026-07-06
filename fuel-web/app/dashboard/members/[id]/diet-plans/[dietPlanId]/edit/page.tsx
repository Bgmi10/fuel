"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DietPlanForm from "../../create/manual/page";
import { DietPlanMeal, DietPlanMealItem } from "@prisma/client";

export default function EditDietPlanPage() {
  const params = useParams();

  const dietPlanId = params.dietPlanId as string;

  const [loading, setLoading] =
    useState(true);

  const [dietPlan, setDietPlan] =
    useState<any>(null);

  useEffect(() => {
    loadDietPlan();
  }, []);

  const loadDietPlan = async () => {
    try {
      const res = await fetch(
        `/api/diet-plans/${dietPlanId}`
      );

      const data = await res.json();

      setDietPlan(data.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-white">
        Loading...
      </div>
    );
  }

  return (
    <DietPlanForm
  mode="edit"
  dietPlanId={dietPlan.id}
  initialPlan={{
    title: dietPlan.title,
    instructions:
      dietPlan.instructions,
      startDate: dietPlan.startDate
      ? new Date(dietPlan.startDate)
          .toISOString()
          .split("T")[0]
      : "",
  
    endDate: dietPlan.endDate
      ? new Date(dietPlan.endDate)
          .toISOString()
          .split("T")[0]
      : "", 
    targetCalories:
      dietPlan.targetCalories,

    targetProtein:
      dietPlan.targetProtein,

    targetCarbs:
      dietPlan.targetCarbs,

    targetFat:
      dietPlan.targetFat,
      ...dietPlan
  }}
  initialMeals={dietPlan.meals.map(
    (meal: DietPlanMeal & {
      items: DietPlanMealItem[]
    }) => ({
      id: meal.id,
      name: meal.name,

      foods: meal.items.map(
        (item: DietPlanMealItem) => ({
          id: item.id,
          nutritionMultiplier: item.nutritionMultiplier,

          foodId:
            item.externalFoodId,

          foodName:
            item.foodName,

          quantity:
            item.quantity,

          servingUnit:
            item.servingUnit,

          servingValue: Number(
            item.servingValue
          ),

          calories:
            item.calories,

          protein:
            item.protein,

          carbs:
            item.carbs,

          fat:
            item.fat,
        })
      ),
    })
  )}
/>
  );
}