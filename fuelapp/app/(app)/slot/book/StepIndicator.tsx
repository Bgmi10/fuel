import React from "react";

import {
  View,
  Text,
} from "react-native";

import tw from "twrnc";

import { Check } from "lucide-react-native";

interface StepIndicatorProps {
  step: number;
}

const steps = [
  "Membership",
  "Date",
  "Slot",
  "Confirm",
];

export default function StepIndicator({
  step,
}: StepIndicatorProps) {
  return (
    <View
      style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5`}
    >
      <View
        style={tw`flex-row items-start justify-between`}
      >
        {steps.map(
          (item, index) => {
            const current =
              index + 1;

            const completed =
              step > current;

            const active =
              step === current;

            return (
              <React.Fragment
                key={item}
              >
                <View
                  style={tw`items-center flex-1`}
                >
                  <View
                    style={[
                      tw`h-10 w-10 rounded-full items-center justify-center`,
                      completed && {
                        backgroundColor:
                          "#A3E635",
                      },
                      active && {
                        backgroundColor:
                          "rgba(163,230,53,0.12)",
                        borderWidth: 1,
                        borderColor:
                          "#A3E635",
                      },
                      !completed &&
                        !active && {
                          backgroundColor:
                            "#262626",
                        },
                    ]}
                  >
                    {completed ? (
                      <Check
                        size={16}
                        color="#000"
                      />
                    ) : (
                      <Text
                        style={[
                          tw`font-bold`,
                          active
                            ? {
                                color:
                                  "#A3E635",
                              }
                            : {
                                color:
                                  "#737373",
                              },
                        ]}
                      >
                        {current}
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      tw`text-xs mt-3 text-center`,
                      active
                        ? {
                            color:
                              "#A3E635",
                          }
                        : {
                            color:
                              "#A3A3A3",
                          },
                    ]}
                  >
                    {item}
                  </Text>
                </View>

                {index <
                  steps.length -
                    1 && (
                  <View
                    style={[
                      tw`flex-1 h-0.5 mt-5`,
                      completed
                        ? {
                            backgroundColor:
                              "rgba(163,230,53,0.45)",
                          }
                        : {
                            backgroundColor:
                              "#262626",
                          },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          }
        )}
      </View>
    </View>
  );
}