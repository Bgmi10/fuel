import React, {
    useMemo,
    useState,
  } from "react";
  
  import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
  } from "react-native";
  
  import tw from "twrnc";
  
  import {
    Minus,
    Plus,
    X,
  } from "lucide-react-native";
  
  import { request } from "../../../../src/api/client";
  
  import FoodSearchInput from "./FoodSearchInput";
  
  interface Props {
    open: boolean;
    mealId: string;
    onClose: () => void;
    onAdded: (food: any) => void;
  }
  
  export default function FoodSearchDrawer({
    open,
    mealId,
    onClose,
    onAdded,
  }: Props) {
    const [selectedFood, setSelectedFood] =
      useState<any>(null);
  
    const [
      selectedServing,
      setSelectedServing,
    ] = useState<any>(null);
  
    const [quantity, setQuantity] =
      useState("1");
  
    const [saving, setSaving] =
      useState(false);
  
    const nutrition = useMemo(() => {
      if (
        !selectedFood ||
        !selectedServing
      ) {
        return null;
      }
  
      const amount =
        Number(quantity);
  
      const servingValue =
        Number(
          selectedServing.value
        );
  
      const nutritionMultiplier =
        Number(
          selectedServing
            .nutrition_multiplier
        );
  
      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !Number.isFinite(
          servingValue
        ) ||
        servingValue <= 0
      ) {
        return null;
      }
  
      const multiplier =
        (amount / servingValue) *
        (Number.isFinite(
          nutritionMultiplier
        )
          ? nutritionMultiplier
          : 1);
  
      const base =
        selectedFood
          .nutritional_contents ?? {};
  
      return {
        calories:
          Number(
            base.energy?.value ?? 0
          ) * multiplier,
  
        protein:
          Number(base.protein ?? 0) *
          multiplier,
  
        carbs:
          Number(
            base.carbohydrates ?? 0
          ) * multiplier,
  
        fat:
          Number(base.fat ?? 0) *
          multiplier,
      };
    }, [
      selectedFood,
      selectedServing,
      quantity,
    ]);
  
    const resetDrawer = () => {
      setSelectedFood(null);
      setSelectedServing(null);
      setQuantity("1");
    };
  
    const handleClose = () => {
      if (saving) return;
  
      resetDrawer();
      onClose();
    };
  
    const changeQuantity = (
      amount: number
    ) => {
      const current =
        Number(quantity);
  
      const next =
        (Number.isFinite(current)
          ? current
          : 0) + amount;
  
      setQuantity(
        String(Math.max(1, next))
      );
    };
  
    const addFood = async () => {
      if (
        !selectedFood ||
        !selectedServing ||
        !nutrition
      ) {
        Alert.alert(
          "Select food",
          "Select a food, serving size and valid quantity."
        );
  
        return;
      }
  
      try {
        setSaving(true);
  
        const response =
          await request({
            url:
              "/member/food-tracker/item",
            method: "POST",
            data: {
              mealId,
  
              externalFoodId:
                selectedFood.id,
  
              servingValue:
                selectedServing.value,
  
              nutritionMultiplier:
                selectedServing
                  .nutrition_multiplier,
  
              foodName:
                selectedFood.description,
  
              brandName:
                selectedFood.brand_name,
  
              quantity:
                Number(quantity),
  
              servingUnit:
                selectedServing.unit ??
                "g",
  
              calories:
                roundNutrition(
                  nutrition.calories
                ),
  
              protein:
                roundNutrition(
                  nutrition.protein
                ),
  
              carbs:
                roundNutrition(
                  nutrition.carbs
                ),
  
              fat: roundNutrition(
                nutrition.fat
              ),
            },
          });
  
        const addedFood =
          response?.data !== undefined
            ? response.data
            : response;
  
        onAdded(addedFood);
  
        resetDrawer();
      } catch (err) {
        console.log(err);
  
        Alert.alert(
          "Unable to add food",
          "The food item could not be added."
        );
      } finally {
        setSaving(false);
      }
    };
  
    return (
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={
          handleClose
        }
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
          style={tw`flex-1`}
        >
          <Pressable
            onPress={handleClose}
            style={tw`flex-1 bg-black/70 justify-end`}
          >
            <Pressable
              onPress={() => {}}
              style={tw`bg-neutral-950 border-t border-neutral-800 rounded-t-3xl max-h-[92%]`}
            >
              <View
                style={tw`flex-row items-center justify-between p-5 border-b border-neutral-800`}
              >
                <Text
                  style={tw`text-white text-xl font-bold`}
                >
                  Add Food
                </Text>
  
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={saving}
                  onPress={handleClose}
                  style={tw`h-10 w-10 bg-neutral-900 rounded-xl items-center justify-center`}
                >
                  <X
                    size={20}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
  
              <ScrollView
                contentContainerStyle={tw`p-5 pb-10`}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
              >
                <FoodSearchInput
                  onSelect={(food) => {
                    const firstServing =
                      food?.serving_sizes?.[0] ??
                      null;
                  
                    setSelectedFood(food);
                  
                    setSelectedServing(
                      firstServing
                    );
                  
                    setQuantity("1");
                  }}
                />
  
                {selectedFood && (
                  <View style={tw`mt-5`}>
                    <View
                      style={tw`bg-neutral-900 border border-neutral-800 rounded-2xl p-4`}
                    >
                      <Text
                        style={tw`text-white font-semibold`}
                      >
                        {
                          selectedFood.description
                        }
                      </Text>
  
                      {!!selectedFood.brand_name && (
                        <Text
                          style={tw`text-neutral-500 text-sm mt-1`}
                        >
                          {
                            selectedFood.brand_name
                          }
                        </Text>
                      )}
                    </View>
  
                    {/* Serving sizes */}
  
                    <Text
                      style={tw`text-neutral-400 text-sm mt-5 mb-2`}
                    >
                      Serving Size
                    </Text>
  
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={
                        false
                      }
                      contentContainerStyle={tw`pr-4`}
                    >
                      {selectedFood
                        ?.serving_sizes
                        ?.map(
                          (
                            serving: any,
                            index: number
                          ) => {
                            const active =
                              selectedServing ===
                              serving;
  
                            return (
                              <TouchableOpacity
                                key={`${serving.unit}-${serving.value}-${index}`}
                                activeOpacity={0.8}
                                onPress={() =>
                                  setSelectedServing(
                                    serving
                                  )
                                }
                                style={[
                                  tw`px-4 py-3 rounded-xl border mr-3`,
                                  active
                                    ? {
                                        borderColor:
                                          "#A3E635",
                                        backgroundColor:
                                          "rgba(163,230,53,0.1)",
                                      }
                                    : {
                                        borderColor:
                                          "#262626",
                                        backgroundColor:
                                          "#171717",
                                      },
                                ]}
                              >
                                <Text
                                  style={{
                                    color:
                                      active
                                        ? "#A3E635"
                                        : "#D4D4D4",
                                    fontWeight:
                                      "600",
                                  }}
                                >
                                  {
                                    serving.unit
                                  }
                                </Text>
                              </TouchableOpacity>
                            );
                          }
                        )}
                    </ScrollView>
  
                    {/* Quantity */}
  
                    <Text
                      style={tw`text-neutral-400 text-sm mt-5 mb-2`}
                    >
                      Quantity (
                      {selectedServing?.unit ??
                        "unit"}
                      )
                    </Text>
  
                    <View
                      style={tw`flex-row items-center`}
                    >
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() =>
                          changeQuantity(-1)
                        }
                        style={tw`h-12 w-12 rounded-xl bg-neutral-900 border border-neutral-800 items-center justify-center`}
                      >
                        <Minus
                          size={18}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
  
                      <TextInput
                        value={quantity}
                        onChangeText={
                          setQuantity
                        }
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        placeholder="0"
                        placeholderTextColor="#525252"
                        style={[
                          tw`flex-1 h-12 mx-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-center font-bold`,
                          {
                            paddingHorizontal:
                              12,
                          },
                        ]}
                      />
  
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() =>
                          changeQuantity(1)
                        }
                        style={tw`h-12 w-12 rounded-xl bg-neutral-900 border border-neutral-800 items-center justify-center`}
                      >
                        <Plus
                          size={18}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                    </View>
  
                    {/* Nutrition preview */}
  
                    <View
                      style={tw`flex-row flex-wrap justify-between mt-5`}
                    >
                      <MacroCard
                        title="Calories"
                        value={`${formatNumber(
                          nutrition
                            ?.calories
                        )} kcal`}
                      />
  
                      <MacroCard
                        title="Protein"
                        value={`${formatNumber(
                          nutrition
                            ?.protein
                        )} g`}
                      />
  
                      <MacroCard
                        title="Carbs"
                        value={`${formatNumber(
                          nutrition
                            ?.carbs
                        )} g`}
                      />
  
                      <MacroCard
                        title="Fat"
                        value={`${formatNumber(
                          nutrition?.fat
                        )} g`}
                      />
                    </View>
  
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={
                        saving ||
                        !nutrition
                      }
                      onPress={addFood}
                      style={[
                        tw`h-12 rounded-xl items-center justify-center mt-3`,
                        {
                          backgroundColor:
                            nutrition
                              ? "#A3E635"
                              : "#404040",
                        },
                      ]}
                    >
                      {saving ? (
                        <ActivityIndicator
                          color="#000000"
                        />
                      ) : (
                        <Text
                          style={{
                            color:
                              nutrition
                                ? "#000000"
                                : "#A3A3A3",
                            fontWeight:
                              "700",
                          }}
                        >
                          Add To Meal
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
      <View
        style={[
          tw`bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3`,
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
          style={tw`text-white font-bold mt-1`}
        >
          {value}
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
  
  function roundNutrition(
    value: any
  ) {
    const number = Number(
      value ?? 0
    );
  
    return Number(
      (Number.isFinite(number)
        ? number
        : 0
      ).toFixed(1)
    );
  }