"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

type FoodLogMealItem = {
  id: string;

  foodName: string;
  brandName?: string | null;

  quantity: number;

  servingUnit: string;
  servingValue: number;
  nutritionMultiplier: number;

  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type Props = {
  open: boolean;
  item: FoodLogMealItem | null;
  onClose: () => void;
  onUpdated: (item: FoodLogMealItem) => void;

};

export default function EditFoodDrawer({
  open,
  item,
  onClose,
  onUpdated
}: Props) {
    console.log(item)
  const [saving, setSaving] = useState(false);

  const [quantity, setQuantity] = useState("");

useEffect(() => {
  if (item) {
    setQuantity(String(item.quantity));
  }
}, [item]);

useEffect(() => {
    if (item) {
      setQuantity(String(item.quantity));
    }
  }, [item]);

  const nutrition = useMemo(() => {
    if (!item) return null;
  
    const multiplier =
      parseInt(quantity) / item.quantity;
  
    return {
      calories: Number(
        (item.calories * multiplier).toFixed(1)
      ),
  
      protein: Number(
        (item.protein * multiplier).toFixed(1)
      ),
  
      carbs: Number(
        (item.carbs * multiplier).toFixed(1)
      ),
  
      fat: Number(
        (item.fat * multiplier).toFixed(1)
      ),
    };
  }, [item, quantity]);
  const saveChanges = async () => {
    if (!item || !nutrition) return;
  

    if (!quantity.trim() || Number(quantity) <= 0) {
        alert("Please enter a valid amount.");
        return;
      }
      
    try {
      setSaving(true);
  
      const res = await fetch(
        `/api/member/food-tracker/meal/${item.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: item.id,
  
            quantity,
  
            calories: nutrition.calories,
            protein: nutrition.protein,
            carbs: nutrition.carbs,
            fat: nutrition.fat,
          }),
        }
      );
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.message);
      }
  
      onUpdated(data.data);
  
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to update food.");
    } finally {
      setSaving(false);
    }
  };


  if (!open || !item) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-screen w-full sm:w-[500px] bg-neutral-950 border-l border-white/10 z-50 overflow-y-auto">

        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-semibold text-lg">
            Edit Food
          </h2>

          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
            <h3 className="font-medium">
              {item.foodName}
            </h3>

            <p className="text-sm text-neutral-500 mt-1">
              {item.brandName}
            </p>
          </div>

          <div>
            <label className="text-sm text-neutral-400">
              {item.servingUnit}
            </label>



  <div className="mt-2 flex overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">

    <input
      type="number"
      min={0}
      step="0.1"
      value={quantity}
      
  onChange={(e) => setQuantity(e.target.value)}
      className="flex-1 bg-transparent px-4 h-12 outline-none"
    />

    <div className="px-4 flex items-center border-l border-neutral-800 text-neutral-400 capitalize">
      {item.servingUnit}
    </div>

  </div>
</div>

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

<button
  disabled={saving}
  onClick={saveChanges}
  className="w-full h-11 rounded-xl bg-lime-400 text-black font-medium disabled:opacity-50"
>
  {saving ? "Saving..." : "Save Changes"}
</button>

          </div>

        </div>

      </div>
    </>
  );
}

function MacroCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
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