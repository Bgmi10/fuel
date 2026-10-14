"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import FoodSearchDrawer from "./FoodSearchDrawer";
import EditFoodDrawer from "./EditQuantity";

type Props = {
  meal: any;
  allowAddFood: boolean;
  onUpdateMeal: (mealId: string, meal: any) => void;
  onCopyFromAssignedPlan: (mealId: string) => void;
};

// Same formula as the admin MealCard
const scale = (item: any) => {
  const f = item.servingValue > 0 ? item.quantity / item.servingValue : 1;
  return {
    calories: item.calories * f,
    protein: item.protein * f,
    carbs: item.carbs * f,
    fat: item.fat * f,
  };
};

const fmt = (n: number) => Number(n.toFixed(1));

export default function FoodTrackingMealCard({
  meal,
  allowAddFood,
  onUpdateMeal,
  onCopyFromAssignedPlan,
}: Props) {
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const setItems = (items: any[]) => onUpdateMeal(meal.id, { ...meal, items });

  const updateFood = (foodId: string, field: string, value: any) => {
    setItems(
      meal.items.map((item: any) =>
        item.id === foodId ? { ...item, [field]: value } : item
      )
    );
  };

  // Persist the quantity once the member leaves the field.
  // Macros are not sent: they are always derived from quantity / servingValue.
  // (The PATCH endpoint must accept `quantity`.)
  const saveQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await fetch(`/api/member/food-tracker/item/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error();
    } catch {
      alert("Failed to save quantity");
    }
  };

  const deleteFood = async (itemId: string) => {
    const previous = meal.items;
    setItems(meal.items.filter((i: any) => i.id !== itemId));

    try {
      const res = await fetch(`/api/member/food-tracker/item/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems(previous); // roll back
      alert("Failed to delete");
    }
  };

  const totals = meal.items
    .filter((item: any) => item.consumed)
    .reduce(
      (acc: any, item: any) => {
        const n = scale(item);
        return {
          calories: acc.calories + n.calories,
          protein: acc.protein + n.protein,
          carbs: acc.carbs + n.carbs,
          fat: acc.fat + n.fat,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

  const completed = meal.items.filter((i: any) => i.consumed).length;
  const total = meal.items.length;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold tracking-wide text-white">
            {meal.name}
          </h3>
          <span className="text-sm px-3 py-1 rounded-full bg-lime-400/10 text-lime-300 font-medium">
            {completed}/{total} completed
          </span>
        </div>

        {allowAddFood && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCopyFromAssignedPlan(meal.id)}
              className="h-10 px-4 rounded-xl border border-lime-400/30 bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 transition"
            >
              Copy From Plan
            </button>

            <button
              className="h-10 px-4 rounded-xl bg-lime-400 text-black flex items-center gap-2"
              onClick={() => setShowFoodSearch(true)}
            >
              <Plus size={16} />
              Add Food
            </button>
          </div>
        )}
      </div>

      {/* FOODS */}
      <div className="divide-y divide-white/5">
        {meal.items.map((item: any) => {
          const n = scale(item);

          return (
            <div key={item.id} className="p-5 transition-all">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold">{item.foodName}</h4>

                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateFood(item.id, "quantity", Number(e.target.value))
                      }
                      onBlur={(e) =>
                        saveQuantity(item.id, Number(e.target.value))
                      }
                      className="w-20 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:border-lime-400 outline-none"
                    />
                    <span className="text-gray-300">{item.servingUnit}</span>
                  </div>

                  <div className="flex flex-wrap gap-5 mt-3 text-sm text-gray-300 font-medium">
                    <span>{fmt(n.calories)} kcal</span>
                    <span>P {fmt(n.protein)}g</span>
                    <span>C {fmt(n.carbs)}g</span>
                    <span>F {fmt(n.fat)}g</span>
                  </div>
                </div>

                <button
                  onClick={() => deleteFood(item.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>

                <button
                  onClick={() => setEditingItem(item)}
                  className="h-10 px-4 rounded-xl border border-blue-400/30 bg-blue-400/10 text-blue-300 hover:bg-blue-400/20"
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* TOTALS */}
      <div className="bg-lime-400/5 border-t border-lime-400/10 p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-base">
          {[
            ["Calories", totals.calories, ""],
            ["Protein", totals.protein, "g"],
            ["Carbs", totals.carbs, "g"],
            ["Fat", totals.fat, "g"],
          ].map(([label, value, unit]: any) => (
            <div key={label}>
              <p className="text-gray-300 font-medium">{label}</p>
              <p className="text-xl font-bold text-white mt-1">
                {value.toFixed(1)}
                {unit}
              </p>
            </div>
          ))}
        </div>
      </div>

      <FoodSearchDrawer
        open={showFoodSearch}
        mealId={meal.id}
        onClose={() => setShowFoodSearch(false)}
        onAdded={() => window.location.reload()}
      />

      <EditFoodDrawer
        open={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onUpdated={(updatedItem) => {
          setItems(
            meal.items.map((food: any) =>
              food.id === updatedItem.id ? updatedItem : food
            )
          );
          setEditingItem(null);
        }}
      />
    </div>
  );
}