    "use client";

    import {
    Plus,
    Trash2,
    } from "lucide-react";
import { useState } from "react";
import FoodSearchDrawer from "./FoodSearchDrawer";
import EditFoodDrawer from "./EditQuantity";

type Props = {
  meal: any;
  allowAddFood: boolean;
  onUpdateMeal: (
    mealId: string,
    meal: any
  ) => void;

  onCopyFromAssignedPlan: (
    mealId: string
  ) => void;
};

    export default function FoodTrackingMealCard({
    meal,
    allowAddFood,
    onUpdateMeal,

  onCopyFromAssignedPlan,
    }: Props) {

        const [
            showFoodSearch,
            setShowFoodSearch,
          ] = useState(false);

          const [editingItem, setEditingItem] =
          useState<any>(null);

          
    const updateFood = (
        foodId: string,
        field: string,
        value: any
    ) => {
      
        const updatedFoods =
        meal.items.map((item: any) =>
            item.id === foodId
            ? {
                ...item,
                [field]: value,
                }
            : item
        );

        onUpdateMeal(meal.id, {
        ...meal,
        items: updatedFoods,
        });
    };

    const removeFood = (
        foodId: string
    ) => {
        const updatedFoods =
        meal.items.filter(
            (item: any) =>
            item.id !== foodId
        );

        onUpdateMeal(meal.id, {
        ...meal,
        items: updatedFoods,
        });
    };

    const totals =
    meal.items
      .filter(
        (item: any) =>
          item.consumed
      )
      .reduce(
        (acc: any, item: any) => ({
          calories:
            acc.calories +
            item.calories,
  
          protein:
            acc.protein +
            item.protein,
  
          carbs:
            acc.carbs +
            item.carbs,
  
          fat:
            acc.fat +
            item.fat,
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }
      );



      const completed =
  meal.items.filter(
    (i:any) => i.consumed
  ).length;

const total =
  meal.items.length;


  const toggleConsumed = async (
    itemId: string,
    consumed: boolean
  ) => {
    try {
      await fetch(
        `/api/member/food-tracker/item/${itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            consumed,
          }),
        }
      );
  
      updateFood(
        itemId,
        "consumed",
        consumed
      );
        window.location.reload();
    } catch {
      alert("Failed");
    }
  };


  const deleteFood = async (
    itemId: string
  ) => {

    const deletedItem =
  meal.items.find(
    (i: any) => i.id === itemId
  );
    removeFood(itemId);
    try {
      await fetch(
        `/api/member/food-tracker/item/${itemId}`,
        {
          method: "DELETE",
        }
      );
  
      window.location.reload();

    } catch {
        if (deletedItem) {
            onUpdateMeal(meal.id, {
              ...meal,
              items: [
                ...meal.items,
                deletedItem,
              ],
            });
          }
      alert("Failed");
    }
  };


     

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
  {meal.items.map((item: any) => (
    <div
      key={item.id}
      className={`p-5 transition-all ${
        item.consumed
          ? "bg-lime-400/5"
          : ""
      }`}
    >
      <div className="flex justify-between items-start gap-4">
      <div className="flex items-center gap-2">


</div>

        <label className="flex gap-3 flex-1 cursor-pointer">

          <input
            type="checkbox"
            checked={item.consumed}
            onChange={(e) =>
                toggleConsumed(
                  item.id,
                  e.target.checked
                )
              }
            className="mt-1 h-5 w-5 accent-lime-400"
          />

          <div>
          <h4
  className={`text-lg font-semibold ${
    item.consumed
      ? "line-through text-gray-400"
      : "text-white"
  }`}
>
              {item.foodName}
            </h4>
            <div className="flex items-center gap-2 mt-2">
  <input
    type="number"
    min={0}
    step="0.1"
    value={item.quantity}
    onChange={(e) =>
      updateFood(
        item.id,
        "quantity",
        Number(e.target.value)
      )
    }
    className="w-20 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:border-lime-400 outline-none"
  />

  <span className="text-gray-300">
    {item.servingUnit}
  </span>
</div>

            <div className="flex flex-wrap gap-5 mt-3 text-sm text-gray-300 font-medium">
              <span>
                {item.calories} kcal
              </span>

              <span>
                P {item.protein}g
              </span>

              <span>
                C {item.carbs}g
              </span>

              <span>
                F {item.fat}g
              </span>
            </div>
          </div>
        </label>

        <button
          onClick={() =>
            deleteFood(item.id)
          }
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
  ))}
        </div>

        {/* TOTALS */}

        <div className="bg-lime-400/5 border-t border-lime-400/10 p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-base">
            <div>
            <div>
    <p className="text-gray-300 font-medium">
        Calories
    </p>

    <p className="text-xl font-bold text-white mt-1">
                {(
                    totals.calories
                ).toFixed(1)}
                </p>
                </div>
            </div>

            <div>
                Protein
                <div className="font-semibold">
                <p className="text-xl font-bold text-white mt-1">
                {totals.protein.toFixed(
                    1
                )}
                g
                </p>
                </div>
            </div>

            <div>
                Carbs
                <div className="font-semibold">
                <p className="text-xl font-bold text-white mt-1">

                {totals.carbs.toFixed(
                    1
                )}
                g
                </p>
                </div>
            </div>

            <div>
                Fat
                <div className="font-semibold">
                <p className="text-xl font-bold text-white mt-1">

                {totals.fat.toFixed(
                    1
                )}
                g
                </p>
                </div>
            </div>
            </div>
        </div>

        <FoodSearchDrawer
  open={showFoodSearch}
  mealId={meal.id}
  onClose={() =>
    setShowFoodSearch(false)
  }
  onAdded={() => {
    window.location.reload();
  }}
/>

<EditFoodDrawer
  open={!!editingItem}
  item={editingItem}
  onClose={() => setEditingItem(null)}
  onUpdated={(updatedItem) => {
    const updatedFoods =
      meal.items.map((food: any) =>
        food.id === updatedItem.id
          ? updatedItem
          : food
      );

    onUpdateMeal(meal.id, {
      ...meal,
      items: updatedFoods,
    });

    setEditingItem(null);
  }}
/>

        </div>
    );
    }