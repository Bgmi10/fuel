import React, { useState } from "react";

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";

import { useRouter } from "expo-router";

import tw from "twrnc";

import {
  ChevronLeft,
  CalendarDays,
  Clock3,
  Building2,
  QrCode,
} from "lucide-react-native";

import { useAuth } from "../../../../src/contexts/AuthContext";

import QrModal from "../QrModal";

export default function BookingsScreen() {
  const router = useRouter();

  const {
    user: member,
    refreshSession,
  } = useAuth();

  const [selectedBooking, setSelectedBooking] =
    useState<any>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const bookings =
    member?.slotBookings || [];

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await refreshSession();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <ScrollView
        style={tw`flex-1 bg-black`}
        contentContainerStyle={tw`p-5 pb-10`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A3E635"
            colors={["#A3E635"]}
            progressBackgroundColor="#171717"
          />
        }
      >
        {/* Header */}

        <View
          style={tw`flex-row items-center mb-6`}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              router.replace("/slot")
            }
            style={tw`h-11 w-11 rounded-xl bg-neutral-900 border border-neutral-800 items-center justify-center`}
          >
            <ChevronLeft
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={tw`ml-4 flex-1`}>
            <Text
              style={tw`text-white text-2xl font-bold`}
            >
              My Bookings
            </Text>

            <Text
              style={tw`text-neutral-400 mt-1`}
            >
              All your session history &
              check-in passes
            </Text>
          </View>
        </View>

        {/* Booking List */}

        {bookings.length === 0 ? (
          <View
            style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl py-10 items-center`}
          >
            <Text
              style={tw`text-neutral-400`}
            >
              No bookings found
            </Text>
          </View>
        ) : (
          bookings.map((booking: any) => (
            <View
              key={booking.id}
              style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-4`}
            >
              {/* Top */}

              <View
                style={tw`flex-row justify-between`}
              >
                <View
                  style={tw`flex-1 pr-3`}
                >
                  <Text
                    style={tw`text-white font-bold text-lg`}
                  >
                    {booking.slot.name}
                  </Text>

                  <Text
                    style={tw`text-neutral-400 text-xs mt-1`}
                  >
                    {[
                      booking
                        .subscription
                        ?.serviceName,
                      booking
                        .subscription
                        ?.packageName,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </Text>

                  <View
                    style={tw`flex-row items-center mt-2`}
                  >
                    <Building2
                      size={13}
                      color="#737373"
                    />

                    <Text
                      style={tw`text-neutral-500 text-xs ml-2`}
                    >
                      {
                        booking.branch
                          ?.name
                      }
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    tw`px-3 py-2 rounded-full self-start`,
                    booking.status ===
                    "ATTENDED"
                      ? {
                          backgroundColor:
                            "rgba(74,222,128,0.12)",
                        }
                      : {
                          backgroundColor:
                            "rgba(163,230,53,0.12)",
                        },
                  ]}
                >
                  <Text
                    style={[
                      tw`text-xs font-semibold`,
                      booking.status ===
                      "ATTENDED"
                        ? {
                            color:
                              "#4ADE80",
                          }
                        : {
                            color:
                              "#A3E635",
                          },
                    ]}
                  >
                    {booking.status}
                  </Text>
                </View>
              </View>

              {/* Meta */}

              <View
                style={tw`mt-5`}
              >
                <View
                  style={tw`flex-row items-center mb-2`}
                >
                  <CalendarDays
                    size={15}
                    color="#A3A3A3"
                  />

                  <Text
                    style={tw`text-neutral-400 text-xs ml-2`}
                  >
                    {new Date(
                      booking.bookingDate
                    ).toLocaleDateString(
                      "en-IN"
                    )}
                  </Text>
                </View>

                <View
                  style={tw`flex-row items-center`}
                >
                  <Clock3
                    size={15}
                    color="#A3A3A3"
                  />

                  <Text
                    style={tw`text-neutral-400 text-xs ml-2`}
                  >
                    {
                      booking.slot
                        .startTime
                    }{" "}
                    -{" "}
                    {
                      booking.slot
                        .endTime
                    }
                  </Text>
                </View>
              </View>

              {/* Action */}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  setSelectedBooking(
                    booking
                  )
                }
                style={tw`mt-5 bg-lime-400 rounded-2xl py-3 flex-row justify-center items-center`}
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
          ))
        )}
      </ScrollView>

      <QrModal
        visible={!!selectedBooking}
        booking={selectedBooking}
        onClose={() =>
          setSelectedBooking(null)
        }
      />
    </>
  );
}