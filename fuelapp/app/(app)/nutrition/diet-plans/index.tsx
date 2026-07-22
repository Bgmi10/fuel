import React, {
    ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
  } from "react";
  
  import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    View,
  } from "react-native";
  
  import tw from "twrnc";
  
  import {
    Apple,
    Beef,
    CalendarDays,
    ChefHat,
    Droplets,
    Flame,
    Target,
    Utensils,
    Wheat,
  } from "lucide-react-native";
  
  import { useAuth } from "../../../../src/contexts/AuthContext";
  
  import {
    useNutritionRefresh,
  } from "../../../../src/contexts/NutritionRefreshContext";
  
  import { request } from "../../../../src/api/client";
  
  interface NutritionTotals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }
  
  interface DietPlanItem {
    id: string;
    foodName: string;
    quantity: number;
    servingUnit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }
  
  interface DietPlanMeal {
    id: string;
    name: string;
    items: DietPlanItem[];
    totals: NutritionTotals;
  }
  
  interface DietPlan {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    instructions?: string | null;
  
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
  
    meals: DietPlanMeal[];
    dailyTotals: NutritionTotals;
  }
  
  export default function DietPlansScreen() {
    const { user: member } = useAuth();
  
    const { refreshKey } =
      useNutritionRefresh();
  
    const loadedRef = useRef(false);
  
    const [loading, setLoading] =
      useState(true);
  
    const [plan, setPlan] =
      useState<DietPlan | null>(null);
  
    const [error, setError] =
      useState<string | null>(null);
  
    const loadPlan = useCallback(
      async (showLoader = false) => {
        if (!member?.id) {
          setPlan(null);
          setLoading(false);
          return;
        }
  
        try {
          if (showLoader) {
            setLoading(true);
          }
  
          setError(null);
  
          const response = await request({
            url:
              `/member/diet/active?memberId=${member.id}`,
          });
  
          /*
            Supports either:
  
            {
              data: plan
            }
  
            or a directly returned plan.
          */
          const nextPlan =
            response?.data !== undefined
              ? response.data
              : response;
  
          setPlan(nextPlan || null);
        } catch (err) {
          console.log(
            "Failed to load diet plan:",
            err
          );
  
          setError(
            "Unable to load your nutrition plan."
          );
        } finally {
          loadedRef.current = true;
          setLoading(false);
        }
      },
      [member?.id]
    );
  
    useEffect(() => {
      loadPlan(!loadedRef.current);
    }, [loadPlan, refreshKey]);
  
    if (loading) {
      return (
        <View
          style={tw`py-20 items-center justify-center`}
        >
          <ActivityIndicator
            size="large"
            color="#A3E635"
          />
  
          <Text
            style={tw`text-neutral-400 mt-4`}
          >
            Loading your nutrition plan...
          </Text>
        </View>
      );
    }
  
    if (error && !plan) {
      return (
        <View
          style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-8 items-center`}
        >
          <Apple
            size={48}
            color="#737373"
          />
  
          <Text
            style={tw`text-white text-xl font-bold mt-5 text-center`}
          >
            Unable to Load Plan
          </Text>
  
          <Text
            style={tw`text-neutral-400 mt-2 text-center leading-5`}
          >
            {error}
          </Text>
  
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              loadPlan(true)
            }
            style={[
              tw`mt-6 rounded-2xl px-8 py-3`,
              {
                backgroundColor: "#A3E635",
              },
            ]}
          >
            <Text
              style={tw`text-black font-bold`}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
  
    if (!plan) {
      return (
        <View
          style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-8 items-center`}
        >
          <View
            style={[
              tw`h-20 w-20 rounded-full items-center justify-center`,
              {
                backgroundColor:
                  "rgba(163,230,53,0.08)",
              },
            ]}
          >
            <Apple
              size={42}
              color="#737373"
            />
          </View>
  
          <Text
            style={tw`text-white text-2xl font-bold mt-5 text-center`}
          >
            No Nutrition Plan Yet
          </Text>
  
          <Text
            style={tw`text-neutral-400 mt-3 text-center leading-6`}
          >
            Your coach hasn't assigned a
            nutrition plan yet.
          </Text>
        </View>
      );
    }
  
    const meals = plan.meals ?? [];
  
    return (
      <View style={tw`pb-10`}>
        {/* Active Plan Hero */}
  
        <View
          style={tw`border border-neutral-800 bg-neutral-900 rounded-3xl p-5`}
        >
          <View
            style={[
              tw`self-start px-3 py-2 rounded-full`,
              {
                backgroundColor:
                  "rgba(163,230,53,0.1)",
              },
            ]}
          >
            <Text
              style={{
                color: "#A3E635",
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Active Nutrition Plan
            </Text>
          </View>
  
          <Text
            style={tw`text-white text-3xl font-bold mt-4`}
          >
            {plan.title}
          </Text>
  
          <View
            style={tw`flex-row items-start mt-4`}
          >
            <CalendarDays
              size={17}
              color="#A3A3A3"
              style={{
                marginTop: 2,
              }}
            />
  
            <View style={tw`ml-3 flex-1`}>
              <Text
                style={tw`text-neutral-500 text-xs`}
              >
                Plan duration
              </Text>
  
              <Text
                style={tw`text-neutral-300 mt-1 leading-5`}
              >
                {formatDate(
                  plan.startDate
                )}{" "}
                to{" "}
                {formatDate(
                  plan.endDate
                )}
              </Text>
            </View>
          </View>
  
          {/* Hero Metrics */}
  
          <View
            style={tw`flex-row mt-6`}
          >
            <View
              style={tw`flex-1 bg-black/30 rounded-2xl p-4 mr-2`}
            >
              <Text
                style={tw`text-neutral-500 text-xs`}
              >
                Daily Calories
              </Text>
  
              <Text
                style={{
                  color: "#A3E635",
                  fontSize: 26,
                  fontWeight: "800",
                  marginTop: 4,
                }}
              >
                {formatNumber(
                  plan.targetCalories
                )}
              </Text>
  
              <Text
                style={tw`text-neutral-500 text-xs mt-1`}
              >
                kcal target
              </Text>
            </View>
  
            <View
              style={tw`flex-1 bg-black/30 rounded-2xl p-4 ml-2`}
            >
              <Text
                style={tw`text-neutral-500 text-xs`}
              >
                Meals
              </Text>
  
              <Text
                style={tw`text-white text-3xl font-extrabold mt-1`}
              >
                {meals.length}
              </Text>
  
              <Text
                style={tw`text-neutral-500 text-xs mt-1`}
              >
                scheduled
              </Text>
            </View>
          </View>
  
          {/* Instructions */}
  
          {!!plan.instructions && (
            <View
              style={tw`mt-6 pt-5 border-t border-neutral-800 flex-row`}
            >
              <View
                style={[
                  tw`h-10 w-10 rounded-xl items-center justify-center`,
                  {
                    backgroundColor:
                      "rgba(163,230,53,0.1)",
                  },
                ]}
              >
                <ChefHat
                  size={20}
                  color="#A3E635"
                />
              </View>
  
              <View
                style={tw`ml-3 flex-1`}
              >
                <Text
                  style={tw`text-white font-semibold`}
                >
                  Coach Instructions
                </Text>
  
                <Text
                  style={tw`text-neutral-300 text-sm mt-2 leading-6`}
                >
                  {plan.instructions}
                </Text>
              </View>
            </View>
          )}
        </View>
  
        {/* Daily Targets */}
  
        <View
          style={tw`border border-neutral-800 bg-neutral-900 rounded-3xl p-5 mt-6`}
        >
          <View
            style={tw`flex-row items-center mb-5`}
          >
            <Target
              size={20}
              color="#A3E635"
            />
  
            <Text
              style={tw`text-white text-xl font-bold ml-3`}
            >
              Daily Nutrition Goal
            </Text>
          </View>
  
          <View
            style={tw`flex-row flex-wrap justify-between`}
          >
            <NutritionCard
              icon={
                <Flame
                  size={21}
                  color="#A3E635"
                />
              }
              title="Calories"
              value={plan.targetCalories}
              unit="kcal"
            />
  
            <NutritionCard
              icon={
                <Beef
                  size={21}
                  color="#A3E635"
                />
              }
              title="Protein"
              value={plan.targetProtein}
              unit="g"
            />
  
            <NutritionCard
              icon={
                <Wheat
                  size={21}
                  color="#A3E635"
                />
              }
              title="Carbs"
              value={plan.targetCarbs}
              unit="g"
            />
  
            <NutritionCard
              icon={
                <Droplets
                  size={21}
                  color="#A3E635"
                />
              }
              title="Fat"
              value={plan.targetFat}
              unit="g"
            />
          </View>
        </View>
  
        {/* Meals */}
  
        <View style={tw`mt-7`}>
          <View
            style={tw`flex-row items-center mb-4`}
          >
            <Utensils
              size={21}
              color="#A3E635"
            />
  
            <Text
              style={tw`text-white text-xl font-bold ml-3`}
            >
              Your Daily Meals
            </Text>
          </View>
  
          {meals.length === 0 ? (
            <View
              style={tw`border border-neutral-800 bg-neutral-900 rounded-3xl p-6`}
            >
              <Text
                style={tw`text-neutral-400 text-center`}
              >
                No meals have been added to
                this plan.
              </Text>
            </View>
          ) : (
            meals.map(
              (
                meal,
                mealIndex
              ) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  index={mealIndex}
                />
              )
            )
          )}
        </View>
  
        {/* Daily Summary */}
  
        <View
          style={[
            tw`rounded-3xl p-5 mt-7`,
            {
              borderWidth: 1,
              borderColor:
                "rgba(163,230,53,0.22)",
              backgroundColor:
                "rgba(163,230,53,0.04)",
            },
          ]}
        >
          <Text
            style={tw`text-white text-xl font-bold mb-5`}
          >
            Daily Nutrition Summary
          </Text>
  
          <View
            style={tw`flex-row flex-wrap justify-between`}
          >
            <SummaryCard
              title="Calories"
              value={
                plan.dailyTotals
                  ?.calories
              }
              unit="kcal"
              highlight
            />
  
            <SummaryCard
              title="Protein"
              value={
                plan.dailyTotals
                  ?.protein
              }
              unit="g"
            />
  
            <SummaryCard
              title="Carbs"
              value={
                plan.dailyTotals
                  ?.carbs
              }
              unit="g"
            />
  
            <SummaryCard
              title="Fat"
              value={
                plan.dailyTotals?.fat
              }
              unit="g"
            />
          </View>
        </View>
      </View>
    );
  }
  
  interface NutritionCardProps {
    icon: ReactNode;
    title: string;
    value: number;
    unit: string;
  }
  
  function NutritionCard({
    icon,
    title,
    value,
    unit,
  }: NutritionCardProps) {
    return (
      <View
        style={[
          tw`border border-neutral-800 bg-black/30 rounded-2xl p-4 mb-3`,
          {
            width: "48.5%",
          },
        ]}
      >
        <View
          style={[
            tw`h-10 w-10 rounded-xl items-center justify-center`,
            {
              backgroundColor:
                "rgba(163,230,53,0.1)",
            },
          ]}
        >
          {icon}
        </View>
  
        <Text
          style={tw`text-neutral-400 text-xs mt-4`}
        >
          {title}
        </Text>
  
        <Text
          style={tw`text-white text-xl font-bold mt-1`}
        >
          {formatNumber(value)}
          {unit}
        </Text>
      </View>
    );
  }
  
  interface MealCardProps {
    meal: DietPlanMeal;
    index: number;
  }
  
  function MealCard({
    meal,
    index,
  }: MealCardProps) {
    const items = meal.items ?? [];
  
    const totals =
      meal.totals ?? {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
  
    return (
      <View
        style={tw`border border-neutral-800 bg-neutral-900 rounded-3xl overflow-hidden mb-5`}
      >
        {/* Meal Header */}
  
        <View
          style={tw`p-5 border-b border-neutral-800 flex-row items-center justify-between`}
        >
          <View style={tw`flex-1 pr-3`}>
            <Text
              style={tw`text-white text-xl font-bold`}
            >
              {meal.name}
            </Text>
  
            <Text
              style={tw`text-neutral-400 text-sm mt-1`}
            >
              Meal {index + 1}
            </Text>
          </View>
  
          <View style={tw`items-end`}>
            <Text
              style={{
                color: "#A3E635",
                fontSize: 24,
                fontWeight: "800",
              }}
            >
              {formatNumber(
                totals.calories
              )}
            </Text>
  
            <Text
              style={tw`text-neutral-500 text-xs`}
            >
              calories
            </Text>
          </View>
        </View>
  
        {/* Food Items */}
  
        <View style={tw`p-4`}>
          {items.length === 0 ? (
            <Text
              style={tw`text-neutral-500 text-center py-4`}
            >
              No food items added.
            </Text>
          ) : (
            items.map(
              (
                item,
                itemIndex
              ) => (
                <FoodItemCard
                  key={
                    item.id ??
                    `${meal.id}-${itemIndex}`
                  }
                  item={item}
                />
              )
            )
          )}
        </View>
  
        {/* Meal Total */}
  
        <View
          style={tw`border-t border-neutral-800 p-4`}
        >
          <View
            style={tw`flex-row items-center mb-4`}
          >
            <View
              style={[
                tw`h-2 w-2 rounded-full`,
                {
                  backgroundColor:
                    "#A3E635",
                },
              ]}
            />
  
            <Text
              style={tw`text-white font-bold ml-2`}
            >
              Meal Total
            </Text>
          </View>
  
          <View
            style={tw`flex-row flex-wrap justify-between`}
          >
            <MealTotalItem
              label="Calories"
              value={totals.calories}
              unit="kcal"
              highlight
            />
  
            <MealTotalItem
              label="Protein"
              value={totals.protein}
              unit="g"
            />
  
            <MealTotalItem
              label="Carbs"
              value={totals.carbs}
              unit="g"
            />
  
            <MealTotalItem
              label="Fat"
              value={totals.fat}
              unit="g"
            />
          </View>
        </View>
      </View>
    );
  }
  
  interface FoodItemCardProps {
    item: DietPlanItem;
  }
  
  function FoodItemCard({
    item,
  }: FoodItemCardProps) {
    return (
      <View
        style={tw`border border-neutral-800 bg-black/20 rounded-2xl p-4 mb-3`}
      >
        <View
          style={tw`flex-row items-start justify-between`}
        >
          <View style={tw`flex-1 pr-3`}>
            <Text
              numberOfLines={2}
              style={tw`text-white font-semibold`}
            >
              {item.foodName}
            </Text>
  
            <Text
              style={tw`text-neutral-400 text-xs mt-2`}
            >
              {formatQuantity(
                item.quantity
              )}{" "}
              {item.servingUnit}
            </Text>
          </View>
  
          <View style={tw`items-end`}>
            <Text
              style={tw`text-white font-bold`}
            >
              {formatNumber(
                item.calories
              )}
            </Text>
  
            <Text
              style={tw`text-neutral-500 text-xs mt-1`}
            >
              kcal
            </Text>
          </View>
        </View>
  
        <View
          style={tw`flex-row mt-4`}
        >
          <MacroItem
            label="Protein"
            value={item.protein}
          />
  
          <MacroItem
            label="Carbs"
            value={item.carbs}
            withBorder
          />
  
          <MacroItem
            label="Fat"
            value={item.fat}
          />
        </View>
      </View>
    );
  }
  
  interface MacroItemProps {
    label: string;
    value: number;
    withBorder?: boolean;
  }
  
  function MacroItem({
    label,
    value,
    withBorder,
  }: MacroItemProps) {
    return (
      <View
        style={[
          tw`flex-1 items-center py-1`,
          withBorder && {
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: "#262626",
          },
        ]}
      >
        <Text
          style={tw`text-neutral-500 text-xs`}
        >
          {label}
        </Text>
  
        <Text
          style={tw`text-neutral-200 font-semibold mt-1`}
        >
          {formatNumber(value)}g
        </Text>
      </View>
    );
  }
  
  interface MealTotalItemProps {
    label: string;
    value: number;
    unit: string;
    highlight?: boolean;
  }
  
  function MealTotalItem({
    label,
    value,
    unit,
    highlight = false,
  }: MealTotalItemProps) {
    return (
      <View
        style={[
          tw`bg-black/30 border border-neutral-800 rounded-xl p-3 mb-3`,
          {
            width: "48.5%",
          },
        ]}
      >
        <Text
          style={tw`text-neutral-500 text-xs`}
        >
          {label}
        </Text>
  
        <Text
          style={[
            tw`text-lg font-bold mt-1`,
            {
              color: highlight
                ? "#A3E635"
                : "#FFFFFF",
            },
          ]}
        >
          {formatNumber(value)}
          {unit}
        </Text>
      </View>
    );
  }
  
  interface SummaryCardProps {
    title: string;
    value: number;
    unit: string;
    highlight?: boolean;
  }
  
  function SummaryCard({
    title,
    value,
    unit,
    highlight = false,
  }: SummaryCardProps) {
    return (
      <View
        style={[
          tw`bg-black/30 border rounded-2xl p-4 mb-3`,
          {
            width: "48.5%",
            borderColor: highlight
              ? "rgba(163,230,53,0.25)"
              : "#262626",
          },
        ]}
      >
        <Text
          style={tw`text-neutral-400 text-sm`}
        >
          {title}
        </Text>
  
        <Text
          style={[
            tw`text-xl font-bold mt-2`,
            {
              color: highlight
                ? "#A3E635"
                : "#FFFFFF",
            },
          ]}
        >
          {formatNumber(value)}
          {unit}
        </Text>
      </View>
    );
  }
  
  function formatDate(
    dateValue?: string | Date | null
  ) {
    if (!dateValue) return "—";
  
    const date = new Date(dateValue);
  
    if (Number.isNaN(date.getTime())) {
      return "—";
    }
  
    return date.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }
  
  function formatNumber(
    value?: number | string | null
  ) {
    const number = Number(value ?? 0);
  
    if (!Number.isFinite(number)) {
      return "0.0";
    }
  
    return number.toFixed(1);
  }
  
  function formatQuantity(
    value?: number | string | null
  ) {
    const number = Number(value ?? 0);
  
    if (!Number.isFinite(number)) {
      return "0";
    }
  
    return Number.isInteger(number)
      ? number.toString()
      : number.toFixed(1);
  }