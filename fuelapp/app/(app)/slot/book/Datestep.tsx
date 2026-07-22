import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
} from "react-native";

import tw from "twrnc";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";

interface DateStepProps {
  dates: Date[];
  selectedDate: Date | null;
  selectedSubscription: any;
  onSelectDate: (date: Date) => void;
  onBack: () => void;
  onContinue: () => void | Promise<void>;
}

export default function DateStep({
  dates,
  selectedDate,
  selectedSubscription,
  onSelectDate,
  onBack,
  onContinue,
}: DateStepProps) {
  return (
    <View>
      {/* Header */}

      <View style={tw`mb-5`}>
        <Text
          style={tw`text-white text-xl font-bold`}
        >
          Select Date
        </Text>

        <Text
          style={tw`text-neutral-400 mt-2`}
        >
          Choose the day you would like to
          attend.
        </Text>
      </View>

      {/* Membership Summary */}

      <View
        style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5`}
      >
        <View
          style={tw`flex-row justify-between items-center`}
        >
          <View style={tw`flex-1`}>
            <Text
              style={tw`text-neutral-500 text-xs`}
            >
              Selected Membership
            </Text>

            <Text
              style={tw`text-white font-semibold mt-2`}
            >
              {[
                selectedSubscription?.serviceName,
                selectedSubscription?.packageName,
              ]
                .filter(Boolean)
                .join(" • ")}
            </Text>

            <Text
              style={tw`text-neutral-500 mt-2`}
            >
              {selectedSubscription?.branchName}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onBack}
          >
            <Text
              style={{
                color: "#A3E635",
                fontWeight: "600",
              }}
            >
              Change
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dates */}

      <View
        style={tw`flex-row flex-wrap justify-between mt-5`}
      >
        {dates.map((date, index) => {
          const selected =
            selectedDate?.toDateString() ===
            date.toDateString();

          const day =
            index === 0
              ? "Today"
              : index === 1
              ? "Tomorrow"
              : date.toLocaleDateString(
                  "en-US",
                  {
                    weekday: "short",
                  }
                );

          return (
            <TouchableOpacity
              key={date.toISOString()}
              activeOpacity={0.85}
              onPress={() =>
                onSelectDate(date)
              }
              style={[
                tw`rounded-3xl border p-4 mb-4`,
                {
                  width: "48%",
                },
                selected
                  ? {
                      borderColor:
                        "#A3E635",
                      backgroundColor:
                        "rgba(163,230,53,0.08)",
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
                style={[
                  tw`font-semibold text-center`,
                  {
                    color: selected
                      ? "#A3E635"
                      : "#D4D4D4",
                  },
                ]}
              >
                {day}
              </Text>

              <Text
                style={tw`text-white text-3xl font-bold text-center mt-2`}
              >
                {date.getDate()}
              </Text>

              <Text
                style={tw`text-neutral-500 text-center mt-2`}
              >
                {date.toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                  }
                )}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Date */}

      {selectedDate && (
        <View
          style={[
            tw`rounded-3xl p-5 mt-1`,
            {
              backgroundColor:
                "rgba(163,230,53,0.08)",
              borderWidth: 1,
              borderColor:
                "rgba(163,230,53,0.2)",
            },
          ]}
        >
          <View
            style={tw`flex-row items-center`}
          >
            <CalendarDays
              size={18}
              color="#A3E635"
            />

            <Text
              style={tw`text-lime-400 font-semibold ml-2`}
            >
              Selected Date
            </Text>
          </View>

          <Text
            style={tw`text-white mt-3`}
          >
            {selectedDate.toLocaleDateString(
              "en-US",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            )}
          </Text>
        </View>
      )}

      {/* Footer */}

      <View
        style={tw`flex-row mt-6`}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onBack}
          style={tw`flex-1 border border-neutral-800 bg-neutral-900 rounded-2xl py-4 flex-row justify-center items-center mr-2`}
        >
          <ChevronLeft
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={tw`text-white font-semibold ml-2`}
          >
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!selectedDate}
          onPress={onContinue}
          style={[
            tw`flex-1 rounded-2xl py-4 flex-row justify-center items-center ml-2`,
            selectedDate
              ? {
                  backgroundColor:
                    "#A3E635",
                }
              : {
                  backgroundColor:
                    "#404040",
                },
          ]}
        >
          <Text
            style={[
              tw`font-bold`,
              {
                color: selectedDate
                  ? "#000"
                  : "#A3A3A3",
              },
            ]}
          >
            Continue
          </Text>

          <ChevronRight
            size={18}
            color={
              selectedDate
                ? "#000"
                : "#A3A3A3"
            }
            style={{
              marginLeft: 8,
            }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}