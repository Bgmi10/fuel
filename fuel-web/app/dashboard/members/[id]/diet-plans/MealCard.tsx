"use client";

import { Trash2 } from "lucide-react";
import FoodSearchInput from "./FoodSearchInput";

export default function MealCard({
  meal,
  onMealNameChange,
  onRemoveMeal,
  onAddFood,
  onRemoveFood,
  onUpdateFoodQuantity,
}: any) {
  const calculateFood = (food: any) => {
    const multiplier =
  food.servingValue > 0
    ? food.quantity / food.servingValue
    : 1;
    return {
      calories:
        food.calories * multiplier,

      protein:
        food.protein * multiplier,

      carbs:
        food.carbs * multiplier,

      fat:
        food.fat * multiplier,
    };
  };

  const totals = meal.foods.reduce(
    (acc: any, food: any) => {
      const nutrition =
        calculateFood(food);

      acc.calories += nutrition.calories;
      acc.protein += nutrition.protein;
      acc.carbs += nutrition.carbs;
      acc.fat += nutrition.fat;

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
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
      {/* Header */}

      <div className="flex items-center gap-3 mb-5">
        <input
          value={meal.name}
          onChange={(e) =>
            onMealNameChange(
              meal.id,
              e.target.value
            )
          }
          placeholder="Meal Name"
          className="flex-1 h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
        />

        <button
          onClick={() =>
            onRemoveMeal(meal.id)
          }
          className="w-12 h-12 rounded-xl border border-red-500/30 flex items-center justify-center"
        >
          <Trash2
            size={16}
            className="text-red-400"
          />
        </button>
      </div>

    

      {/* Search */}

      <FoodSearchInput
  onSelect={(food: any) => {
    console.log(food)
    const serving =
      food.serving_sizes?.[0];

      onAddFood(meal.id, {
        id: crypto.randomUUID(),
      
        foodId: food.id,
      
        foodName: food.description,
      
        brandName: food.brand_name,
      
        calories:
          food.nutritional_contents?.energy
            ?.value || 0,
      
        protein:
          food.nutritional_contents
            ?.protein || 0,
      
        carbs:
          food.nutritional_contents
            ?.carbohydrates || 0,
      
        fat:
          food.nutritional_contents?.fat ||
          0,
                
          nutritionMultiplier:
          serving.nutrition_multiplier,
          
        servingUnit:
          serving?.unit || "g",
      
        servingValue:
          serving?.value || 100,
      
        quantity:
          serving?.value || 100,
      });
  }}
/>

      {/* Foods */}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-neutral-400 border-b border-neutral-800">
              <th className="text-left py-3">
                Food
              </th>

              <th className="text-left py-3">
                Qty
              </th>

              <th className="text-left py-3">
                Unit
              </th>

              <th className="text-left py-3">
                Cal
              </th>

              <th className="text-left py-3">
                Protein
              </th>

              <th className="text-left py-3">
                Carbs
              </th>

              <th className="text-left py-3">
                Fat
              </th>

              <th />
            </tr>
          </thead>

          <tbody>
            {meal.foods.map(
              (food: any) => {
                const nutrition =
                  calculateFood(food);

                return (
                  <tr
                    key={food.id}
                    className="border-b border-neutral-800"
                  >
                    <td className="py-3">
                      {
                        food.foodName
                      }
                    </td>

                    <td className="py-3">
                      <input
                        type="number"
                        min="1"
                        value={
                          food.quantity
                        }
                        onChange={(
                          e
                        ) =>
                          onUpdateFoodQuantity(
                            meal.id,
                            food.id,
                            Number(
                              e
                                .target
                                .value
                            )
                          )
                        }
                        className="w-24 h-10 px-3 rounded-lg bg-neutral-800 border border-neutral-700"
                      />
                    </td>

                    <td className="py-3">
                      {
                        food.servingUnit
                      }
                    </td>

                    <td className="py-3">
                      {nutrition.calories.toFixed(
                        1
                      )}
                    </td>

                    <td className="py-3">
                      {nutrition.protein.toFixed(
                        1
                      )}
                    </td>

                    <td className="py-3">
                      {nutrition.carbs.toFixed(
                        1
                      )}
                    </td>

                    <td className="py-3">
                      {nutrition.fat.toFixed(
                        1
                      )}
                    </td>

                    <td className="py-3">
                      <button
                        onClick={() =>
                          onRemoveFood(
                            meal.id,
                            food.id
                          )
                        }
                      >
                        <Trash2
                          size={14}
                          className="text-red-400"
                        />
                      </button>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      {/* Meal Total */}

      <div className="mt-5 border-t border-neutral-800 pt-5">
        <h4 className="font-semibold mb-3">
          Meal Totals
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-neutral-800 rounded-xl p-3">
            <div className="text-xs text-neutral-400">
              Calories
            </div>

            <div className="font-semibold">
              {totals.calories.toFixed(
                1
              )}
            </div>
          </div>

          <div className="bg-neutral-800 rounded-xl p-3">
            <div className="text-xs text-neutral-400">
              Protein
            </div>

            <div className="font-semibold">
              {totals.protein.toFixed(
                1
              )}
              g
            </div>
          </div>

          <div className="bg-neutral-800 rounded-xl p-3">
            <div className="text-xs text-neutral-400">
              Carbs
            </div>

            <div className="font-semibold">
              {totals.carbs.toFixed(
                1
              )}
              g
            </div>
          </div>

          <div className="bg-neutral-800 rounded-xl p-3">
            <div className="text-xs text-neutral-400">
              Fat
            </div>

            <div className="font-semibold">
              {totals.fat.toFixed(
                1
              )}
              g
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}