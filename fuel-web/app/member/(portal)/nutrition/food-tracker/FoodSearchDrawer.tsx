"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import FoodSearchInput from "@/app/dashboard/members/[id]/diet-plans/FoodSearchInput";

type Props = {
    open: boolean;
    mealId: string;
    onClose: () => void;
    onAdded: (food: any) => void;
  };

export default function FoodSearchDrawer({
  open,
  mealId,
  onClose,
  onAdded,
}: Props) {
  const [selectedFood, setSelectedFood] =
    useState<any>(null);

const [selectedServing, setSelectedServing] =
  useState<any>(null);

  


  const [quantity, setQuantity] =
    useState(100);

  const [saving, setSaving] =
    useState(false);

    const nutrition = useMemo(() => {
        if (!selectedFood || !selectedServing)
          return null;
        const multiplier =
        (quantity / selectedServing.value) *
        selectedServing.nutrition_multiplier;
      
        const base =
          selectedFood.nutritional_contents;
      
        return {
          calories:
            
              ((base.energy?.value || 0) *
                multiplier).toFixed(1),
      
          protein: (
            (base.protein || 0) *
            multiplier
          ).toFixed(1),
      
          carbs: (
            (base.carbohydrates || 0) *
            multiplier
          ).toFixed(1),
      
          fat: (
            (base.fat || 0) *
            multiplier
          ).toFixed(1),
        };
      }, [
        selectedFood,
        selectedServing,
        quantity,
      ]);
  const addFood =
    async () => {
      if (!selectedFood)
        return;

      try {
        setSaving(true);

        const res =
          await fetch(
            "/api/member/food-tracker/item",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                mealId,

                externalFoodId:
                  selectedFood.id,
                  servingValue:
selectedServing.value,

nutritionMultiplier:
selectedServing.nutrition_multiplier,


                foodName:
                  selectedFood.description,

                brandName:
                  selectedFood.brand_name,

                quantity,

                servingUnit:
                  selectedFood
                    ?.serving_sizes?.[0]
                    ?.unit || "g",

                calories:
                  Number(
                    nutrition?.calories
                  ),

                protein:
                  Number(
                    nutrition?.protein
                  ),

                carbs:
                  Number(
                    nutrition?.carbs
                  ),

                fat: Number(
                  nutrition?.fat
                ),
              }),
            }
          );
        const data = await res.json();
        if (!res.ok)
          throw new Error();
         console.log(data)
        onAdded(data.data);
        onClose();

        
        setSelectedFood(null);
        setQuantity(100);
      } catch {
        alert(
          "Failed to add food"
        );
      } finally {
        setSaving(false);
      }
    };

  if (!open)
    return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-screen w-full sm:w-[500px] bg-neutral-950 border-l border-white/10 z-50 overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-semibold text-lg">
            Add Food
          </h2>

          <button
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
        <FoodSearchInput
  onSelect={(food) => {
    const item =
      food.item || food;

    setSelectedFood(item);

    setSelectedServing(
      item?.serving_sizes?.[0] || null
    );

    setQuantity(1);
  }}
/>

{selectedFood && (
  <>
    {/* FOOD INFO */}

    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
      <h3 className="font-medium">
        {selectedFood.description}
      </h3>

      <p className="text-sm text-neutral-500 mt-1">
        {selectedFood.brand_name}
      </p>
    </div>

    {/* SERVING SIZE */}

    <div>
      <label className="text-sm text-neutral-400">
        Serving Size
      </label>

      <select
        value={selectedServing?.unit || ""}
        onChange={(e) => {
          const serving =
            selectedFood.serving_sizes.find(
              (s: any) =>
                s.unit === e.target.value
            );

          setSelectedServing(serving);
        }}
        className="w-full mt-2 h-11 px-4 rounded-xl bg-neutral-900 border border-neutral-800"
      >
        {selectedFood.serving_sizes?.map(
          (size: any) => (
            <option
              key={size.unit}
              value={size.unit}
            >
              {size.unit}
            </option>
          )
        )}
      </select>
    </div>

    {/* QUANTITY */}

    <div>
      <label className="text-sm text-neutral-400">
        {selectedServing?.unit}
      </label>

      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={() =>
            setQuantity((q) =>
              Math.max(1, q - 1)
            )
          }
          className="w-11 h-11 rounded-xl bg-neutral-900 border border-neutral-800"
        >
          -
        </button>

        <div className="flex-1 h-11 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center font-medium">
          {quantity}
        </div>

        <button
          type="button"
          onClick={() =>
            setQuantity((q) => q + 1)
          }
          className="w-11 h-11 rounded-xl bg-neutral-900 border border-neutral-800"
        >
          +
        </button>
      </div>
    </div>

    {/* NUTRITION */}

    <div className="grid grid-cols-2 gap-3">
      <MacroCard
        title="Calories"
        value={`${nutrition?.calories} kcal`}
      />

      <MacroCard
        title="Protein"
        value={`${nutrition?.protein} g`}
      />

      <MacroCard
        title="Carbs"
        value={`${nutrition?.carbs} g`}
      />

      <MacroCard
        title="Fat"
        value={`${nutrition?.fat} g`}
      />
    </div>

    <button
      disabled={saving}
      onClick={addFood}
      className="w-full h-11 rounded-xl bg-lime-400 text-black font-medium"
    >
      {saving
        ? "Adding..."
        : "Add To Meal"}
    </button>
  </>
)}
        </div>
      </div>
    </>
  );
}

function MacroCard({
  title,
  value,
}: any) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
      <p className="text-xs text-neutral-500">
        {title}
      </p>

      <p className="font-semibold mt-1">
        {value}
      </p>
    </div>
  );
}