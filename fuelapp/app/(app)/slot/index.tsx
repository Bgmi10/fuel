import React, {
    useCallback,
    useEffect,
    useState,
  } from "react";
  
  import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
  } from "react-native";
  
  import { useRouter } from "expo-router";
  
  import tw from "twrnc";
  
  import { request } from "../../../src/api/client";
  
  import QrModal from "./QrModal";
import UpcomingBooking from "./UpcomingBooking";
  
  export default function SlotScreen() {
    const router = useRouter();
  
    const [loading, setLoading] =
      useState(true);
  
    const [refreshing, setRefreshing] =
      useState(false);
  
    const [upcomingBooking, setUpcomingBooking] =
      useState<any>(null);
  
    const [selectedBooking, setSelectedBooking] =
      useState<any>(null);
  
    const fetchBookings = useCallback(
      async () => {
        try {
          const data = await request({
            url: "/member/slot",
          });
  
          setUpcomingBooking(
            data.upcomingBooking ?? null
          );
        } catch (err) {
          console.log(err);
        }
      },
      []
    );
  
    useEffect(() => {
      (async () => {
        try {
          await fetchBookings();
        } finally {
          setLoading(false);
        }
      })();
    }, [fetchBookings]);
  
    const onRefresh = async () => {
      setRefreshing(true);
  
      try {
        await fetchBookings();
      } finally {
        setRefreshing(false);
      }
    };
  
    if (loading) {
      return (
        <View
          style={tw`flex-1 bg-black justify-center items-center`}
        >
          <ActivityIndicator
            size="large"
            color="#A3E635"
          />
        </View>
      );
    }
  
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
  
          <View style={tw`mb-6`}>
            <Text
              style={tw`text-white text-3xl font-bold`}
            >
              Bookings
            </Text>
  
            <Text
              style={tw`text-neutral-400 mt-1`}
            >
              Manage your training sessions
            </Text>
          </View>
  
          {/* Upcoming Booking */}
  
          <UpcomingBooking
  booking={upcomingBooking}
  loading={loading}
  onOpenQR={setSelectedBooking}
  onBookSession={() =>
    router.replace("/slot/book")
  }
  onViewBookings={() =>
    router.replace("/slot/bookings")
  }
/>
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