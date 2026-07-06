  "use client";

  import { useState } from "react";
  import { useParams, useRouter } from "next/navigation";
  import {
    Apple,
    Plus,
    Save,
  } from "lucide-react";
  import MealCard from "../../MealCard";



  type DietPlanFormProps = {
    initialPlan?: any;
    initialMeals?: any[];
    mode?: "create" | "edit";
    dietPlanId?: string;
  };

  type FoodItem = {
      id: string;
    
      foodId: string;
      name: string;
    
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    
      quantity: number;
    };
    
    type Meal = {
      id: string;
      name: string;
      foods: FoodItem[];
    };

    function DietPlanForm({
      initialPlan,
      initialMeals,
      mode = "create",
      dietPlanId,
    }: DietPlanFormProps) {
    const { id: memberId } = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    
    const [plan, setPlan] = useState({
      title: initialPlan?.title || "",
      instructions: initialPlan?.instructions || "",
    
      startDate: initialPlan?.startDate || "",
      endDate: initialPlan?.endDate || "",
    
      targetCalories: initialPlan?.targetCalories || 2500,
    
      macroDistributionType:
        initialPlan?.macroDistributionType || "GRAMS",
    
      targetProtein: initialPlan?.targetProtein || 180,
      targetCarbs: initialPlan?.targetCarbs || 250,
      targetFat: initialPlan?.targetFat || 70,
    
      targetProteinPercentage:
        initialPlan?.targetProteinPercentage || 30,
    
      targetCarbsPercentage:
        initialPlan?.targetCarbsPercentage || 45,
    
      targetFatPercentage:
        initialPlan?.targetFatPercentage || 25,
    });
    

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

    const [meals, setMeals] = useState<Meal[]>(
      initialMeals?.length
        ? initialMeals
        : [
            {
              id: crypto.randomUUID(),
              name: "Breakfast",
              foods: [],
            },
            {
              id: crypto.randomUUID(),
              name: "Lunch",
              foods: [],
            },
            {
              id: crypto.randomUUID(),
              name: "Dinner",
              foods: [],
            },
          ]
    );

    const nutritionTotals = meals.reduce(
      (acc, meal) => {
        meal.foods.forEach((food: any) => {
          const multiplier =
            food.quantity / food.servingValue;
    
          acc.calories +=
            food.calories * multiplier;
    
          acc.protein +=
            food.protein * multiplier;
    
          acc.carbs +=
            food.carbs * multiplier;
    
          acc.fat +=
            food.fat * multiplier;
    
          acc.foodCount += 1;
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

    const addMeal = () => {
      setMeals((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: "",
          foods: [],
        },
      ]);
    };
    const removeMeal = (mealId: string) => {
      setMeals((prev) =>
        prev.filter((meal) => meal.id !== mealId)
      );
    };

    const updateMeal = (
      mealId: string,
      value: string
    ) => {
      setMeals((prev) =>
        prev.map((meal) =>
          meal.id === mealId
            ? {
                ...meal,
                name: value,
              }
            : meal
        )
      );
    };

    const addFood = (
      mealId: string,
      food: any
    ) => {
      setMeals((prev) =>
        prev.map((meal) =>
          meal.id === mealId
            ? {
                ...meal,
                foods: [
                  ...(meal.foods || []),
                  food,
                ],
              }
            : meal
        )
      );
    };
    
    const removeFood = (
      mealId: string,
      foodId: string
    ) => {
      setMeals((prev) =>
        prev.map((meal) =>
          meal.id === mealId
            ? {
                ...meal,
                foods: meal.foods.filter(
                  (food: any) =>
                    food.id !== foodId
                ),
              }
            : meal
        )
      );
    };
    
    const updateFoodQuantity = (
      mealId: string,
      foodId: string,
      quantity: number
    ) => {
      setMeals((prev) =>
        prev.map((meal) =>
          meal.id === mealId
            ? {
                ...meal,
                foods: meal.foods.map(
                  (food: any) =>
                    food.id === foodId
                      ? {
                          ...food,
                          quantity,
                        }
                      : food
                ),
              }
            : meal
        )
      );
    };

    const handleSubmit = async () => {
      try {
        setLoading(true);
    
        const payload = {
          memberId,
        
          title: plan.title,
          instructions: plan.instructions,
        
          startDate: plan.startDate,
          endDate: plan.endDate,
        
          targetCalories: plan.targetCalories,
        
          macroDistributionType:
            plan.macroDistributionType,
        
          targetProtein: plan.targetProtein,
          targetCarbs: plan.targetCarbs,
          targetFat: plan.targetFat,
        
          targetProteinPercentage:
            plan.targetProteinPercentage,
        
          targetCarbsPercentage:
            plan.targetCarbsPercentage,
        
          targetFatPercentage:
            plan.targetFatPercentage,
        
          meals,
        };

        if (
          plan.macroDistributionType === "PERCENTAGE"
        ) {
          const total =
            plan.targetProteinPercentage +
            plan.targetCarbsPercentage +
            plan.targetFatPercentage;
        
          if (total !== 100) {
            alert(
              "Protein, Carbs and Fat percentages must equal 100%."
            );
            setLoading(false);
            return;
          }
        }
    
        const endpoint =
          mode === "edit"
            ? `/api/diet-plans/${dietPlanId}`
            : "/api/diet-plans";
    
        const method =
          mode === "edit"
            ? "PUT"
            : "POST";
    
        const res = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        });
    
        if (!res.ok) {
          throw new Error(
            `Failed to ${
              mode === "edit"
                ? "update"
                : "create"
            } plan`
          );
        }
    
        router.push(
          `/dashboard/members/${memberId}/diet-plans`
        );
      } catch (err) {
        console.error(err);
    
        alert(
          mode === "edit"
            ? "Failed to update plan"
            : "Failed to create plan"
        );
      } finally {
        setLoading(false);
      }
    };


    const percentageTotal =
  plan.targetProteinPercentage +
  plan.targetCarbsPercentage +
  plan.targetFatPercentage;

const percentageValid =
  percentageTotal === 100;

  
    return (
      <div className="p-6 text-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_320px] gap-6">
          {/* MAIN */}
          <div className="space-y-6">
          <button
              onClick={() => router.back()}
              className="text-neutral-400 hover:text-white mb-3"
            >
              ← Back
            </button>
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Apple className="text-lime-400" />
                {mode === "edit"
    ? "Edit Diet Plan"
    : "Create Diet Plan"}
              </h1>

              <p className="text-neutral-400 mt-1">
              {mode === "edit"
    ? "Update the member diet plan"
    : "Build a diet plan for the member"}
              </p>
            </div>

            {/* PLAN INFO */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
              <h2 className="font-semibold text-lg mb-5">
                Plan Information
              </h2>

              <div className="space-y-4">
                <input
                  placeholder="Plan Name"
                  value={plan.title}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      title: e.target.value,
                    })
                  }
                  className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
                />

                <textarea
                  rows={4}
                  placeholder="Instructions"
                  value={plan.instructions}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      instructions: e.target.value,
                    })
                  }
                  className="w-full p-4 rounded-xl bg-neutral-800 border border-neutral-700"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={plan.startDate}
                    onChange={(e) =>
                      setPlan({
                        ...plan,
                        startDate: e.target.value,
                      })
                    }
                    className="h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
                  />

                  <input
                    type="date"
                    value={plan.endDate}
                    onChange={(e) =>
                      setPlan({
                        ...plan,
                        endDate: e.target.value,
                      })
                    }
                    className="h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
                  />
                </div>
              </div>
            </div>

            {/* MACROS */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
    <h2 className="font-semibold text-lg mb-5">
      Macro Targets
    </h2>
    <div className="mb-6">
    <label className="block text-sm text-neutral-400 mb-2">
      Macro Distribution
    </label>

    <div className="flex rounded-xl overflow-hidden border border-neutral-700">
      <button
        type="button"
        onClick={() =>
          setPlan({
            ...plan,
            macroDistributionType: "GRAMS",
          })
        }
        className={`flex-1 h-11 ${
          plan.macroDistributionType === "GRAMS"
            ? "bg-lime-400 text-black"
            : "bg-neutral-800 text-white"
        }`}
      >
        Grams
      </button>

      <button
        type="button"
        onClick={() =>
          setPlan({
            ...plan,
            macroDistributionType: "PERCENTAGE",
          })
        }
        className={`flex-1 h-11 ${
          plan.macroDistributionType === "PERCENTAGE"
            ? "bg-lime-400 text-black"
            : "bg-neutral-800 text-white"
        }`}
      >
        Percentage
      </button>
    </div>
  </div>

  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">

    {/* Calories - Always Visible */}
    <div>
      <label className="block text-sm text-neutral-400 mb-2">
        Target Calories
      </label>

      <input
        type="number"
        placeholder="e.g. 2200"
        value={plan.targetCalories}
        onChange={(e) =>
          setPlan({
            ...plan,
            targetCalories: Number(e.target.value),
          })
        }
        className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
      />

      <p className="text-xs text-neutral-500 mt-1">
        kcal/day
      </p>
    </div>

    {plan.macroDistributionType === "GRAMS" ? (
      <>
        {/* Protein */}
        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Target Protein
          </label>

          <input
            type="number"
            placeholder="e.g. 150"
            value={plan.targetProtein}
            onChange={(e) =>
              setPlan({
                ...plan,
                targetProtein: Number(e.target.value),
              })
            }
            className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
          />

          <p className="text-xs text-neutral-500 mt-1">
            grams/day
          </p>
        </div>

        {/* Carbs */}
        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Target Carbs
          </label>

          <input
            type="number"
            placeholder="e.g. 250"
            value={plan.targetCarbs}
            onChange={(e) =>
              setPlan({
                ...plan,
                targetCarbs: Number(e.target.value),
              })
            }
            className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
          />

          <p className="text-xs text-neutral-500 mt-1">
            grams/day
          </p>
        </div>

        {/* Fat */}
        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Target Fat
          </label>

          <input
            type="number"
            placeholder="e.g. 70"
            value={plan.targetFat}
            onChange={(e) =>
              setPlan({
                ...plan,
                targetFat: Number(e.target.value),
              })
            }
            className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
          />

          <p className="text-xs text-neutral-500 mt-1">
            grams/day
          </p>
        </div>
      </>
    ) : (
      <>
        {/* Protein % */}
        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Protein %
          </label>

          <input
            type="number"
            min={0}
            max={100}
            value={plan.targetProteinPercentage}
            onChange={(e) =>
              setPlan({
                ...plan,
                targetProteinPercentage: Number(e.target.value),
              })
            }
            className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
          />

          <p className="text-xs text-neutral-500 mt-1">
            ≈ {targetProtein.toFixed(1)} g/day
          </p>
        </div>

        {/* Carbs % */}
        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Carbs %
          </label>

          <input
            type="number"
            min={0}
            max={100}
            value={plan.targetCarbsPercentage}
            onChange={(e) =>
              setPlan({
                ...plan,
                targetCarbsPercentage: Number(e.target.value),
              })
            }
            className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
          />

          <p className="text-xs text-neutral-500 mt-1">
            ≈ {targetCarbs.toFixed(1)} g/day
          </p>
        </div>

        {/* Fat % */}
        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Fat %
          </label>

          <input
            type="number"
            min={0}
            max={100}
            value={plan.targetFatPercentage}
            onChange={(e) =>
              setPlan({
                ...plan,
                targetFatPercentage: Number(e.target.value),
              })
            }
            className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
          />

          <p className="text-xs text-neutral-500 mt-1">
            ≈ {targetFat.toFixed(1)} g/day
          </p>
        </div>
      </>
    )}
  </div>

  {plan.macroDistributionType === "PERCENTAGE" && (
    <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-800/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-400">
          Total Distribution
        </span>

        <span
          className={`font-semibold ${
            plan.targetProteinPercentage +
              plan.targetCarbsPercentage +
              plan.targetFatPercentage ===
            100
              ? "text-lime-400"
              : "text-red-400"
          }`}
        >
          {plan.targetProteinPercentage +
            plan.targetCarbsPercentage +
            plan.targetFatPercentage}
          %
        </span>
      </div>

      <p className="mt-2 text-xs text-neutral-500">
        Protein, carbohydrates and fat percentages should total 100%.
      </p>
    </div>
  )}
  </div>

            {/* MEALS */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-lg">
                  Meals
                </h2>

                <button
                  onClick={addMeal}
                  className="h-10 px-4 rounded-xl bg-lime-400 text-black flex items-center gap-2"
                >
                  <Plus size={15} />
                  Add Meal
                </button>
              </div>

              <div className="space-y-5">
    {meals.map((meal) => (
    <MealCard
    key={meal.id}
    meal={meal}
    onMealNameChange={updateMeal}
    onRemoveMeal={removeMeal}
    onAddFood={addFood}
    onRemoveFood={removeFood}
    onUpdateFoodQuantity={
      updateFoodQuantity
    }
  />
    ))}
  </div>
            </div>

            {/* SAVE */}
            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                (
                  plan.macroDistributionType === "PERCENTAGE" &&
                  !percentageValid
                )
              }
              className="h-12 px-6 rounded-xl bg-lime-400 text-black font-semibold flex items-center gap-2"
            >
              <Save size={16} />
              {
                loading
                ? mode === "edit"
                  ? "Updating..."
                  : "Creating..."
                : mode === "edit"
                ? "Update Diet Plan"
                : "Create Diet Plan"
              }
            </button>
          </div>

          {/* SIDEBAR */}
          <div>
    <div className="sticky top-6 space-y-4">
      
      {/* OVERVIEW */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
        <h3 className="font-semibold text-lg mb-4">
          Diet Summary
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-800 rounded-xl p-3">
            <div className="text-xs text-neutral-400">
              Meals
            </div>
            <div className="text-xl font-bold">
              {meals.length}
            </div>
          </div>

          <div className="bg-neutral-800 rounded-xl p-3">
            <div className="text-xs text-neutral-400">
              Foods
            </div>
            <div className="text-xl font-bold">
              {nutritionTotals.foodCount}
            </div>
          </div>
        </div>
      </div>

      {/* CALORIES */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
        <h3 className="font-semibold mb-4">
          Calories
        </h3>

        <div className="flex justify-between text-sm mb-2">
          <span>Planned</span>

          <span>
            {nutritionTotals.calories.toFixed(
              1
            )}{" "}
            / {plan.targetCalories.toFixed(1)}
          </span>
        </div>

        <div className="h-3 rounded-full bg-neutral-800 overflow-hidden">
          <div
            className="h-full bg-lime-400"
            style={{
              width: `${caloriePercent}%`,
            }}
          />
        </div>
      </div>

      {/* MACROS */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
        <h3 className="font-semibold mb-4">
          Macro Breakdown
        </h3>

        <div className="space-y-5">

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Protein</span>

              <span>
                {nutritionTotals.protein.toFixed(
                  1
                )}g / {targetProtein.toFixed(1)}g
              </span>
            </div>

            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-lime-400"
                style={{
                  width: `${proteinPercent}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Carbs</span>

              <span>
                {nutritionTotals.carbs.toFixed(
                  1
                )}g / {targetCarbs.toFixed(1)}g
              </span>
            </div>

            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-lime-400"
                style={{
                  width: `${carbPercent}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Fat</span>

              <span>
                {nutritionTotals.fat.toFixed(
                  1
                )}g / {targetFat.toFixed(1)}g
              </span>
            </div>

            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
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

      {/* TARGET VS ACTUAL */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
        <h3 className="font-semibold mb-4">
          Remaining
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span>Calories</span>

            <span>
              {(
                plan.targetCalories -
                nutritionTotals.calories
              ).toFixed(1)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Protein</span>

            <span>
              {(
              targetProtein -
              nutritionTotals.protein
              ).toFixed(1)}
              g
            </span>
          </div>

          <div className="flex justify-between">
            <span>Carbs</span>

            <span>
              {(
                targetCarbs -
                nutritionTotals.carbs
              ).toFixed(1)}
              g
            </span>
          </div>

          <div className="flex justify-between">
            <span>Fat</span>

            <span>
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

  export default DietPlanForm;  