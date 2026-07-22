import React, {
    useMemo,
    useState,
  } from "react";
  
  import {
    ActivityIndicator,
    Alert,
    Pressable,
    Text,
    TouchableOpacity,
    View,
  } from "react-native";
  
  import tw from "twrnc";
  
  import {
    Check,
    Copy,
    Pencil,
    Plus,
    Trash2,
  } from "lucide-react-native";
  
  import { request } from "../../../../src/api/client";
  
  import FoodSearchDrawer from "./FoodSearchDrawer";
  import EditFoodDrawer from "./EditFoodDrawer";
  
  interface Props {
    meal: any;
    allowAddFood: boolean;
  
    onUpdateMeal: (
      mealId: string,
      meal: any
    ) => void;
  
    onCopyFromAssignedPlan: (
      mealId: string
    ) => Promise<void>;
  }
  
  export default function FoodTrackingMealCard({
    meal,
    allowAddFood,
    onUpdateMeal,
    onCopyFromAssignedPlan,
  }: Props) {
    const [showFoodSearch, setShowFoodSearch] =
      useState(false);
  
    const [editingItem, setEditingItem] =
      useState<any>(null);
  
    const [copying, setCopying] =
      useState(false);
  
    const [updatingItemId, setUpdatingItemId] =
      useState<string | null>(null);
  
    const items = meal?.items ?? [];
  
    const updateFood = (
      foodId: string,
      field: string,
      value: any
    ) => {
      const updatedFoods =
        items.map((item: any) =>
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
  
    const totals = useMemo(() => {
      return items
        .filter(
          (item: any) =>
            item.consumed
        )
        .reduce(
          (
            total: any,
            item: any
          ) => ({
            calories:
              total.calories +
              Number(
                item.calories ?? 0
              ),
  
            protein:
              total.protein +
              Number(
                item.protein ?? 0
              ),
  
            carbs:
              total.carbs +
              Number(
                item.carbs ?? 0
              ),
  
            fat:
              total.fat +
              Number(
                item.fat ?? 0
              ),
          }),
          {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          }
        );
    }, [items]);
  
    const completed =
      items.filter(
        (item: any) =>
          item.consumed
      ).length;
  
    const toggleConsumed = async (
      item: any
    ) => {
      const nextConsumed =
        !item.consumed;
  
      updateFood(
        item.id,
        "consumed",
        nextConsumed
      );
  
      try {
        setUpdatingItemId(item.id);
  
        await request({
          url:
            `/member/food-tracker/item/${item.id}`,
          method: "PATCH",
          data: {
            consumed: nextConsumed,
          },
        });
      } catch (err) {
        console.log(err);
  
        updateFood(
          item.id,
          "consumed",
          item.consumed
        );
  
        Alert.alert(
          "Unable to update",
          "The consumed status could not be updated."
        );
      } finally {
        setUpdatingItemId(null);
      }
    };
  
    const deleteFood = async (
      item: any
    ) => {
      const originalItems = [
        ...items,
      ];
  
      const nextItems =
        originalItems.filter(
          (food: any) =>
            food.id !== item.id
        );
  
      onUpdateMeal(meal.id, {
        ...meal,
        items: nextItems,
      });
  
      try {
        setUpdatingItemId(item.id);
  
        await request({
          url:
            `/member/food-tracker/item/${item.id}`,
          method: "DELETE",
        });
      } catch (err) {
        console.log(err);
  
        onUpdateMeal(meal.id, {
          ...meal,
          items: originalItems,
        });
  
        Alert.alert(
          "Unable to delete",
          "The food item could not be deleted."
        );
      } finally {
        setUpdatingItemId(null);
      }
    };
  
    const confirmDelete = (
      item: any
    ) => {
      Alert.alert(
        "Delete food",
        `Remove ${item.foodName} from this meal?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () =>
              deleteFood(item),
          },
        ]
      );
    };
  
    const handleCopy = async () => {
      try {
        setCopying(true);
  
        await onCopyFromAssignedPlan(
          meal.id
        );
      } catch (err: any) {
        console.log(err);
  
        Alert.alert(
          "Unable to copy meal",
          err?.message ??
            "The assigned meal could not be copied."
        );
      } finally {
        setCopying(false);
      }
    };
  
    return (
      <View
        style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden mb-5`}
      >
        {/* Header */}
  
        <View
          style={tw`p-5 border-b border-neutral-800`}
        >
          <View
            style={tw`flex-row items-start justify-between`}
          >
            <View
              style={tw`flex-1 pr-3`}
            >
              <Text
                style={tw`text-white text-xl font-bold`}
              >
                {meal.name}
              </Text>
  
              <View
                style={[
                  tw`self-start rounded-full px-3 py-1 mt-2`,
                  {
                    backgroundColor:
                      "rgba(163,230,53,0.1)",
                  },
                ]}
              >
                <Text
                  style={{
                    color: "#BEF264",
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {completed}/{items.length}{" "}
                  completed
                </Text>
              </View>
            </View>
          </View>
  
          {allowAddFood && (
            <View
              style={tw`flex-row mt-4`}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={copying}
                onPress={handleCopy}
                style={[
                  tw`flex-1 min-h-11 rounded-xl border items-center justify-center flex-row mr-2`,
                  {
                    borderColor:
                      "rgba(163,230,53,0.3)",
                    backgroundColor:
                      "rgba(163,230,53,0.08)",
                  },
                ]}
              >
                {copying ? (
                  <ActivityIndicator
                    size="small"
                    color="#A3E635"
                  />
                ) : (
                  <>
                    <Copy
                      size={16}
                      color="#A3E635"
                    />
  
                    <Text
                      style={{
                        color:
                          "#A3E635",
                        fontWeight:
                          "700",
                        marginLeft: 7,
                      }}
                    >
                      Copy Plan
                    </Text>
                  </>
                )}
              </TouchableOpacity>
  
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  setShowFoodSearch(
                    true
                  )
                }
                style={[
                  tw`flex-1 min-h-11 rounded-xl items-center justify-center flex-row ml-2`,
                  {
                    backgroundColor:
                      "#A3E635",
                  },
                ]}
              >
                <Plus
                  size={17}
                  color="#000000"
                />
  
                <Text
                  style={tw`text-black font-bold ml-2`}
                >
                  Add Food
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
  
        {/* Food Items */}
  
        <View>
          {items.length === 0 ? (
            <View style={tw`p-6`}>
              <Text
                style={tw`text-neutral-500 text-center`}
              >
                This meal is empty.
              </Text>
            </View>
          ) : (
            items.map(
              (
                item: any,
                index: number
              ) => {
                const updating =
                  updatingItemId ===
                  item.id;
  
                return (
                  <View
                    key={item.id}
                    style={[
                      tw`p-5`,
                      index !==
                        items.length -
                          1 &&
                        tw`border-b border-neutral-800`,
                      item.consumed && {
                        backgroundColor:
                          "rgba(163,230,53,0.035)",
                      },
                    ]}
                  >
                    <View
                      style={tw`flex-row items-start`}
                    >
                      <Pressable
                        disabled={updating}
                        onPress={() =>
                          toggleConsumed(
                            item
                          )
                        }
                        style={[
                          tw`h-6 w-6 rounded-lg border items-center justify-center mt-0.5`,
                          item.consumed
                            ? {
                                borderColor:
                                  "#A3E635",
                                backgroundColor:
                                  "#A3E635",
                              }
                            : {
                                borderColor:
                                  "#525252",
                                backgroundColor:
                                  "#171717",
                              },
                        ]}
                      >
                        {updating ? (
                          <ActivityIndicator
                            size={12}
                            color={
                              item.consumed
                                ? "#000"
                                : "#A3E635"
                            }
                          />
                        ) : item.consumed ? (
                          <Check
                            size={15}
                            color="#000"
                          />
                        ) : null}
                      </Pressable>
  
                      <View
                        style={tw`flex-1 ml-3`}
                      >
                        <Text
                          style={[
                            tw`text-base font-semibold`,
                            {
                              color:
                                item.consumed
                                  ? "#737373"
                                  : "#FFFFFF",
                              textDecorationLine:
                                item.consumed
                                  ? "line-through"
                                  : "none",
                            },
                          ]}
                        >
                          {item.foodName}
                        </Text>
  
                        {!!item.brandName && (
                          <Text
                            style={tw`text-neutral-500 text-xs mt-1`}
                          >
                            {
                              item.brandName
                            }
                          </Text>
                        )}
  
                        <Text
                          style={tw`text-neutral-300 text-sm mt-2`}
                        >
                          {formatQuantity(
                            item.quantity
                          )}{" "}
                          {
                            item.servingUnit
                          }
                        </Text>
                      </View>
  
                      <View
                        style={tw`flex-row ml-2`}
                      >
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() =>
                            setEditingItem(
                              item
                            )
                          }
                          style={tw`h-10 w-10 rounded-xl bg-blue-400/10 items-center justify-center mr-2`}
                        >
                          <Pencil
                            size={16}
                            color="#93C5FD"
                          />
                        </TouchableOpacity>
  
                        <TouchableOpacity
                          activeOpacity={0.8}
                          disabled={updating}
                          onPress={() =>
                            confirmDelete(
                              item
                            )
                          }
                          style={tw`h-10 w-10 rounded-xl bg-red-400/10 items-center justify-center`}
                        >
                          <Trash2
                            size={16}
                            color="#F87171"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
  
                    <View
                      style={tw`flex-row mt-4 bg-black/20 rounded-2xl py-3`}
                    >
                      <FoodMacro
                        label="Calories"
                        value={`${formatNumber(
                          item.calories
                        )}`}
                      />
  
                      <FoodMacro
                        label="Protein"
                        value={`${formatNumber(
                          item.protein
                        )}g`}
                        bordered
                      />
  
                      <FoodMacro
                        label="Carbs"
                        value={`${formatNumber(
                          item.carbs
                        )}g`}
                        bordered
                      />
  
                      <FoodMacro
                        label="Fat"
                        value={`${formatNumber(
                          item.fat
                        )}g`}
                      />
                    </View>
                  </View>
                );
              }
            )
          )}
        </View>
  
        {/* Consumed totals */}
  
        <View
          style={[
            tw`p-5 border-t`,
            {
              borderColor:
                "rgba(163,230,53,0.12)",
              backgroundColor:
                "rgba(163,230,53,0.04)",
            },
          ]}
        >
          <Text
            style={tw`text-white font-bold mb-4`}
          >
            Consumed Meal Total
          </Text>
  
          <View
            style={tw`flex-row flex-wrap justify-between`}
          >
            <TotalCard
              title="Calories"
              value={totals.calories}
              unit="kcal"
              highlight
            />
  
            <TotalCard
              title="Protein"
              value={totals.protein}
              unit="g"
            />
  
            <TotalCard
              title="Carbs"
              value={totals.carbs}
              unit="g"
            />
  
            <TotalCard
              title="Fat"
              value={totals.fat}
              unit="g"
            />
          </View>
        </View>
  
        <FoodSearchDrawer
          open={showFoodSearch}
          mealId={meal.id}
          onClose={() =>
            setShowFoodSearch(false)
          }
          onAdded={(addedFood) => {
            onUpdateMeal(meal.id, {
              ...meal,
              items: [
                ...items,
                addedFood,
              ],
            });
  
            setShowFoodSearch(
              false
            );
          }}
        />
  
        <EditFoodDrawer
          open={!!editingItem}
          item={editingItem}
          onClose={() =>
            setEditingItem(null)
          }
          onUpdated={(
            updatedItem
          ) => {
            const updatedItems =
              items.map(
                (food: any) =>
                  food.id ===
                  updatedItem.id
                    ? updatedItem
                    : food
              );
  
            onUpdateMeal(meal.id, {
              ...meal,
              items: updatedItems,
            });
  
            setEditingItem(null);
          }}
        />
      </View>
    );
  }
  
  function FoodMacro({
    label,
    value,
    bordered = false,
  }: {
    label: string;
    value: string;
    bordered?: boolean;
  }) {
    return (
      <View
        style={[
          tw`flex-1 items-center`,
          bordered && {
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
          style={tw`text-neutral-200 font-semibold text-xs mt-1`}
        >
          {value}
        </Text>
      </View>
    );
  }
  
  function TotalCard({
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
          {title}
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
  
  function formatNumber(
    value: any
  ) {
    const number = Number(
      value ?? 0
    );
  
    return Number.isFinite(number)
      ? number.toFixed(1)
      : "0.0";
  }
  
  function formatQuantity(
    value: any
  ) {
    const number = Number(
      value ?? 0
    );
  
    if (!Number.isFinite(number)) {
      return "0";
    }
  
    return Number.isInteger(number)
      ? String(number)
      : number.toFixed(1);
  }