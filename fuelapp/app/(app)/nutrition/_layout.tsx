import React from "react";

import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";

import {
  Slot,
  usePathname,
  useRouter,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import tw from "twrnc";

import {
  NutritionRefreshProvider,
  useNutritionRefresh,
} from "../../../src/contexts/NutritionRefreshContext";

/*
  The first child route is the default route
  for this nested navigator.
*/
export const unstable_settings = {
  initialRouteName: "diet-plans",
};

type NutritionRoute =
  | "/nutrition/diet-plans"
  | "/nutrition/food-tracker";

interface NutritionTab {
  name: string;
  href: NutritionRoute;
}

const tabs: NutritionTab[] = [
  {
    name: "Your Plan",
    href: "/nutrition/diet-plans",
  },
  {
    name: "Food Tracker",
    href: "/nutrition/food-tracker",
  },
];

function NutritionLayoutContent() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    refreshing,
    refreshNutrition,
  } = useNutritionRefresh();

  const isActive = (
    href: NutritionRoute
  ) => {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={tw`flex-1 bg-black`}
    >
      <ScrollView
        style={tw`flex-1 bg-black`}
        contentContainerStyle={tw`px-5 pt-4 pb-12`}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshNutrition}
            tintColor="#A3E635"
            colors={["#A3E635"]}
            progressBackgroundColor="#171717"
          />
        }
      >
        {/* Nutrition Header */}

        <View
          style={tw`rounded-3xl border border-neutral-800 bg-neutral-900 p-5`}
        >
          <Text
            style={tw`text-white text-3xl font-bold`}
          >
            Nutrition
          </Text>

          <Text
            style={tw`text-neutral-400 mt-2 leading-6`}
          >
            Manage your meal plans and track
            your daily nutrition.
          </Text>

          {/* Tabs */}

          <View style={tw`flex-row mt-6`}>
            {tabs.map(
              (tab, index) => {
                const active =
                  isActive(tab.href);

                return (
                  <TouchableOpacity
                    key={tab.name}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (!active) {
                        router.replace(
                          tab.href
                        );
                      }
                    }}
                    style={[
                      tw`flex-1 min-h-12 rounded-2xl px-3 items-center justify-center`,
                      index === 0
                        ? tw`mr-2`
                        : tw`ml-2`,
                      active
                        ? {
                            backgroundColor:
                              "#A3E635",
                          }
                        : {
                            backgroundColor:
                              "rgba(255,255,255,0.05)",
                            borderWidth: 1,
                            borderColor:
                              "#262626",
                          },
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-sm font-bold text-center`,
                        {
                          color: active
                            ? "#000000"
                            : "#A3A3A3",
                        },
                      ]}
                    >
                      {tab.name}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </View>

        {/* Child route */}

        <View style={tw`mt-6`}>
          <Slot />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function NutritionLayout() {
  return (
    <NutritionRefreshProvider>
      <NutritionLayoutContent />
    </NutritionRefreshProvider>
  );
}