import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
} from "react-native";

import tw from "twrnc";

import {
  CalendarDays,
  Clock3,
  QrCode,
} from "lucide-react-native";

interface UpcomingBookingProps {
  booking: any;
  loading?: boolean;
  onOpenQR: (booking: any) => void;
  onBookSession: () => void;
  onViewBookings: () => void;
}

export default function UpcomingBooking({
  booking,
  loading,
  onOpenQR,
  onBookSession,
  onViewBookings,
}: UpcomingBookingProps) {
  if (loading) {
    return (
      <View
        style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-6`}
      >
        <Text style={tw`text-neutral-400`}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Upcoming Booking */}

      {booking ? (
        <View
          style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5`}
        >
          <View
            style={tw`flex-row justify-between items-start mb-5`}
          >
            <View style={tw`flex-1`}>
              <Text
                style={tw`text-neutral-400 text-sm`}
              >
                Upcoming Booking
              </Text>

              <Text
                style={tw`text-white text-xl font-bold mt-1`}
              >
                {booking.slot.name}
              </Text>

              <Text
                style={tw`text-neutral-500 text-xs mt-1`}
              >
                {booking.subscription.serviceName}
                {" • "}
                {booking.subscription.packageName}
              </Text>
            </View>

            <View
              style={tw`bg-lime-400/15 px-3 py-1 rounded-full`}
            >
              <Text
                style={{
                  color: "#A3E635",
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {booking.status}
              </Text>
            </View>
          </View>

          <View style={tw`mb-6`}>
            <View
              style={tw`flex-row items-center mb-3`}
            >
              <CalendarDays
                size={18}
                color="#A3A3A3"
              />

              <Text
                style={tw`text-neutral-300 ml-3`}
              >
                {new Date(
                  booking.bookingDate
                ).toLocaleDateString("en-IN")}
              </Text>
            </View>

            <View
              style={tw`flex-row items-center mb-3`}
            >
              <Clock3
                size={18}
                color="#A3A3A3"
              />

              <Text
                style={tw`text-neutral-300 ml-3`}
              >
                {booking.slot.startTime} -{" "}
                {booking.slot.endTime}
              </Text>
            </View>

            <Text
              style={tw`text-neutral-500 text-sm`}
            >
              {booking.branch.name}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              onOpenQR(booking)
            }
            style={tw`bg-lime-400 rounded-2xl py-4 flex-row justify-center items-center`}
          >
            <QrCode
              size={18}
              color="#000"
            />

            <Text
              style={tw`text-black font-bold ml-2`}
            >
              Session Pass
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-8 items-center`}
        >
          <Text
            style={tw`text-neutral-400 text-base`}
          >
            No upcoming bookings
          </Text>
        </View>
      )}

      {/* Navigation */}

      <View style={tw`mt-6`}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onBookSession}
          style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl px-5 py-5 mb-4`}
        >
          <Text
            style={tw`text-white text-lg font-bold`}
          >
            Book Session
          </Text>

          <Text
            style={tw`text-neutral-400 mt-1`}
          >
            Reserve your next training slot
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onViewBookings}
          style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl px-5 py-5`}
        >
          <Text
            style={tw`text-white text-lg font-bold`}
          >
            Bookings
          </Text>

          <Text
            style={tw`text-neutral-400 mt-1`}
          >
            View your booking history
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}