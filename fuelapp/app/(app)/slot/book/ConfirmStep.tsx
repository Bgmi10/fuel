import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import tw from "twrnc";

interface ConfirmStepProps {
  selectedSubscription: any;
  selectedDate: Date | null;
  selectedSlot: any;
  bookingLoading: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export default function ConfirmStep({
  selectedSubscription,
  selectedDate,
  selectedSlot,
  bookingLoading,
  onBack,
  onConfirm,
}: ConfirmStepProps) {
  return (
    <View>
      {/* Header */}

      <View style={tw`mb-5`}>
        <Text
          style={tw`text-white text-xl font-bold`}
        >
          Confirm Booking
        </Text>

        <Text
          style={tw`text-neutral-400 mt-1`}
        >
          Review your booking details before
          confirming.
        </Text>
      </View>

      {/* Summary Card */}

      <View
        style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden`}
      >
        <View
          style={tw`px-5 py-4 border-b border-neutral-800`}
        >
          <Text
            style={tw`text-neutral-500 text-xs`}
          >
            Membership
          </Text>

          <Text
            style={tw`text-white font-semibold mt-1`}
          >
            {[
              selectedSubscription?.serviceName,
              selectedSubscription?.packageName,
            ]
              .filter(Boolean)
              .join(" • ")}
          </Text>
        </View>

        <View
          style={tw`px-5 py-4 border-b border-neutral-800`}
        >
          <Text
            style={tw`text-neutral-500 text-xs`}
          >
            Branch
          </Text>

          <Text
            style={tw`text-white font-semibold mt-1`}
          >
            {selectedSubscription?.branch?.name}
          </Text>
        </View>

        <View
          style={tw`px-5 py-4 border-b border-neutral-800`}
        >
          <Text
            style={tw`text-neutral-500 text-xs`}
          >
            Date
          </Text>

          <Text
            style={tw`text-white font-semibold mt-1`}
          >
            {selectedDate?.toLocaleDateString(
              "en-IN",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            )}
          </Text>
        </View>

        <View style={tw`px-5 py-4`}>
          <Text
            style={tw`text-neutral-500 text-xs`}
          >
            Slot
          </Text>

          <Text
            style={tw`text-white font-semibold mt-1`}
          >
            {selectedSlot?.name}
          </Text>

          <Text
            style={tw`text-neutral-400 mt-1`}
          >
            {selectedSlot?.startTime} -{" "}
            {selectedSlot?.endTime}
          </Text>
        </View>
      </View>

      {/* Info */}

      <View
        style={tw`bg-lime-400/10 border border-lime-400/20 rounded-2xl p-4 mt-5`}
      >
        <Text
          style={{
            color: "#A3E635",
            lineHeight: 22,
          }}
        >
          After booking, a QR code will be
          generated which can be used to
          check in during your training
          session.
        </Text>
      </View>

      {/* Buttons */}

      <View
        style={tw`flex-row mt-6`}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={bookingLoading}
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
          disabled={bookingLoading}
          onPress={onConfirm}
          style={[
            tw`flex-1 ml-2 rounded-2xl py-4 items-center`,
            {
              backgroundColor: "#A3E635",
            },
          ]}
        >
          {bookingLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text
              style={tw`text-black font-bold`}
            >
              Confirm Booking
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}