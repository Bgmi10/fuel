import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import tw from "twrnc";

import { Check } from "lucide-react-native";

interface SlotStepProps {
  slots: any[];
  loading: boolean;
  selectedSlot: any;
  onSelectSlot: (slot: any) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function SlotStep({
  slots,
  loading,
  selectedSlot,
  onSelectSlot,
  onBack,
  onContinue,
}: SlotStepProps) {
  return (
    <View>
      {/* Header */}

      <View style={tw`mb-5`}>
        <Text
          style={tw`text-white text-xl font-bold`}
        >
          Select Slot
        </Text>

        <Text
          style={tw`text-neutral-400 mt-1`}
        >
          Choose your preferred training
          session.
        </Text>
      </View>

      {loading ? (
        <View
          style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-8 items-center`}
        >
          <ActivityIndicator
            size="large"
            color="#A3E635"
          />

          <Text
            style={tw`text-neutral-400 mt-4`}
          >
            Loading available slots...
          </Text>
        </View>
      ) : slots.length === 0 ? (
        <View
          style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-8 items-center`}
        >
          <Text
            style={tw`text-red-400 font-medium`}
          >
            No slots available
          </Text>

          <Text
            style={tw`text-neutral-500 mt-2 text-center`}
          >
            Try selecting another date.
          </Text>
        </View>
      ) : (
        <>
          {slots.map((slot) => {
            const selected =
              selectedSlot?.id === slot.id;

            return (
              <TouchableOpacity
                key={slot.id}
                activeOpacity={0.8}
                disabled={slot.isFull}
                onPress={() =>
                  onSelectSlot(slot)
                }
                style={[
                  tw`bg-neutral-900 border rounded-3xl p-5 mb-4`,
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
                      },
                  slot.isFull && {
                    opacity: 0.45,
                  },
                ]}
              >
                <View
                  style={tw`flex-row justify-between items-start`}
                >
                  <View style={tw`flex-1`}>
                    <Text
                      style={tw`text-white text-lg font-semibold`}
                    >
                      {slot.name}
                    </Text>

                    <Text
                      style={tw`text-neutral-400 mt-2`}
                    >
                      {slot.startTime} -{" "}
                      {slot.endTime}
                    </Text>

                    <Text
                      style={tw`text-neutral-500 text-sm mt-2`}
                    >
                      {slot.available} spots
                      available
                    </Text>
                  </View>

                  {slot.isFull ? (
                    <View
                      style={{
                        backgroundColor:
                          "rgba(239,68,68,0.12)",
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        style={{
                          color: "#F87171",
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Full
                      </Text>
                    </View>
                  ) : selected ? (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        backgroundColor:
                          "#A3E635",
                        alignItems: "center",
                        justifyContent:
                          "center",
                      }}
                    >
                      <Check
                        size={18}
                        color="#000"
                      />
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Buttons */}

          <View
            style={tw`flex-row mt-2`}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onBack}
              style={tw`flex-1 mr-2 bg-neutral-900 border border-neutral-800 rounded-2xl py-4 items-center`}
            >
              <Text
                style={tw`text-white font-semibold`}
              >
                Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!selectedSlot}
              onPress={onContinue}
              style={[
                tw`flex-1 ml-2 rounded-2xl py-4 items-center`,
                {
                  backgroundColor:
                    selectedSlot
                      ? "#A3E635"
                      : "#404040",
                },
              ]}
            >
              <Text
                style={[
                  tw`font-bold`,
                  {
                    color: selectedSlot
                      ? "#000"
                      : "#737373",
                  },
                ]}
              >
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}