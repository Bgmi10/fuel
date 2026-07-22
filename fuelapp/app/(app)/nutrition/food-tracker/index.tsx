import React, {
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
  } from "react";
  
  import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    View,
  } from "react-native";
  
  import Svg, {
    Circle,
  } from "react-native-svg";
  
  import tw from "twrnc";
  
  import {
    Apple,
    Beef,
    Droplets,
    Flame,
    Wheat,
  } from "lucide-react-native";
  
  import { useAuth } from "../../../../src/contexts/AuthContext";
  
  import {
    useNutritionRefresh,
  } from "../../../../src/contexts/NutritionRefreshContext";
  
  import { request } from "../../../../src/api/client";
  
  import FoodTrackingMealCard from "./FoodTrackingMealCard";
  
  type NutritionValues = {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  
  type FoodTrackerData = {
    hasLogToday?: boolean;
    activePlan?: any;
    foodLog?: {
      id: string;
      meals: any[];
    };
    targets?: NutritionValues;
    consumed?: NutritionValues;
  };
  
  const emptyNutrition: NutritionValues = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
  
  export default function FoodTrackerScreen() {
    const { user } = useAuth();
  
    const { refreshKey } =
      useNutritionRefresh();
  
    const initiallyLoaded = useRef(false);
  
    const [loading, setLoading] =
      useState(true);
  
    const [error, setError] =
      useState<string | null>(null);
  
    const [data, setData] =
      useState<FoodTrackerData | null>(
        null
      );
  
    const [meals, setMeals] =
      useState<any[]>([]);
  
    const initializeTracker = useCallback(
      async (
        showLoader = false
      ) => {
        if (!user?.id) {
          setLoading(false);
          setData(null);
          setMeals([]);
          return;
        }
  
        try {
          if (showLoader) {
            setLoading(true);
          }
  
          setError(null);
  
          const response =
            await request({
              url:
                `/member/food-tracker/today` +
                `?memberId=${user.id}`,
            });
  
          let trackerData =
            response?.data !== undefined
              ? response.data
              : response;
  
          if (
            !trackerData?.hasLogToday
          ) {
            await request({
              url:
                "/member/food-tracker/start-empty",
              method: "POST",
              data: {
                memberId: user.id,
              },
            });
  
            const reloaded =
              await request({
                url:
                  `/member/food-tracker/today` +
                  `?memberId=${user.id}`,
              });
  
            trackerData =
              reloaded?.data !==
              undefined
                ? reloaded.data
                : reloaded;
          }
  
          setData(
            trackerData ?? null
          );
  
          setMeals(
            trackerData?.foodLog
              ?.meals ?? []
          );
        } catch (err) {
          console.log(
            "Food tracker error:",
            err
          );
  
          setError(
            "Unable to load today's food tracker."
          );
        } finally {
          initiallyLoaded.current =
            true;
  
          setLoading(false);
        }
      },
      [user?.id]
    );
  
    useEffect(() => {
      initializeTracker(
        !initiallyLoaded.current
      );
    }, [
      initializeTracker,
      refreshKey,
    ]);
  
    const liveConsumed =
      useMemo<NutritionValues>(() => {
        return meals.reduce(
          (
            total: NutritionValues,
            meal: any
          ) => {
            const mealItems =
              meal?.items ?? [];
  
            mealItems.forEach(
              (item: any) => {
                if (!item.consumed) {
                  return;
                }
  
                total.calories +=
                  Number(
                    item.calories ?? 0
                  );
  
                total.protein +=
                  Number(
                    item.protein ?? 0
                  );
  
                total.carbs +=
                  Number(
                    item.carbs ?? 0
                  );
  
                total.fat += Number(
                  item.fat ?? 0
                );
              }
            );
  
            return total;
          },
          { ...emptyNutrition }
        );
      }, [meals]);
  
    const updateMeal = useCallback(
      (
        mealId: string,
        updatedMeal: any
      ) => {
        setMeals((current) =>
          current.map((meal) =>
            meal.id === mealId
              ? updatedMeal
              : meal
          )
        );
      },
      []
    );
  
    const copyMealFromAssignedPlan =
      useCallback(
        async (mealId: string) => {
          if (!user?.id) return;
  
          const response =
            await request({
              url:
                "/member/food-tracker/copy-meal",
              method: "POST",
              data: {
                memberId: user.id,
                mealId,
              },
            });
  
          if (
            response?.status === 404
          ) {
            throw new Error(
              "Assigned meal not found."
            );
          }
  
          await initializeTracker(
            false
          );
        },
        [
          user?.id,
          initializeTracker,
        ]
      );
  
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
            Preparing today's food tracker...
          </Text>
        </View>
      );
    }
  
    if (error && !data) {
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
            Unable to Load Tracker
          </Text>
  
          <Text
            style={tw`text-neutral-400 text-center mt-2 leading-5`}
          >
            {error}
          </Text>
  
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              initializeTracker(true)
            }
            style={[
              tw`rounded-2xl px-7 py-3 mt-6`,
              {
                backgroundColor:
                  "#A3E635",
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
  
    if (!data?.activePlan) {
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
            style={tw`text-white text-xl font-bold mt-5`}
          >
            No Active Diet Plan
          </Text>
  
          <Text
            style={tw`text-neutral-400 mt-2 text-center leading-5`}
          >
            Your coach has not assigned a
            nutrition plan yet.
          </Text>
        </View>
      );
    }
  
    const targets =
      data.targets ??
      emptyNutrition;
  
    return (
      <View style={tw`pb-10`}>
        {/* Daily Progress */}
  
        <TrackerSummary
          consumed={liveConsumed}
          targets={targets}
        />
  
        {/* Meals */}
  
        <View style={tw`mt-6`}>
          {meals.length === 0 ? (
            <View
              style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-8`}
            >
              <Text
                style={tw`text-neutral-400 text-center`}
              >
                No meals are available for
                today's tracker.
              </Text>
            </View>
          ) : (
            meals.map((meal) => (
              <FoodTrackingMealCard
                key={meal.id}
                meal={meal}
                allowAddFood
                onUpdateMeal={
                  updateMeal
                }
                onCopyFromAssignedPlan={
                  copyMealFromAssignedPlan
                }
              />
            ))
          )}
        </View>
      </View>
    );
  }
  
  interface TrackerSummaryProps {
    consumed: NutritionValues;
    targets: NutritionValues;
  }
  
  function TrackerSummary({
    consumed,
    targets,
  }: TrackerSummaryProps) {
    return (
      <View
        style={tw`flex-row flex-wrap justify-between`}
      >
        <ProgressCard
          icon={
            <Flame
              size={21}
              color="#A3E635"
            />
          }
          title="Calories"
          consumed={
            consumed.calories
          }
          target={targets.calories}
          unit="kcal"
        />
  
        <ProgressCard
          icon={
            <Beef
              size={21}
              color="#A3E635"
            />
          }
          title="Protein"
          consumed={
            consumed.protein
          }
          target={targets.protein}
          unit="g"
        />
  
        <ProgressCard
          icon={
            <Wheat
              size={21}
              color="#A3E635"
            />
          }
          title="Carbs"
          consumed={consumed.carbs}
          target={targets.carbs}
          unit="g"
        />
  
        <ProgressCard
          icon={
            <Droplets
              size={21}
              color="#A3E635"
            />
          }
          title="Fat"
          consumed={consumed.fat}
          target={targets.fat}
          unit="g"
        />
      </View>
    );
  }
  
  interface ProgressCardProps {
    icon: ReactNode;
    title: string;
    consumed: number;
    target: number;
    unit: string;
  }
  
  function ProgressCard({
    icon,
    title,
    consumed,
    target,
    unit,
  }: ProgressCardProps) {
    const safeConsumed =
      Number(consumed ?? 0);
  
    const safeTarget =
      Number(target ?? 0);
  
    const percent =
      safeTarget > 0
        ? Math.min(
            (safeConsumed /
              safeTarget) *
              100,
            100
          )
        : 0;
  
    const radius = 40;
  
    const circumference =
      2 * Math.PI * radius;
  
    const offset =
      circumference -
      (percent / 100) *
        circumference;
  
    return (
      <View
        style={[
          tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-4 mb-4`,
          {
            width: "48.5%",
          },
        ]}
      >
        <View
          style={tw`flex-row items-center justify-between`}
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
            style={tw`text-neutral-300 font-semibold`}
          >
            {percent.toFixed(1)}%
          </Text>
        </View>
  
        <View
          style={tw`items-center justify-center mt-4`}
        >
          <View
            style={{
              width: 96,
              height: 96,
              alignItems: "center",
              justifyContent:
                "center",
            }}
          >
            <Svg
              width={96}
              height={96}
              style={{
                position: "absolute",
                transform: [
                  {
                    rotate: "-90deg",
                  },
                ],
              }}
            >
              <Circle
                cx={48}
                cy={48}
                r={radius}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={6}
                fill="none"
              />
  
              <Circle
                cx={48}
                cy={48}
                r={radius}
                stroke="#A3E635"
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={[
                  circumference,
                  circumference,
                ]}
                strokeDashoffset={
                  offset
                }
              />
            </Svg>
  
            <Text
              style={tw`text-white font-bold text-base`}
            >
              {safeConsumed.toFixed(1)}
            </Text>
  
            <Text
              style={tw`text-neutral-500 text-xs mt-1`}
            >
              / {safeTarget.toFixed(1)}
            </Text>
          </View>
        </View>
  
        <Text
          style={tw`text-neutral-300 font-semibold text-center mt-3`}
        >
          {title}
        </Text>
  
        <Text
          style={tw`text-neutral-500 text-xs text-center mt-1`}
        >
          {unit}
        </Text>
      </View>
    );
  }