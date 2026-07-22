import React, {
    useEffect,
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
  
  import { X } from "lucide-react-native";
  
  import { request } from "../../../../src/api/client";
  
  export type FoodLogMealItem = {
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
  
    consumed?: boolean;
  };
  
  interface Props {
    open: boolean;
    item: FoodLogMealItem | null;
    onClose: () => void;
  
    onUpdated: (
      item: FoodLogMealItem
    ) => void;
  }
  
  export default function EditFoodDrawer({
    open,
    item,
    onClose,
    onUpdated,
  }: Props) {
    const [saving, setSaving] =
      useState(false);
  
    const [quantity, setQuantity] =
      useState("");
  
    useEffect(() => {
      if (item) {
        setQuantity(
          String(item.quantity ?? "")
        );
      }
    }, [item]);
  
    const nutrition = useMemo(() => {
      if (!item) return null;
  
      const nextQuantity =
        Number(quantity);
  
      const originalQuantity =
        Number(item.quantity);
  
      if (
        !Number.isFinite(
          nextQuantity
        ) ||
        nextQuantity <= 0
      ) {
        return null;
      }
  
      const safeOriginal =
        Number.isFinite(
          originalQuantity
        ) &&
        originalQuantity > 0
          ? originalQuantity
          : 1;
  
      const multiplier =
        nextQuantity /
        safeOriginal;
  
      return {
        calories: roundNutrition(
          Number(
            item.calories ?? 0
          ) * multiplier
        ),
  
        protein: roundNutrition(
          Number(
            item.protein ?? 0
          ) * multiplier
        ),
  
        carbs: roundNutrition(
          Number(item.carbs ?? 0) *
            multiplier
        ),
  
        fat: roundNutrition(
          Number(item.fat ?? 0) *
            multiplier
        ),
      };
    }, [item, quantity]);
  
    const saveChanges =
      async () => {
        if (!item || !nutrition) {
          Alert.alert(
            "Invalid quantity",
            "Please enter a valid amount."
          );
  
          return;
        }
  
        try {
          setSaving(true);
  
          const response =
            await request({
              url:
                `/member/food-tracker/meal/${item.id}`,
              method: "PATCH",
              data: {
                id: item.id,
  
                quantity:
                  Number(quantity),
  
                calories:
                  nutrition.calories,
  
                protein:
                  nutrition.protein,
  
                carbs:
                  nutrition.carbs,
  
                fat: nutrition.fat,
              },
            });
  
          const updatedItem =
            response?.data !==
            undefined
              ? response.data
              : response;
  
          onUpdated(updatedItem);
  
          onClose();
        } catch (err) {
          console.log(err);
  
          Alert.alert(
            "Unable to update",
            "The food item could not be updated."
          );
        } finally {
          setSaving(false);
        }
      };
  
    if (!item) {
      return null;
    }
  
    return (
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={onClose}
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
            onPress={
              saving
                ? undefined
                : onClose
            }
            style={tw`flex-1 bg-black/70 justify-end`}
          >
            <Pressable
              onPress={() => {}}
              style={tw`bg-neutral-950 border-t border-neutral-800 rounded-t-3xl max-h-[90%]`}
            >
              <View
                style={tw`flex-row items-center justify-between p-5 border-b border-neutral-800`}
              >
                <Text
                  style={tw`text-white text-xl font-bold`}
                >
                  Edit Food
                </Text>
  
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={saving}
                  onPress={onClose}
                  style={tw`h-10 w-10 rounded-xl bg-neutral-900 items-center justify-center`}
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
              >
                <View
                  style={tw`bg-neutral-900 border border-neutral-800 rounded-2xl p-4`}
                >
                  <Text
                    style={tw`text-white font-semibold`}
                  >
                    {item.foodName}
                  </Text>
  
                  {!!item.brandName && (
                    <Text
                      style={tw`text-neutral-500 text-sm mt-1`}
                    >
                      {item.brandName}
                    </Text>
                  )}
                </View>
  
                <Text
                  style={tw`text-neutral-400 text-sm mt-5 mb-2`}
                >
                  Quantity
                </Text>
  
                <View
                  style={tw`flex-row bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden`}
                >
                  <TextInput
                    value={quantity}
                    onChangeText={
                      setQuantity
                    }
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    placeholder="Enter quantity"
                    placeholderTextColor="#525252"
                    style={[
                      tw`flex-1 h-12 text-white`,
                      {
                        paddingHorizontal:
                          16,
                      },
                    ]}
                  />
  
                  <View
                    style={tw`px-4 border-l border-neutral-800 items-center justify-center`}
                  >
                    <Text
                      style={tw`text-neutral-400 capitalize`}
                    >
                      {item.servingUnit}
                    </Text>
                  </View>
                </View>
  
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
                      nutrition?.carbs
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
                  onPress={saveChanges}
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
                        color: nutrition
                          ? "#000000"
                          : "#A3A3A3",
                        fontWeight: "700",
                      }}
                    >
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
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
    value: number
  ) {
    return Number(
      value.toFixed(1)
    );
  }