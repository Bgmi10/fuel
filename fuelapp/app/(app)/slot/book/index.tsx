import React, {
    useMemo,
    useState,
  } from "react";
  
  import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
  } from "react-native";
  
  import { useRouter } from "expo-router";
  
  import tw from "twrnc";
  
  import { ChevronLeft } from "lucide-react-native";
  
  import { useAuth } from "../../../../src/contexts/AuthContext";
  import { request } from "../../../../src/api/client";
  
  import StepIndicator from "./StepIndicator";
  import MembershipStep from "./MemberShipStep";
  import DateStep from "./Datestep";
  import SlotStep from "./SlotStep";
  import ConfirmStep from "./ConfirmStep";
  
  export default function BookSessionScreen() {
    const router = useRouter();
    const {
      user: member,
      refreshSession,
    } = useAuth();

    const [refreshing, setRefreshing] =
  useState(false);
  
    const [step, setStep] = useState(1);
  
    const [
      selectedSubscription,
      setSelectedSubscription,
    ] = useState<any>(null);
  
    const [
      selectedDate,
      setSelectedDate,
    ] = useState<Date | null>(null);
  
    const [slots, setSlots] =
      useState<any[]>([]);
  
    const [slotsLoading, setSlotsLoading] =
      useState(false);
  
    const [selectedSlot, setSelectedSlot] =
      useState<any>(null);
  
    const [bookingLoading, setBookingLoading] =
      useState(false);
  
    const subscriptions =
      member?.subscriptions?.filter(
        (subscription: any) =>
          subscription.status === "ACTIVE"
      ) || [];
  
    const dates = useMemo(() => {
      return Array.from(
        { length: 7 },
        (_, i) => {
          const date = new Date();
  
          date.setDate(
            date.getDate() + i
          );
  
          return date;
        }
      );
    }, []);
  
    const fetchSlots = async () => {
      if (
        !selectedSubscription ||
        !selectedDate
      )
        return;
  
      try {
        setSlotsLoading(true);
  
        const data = await request({
          url:
            `/member/slot/book/available?subscriptionId=${selectedSubscription.id}` +
            `&bookingDate=${selectedDate.toISOString()}`,
        });
  
        setSlots(data ?? []);
      } catch (err) {
        console.log(err);
  
        Alert.alert(
          "Error",
          "Unable to fetch slots."
        );
      } finally {
        setSlotsLoading(false);
      }
    };
  
    const validateBooking =
      async () => {
        try {
          const data = await request({
            url: "/member/slot/book/validate",
            method: "POST",
            data: {
              memberId: member?.id,
              subscriptionId:
                selectedSubscription.id,
              slotId:
                selectedSlot.id,
              bookingDate:
                selectedDate,
            },
          });
  
          if (!data.valid) {
            Alert.alert(
              "Booking",
              data.message
            );
  
            return;
          }
  
          setStep(4);
        } catch (err) {
          console.log(err);
  
          Alert.alert(
            "Error",
            "Validation failed."
          );
        }
      };
  
    const handleBooking =
      async () => {
        try {
          setBookingLoading(true);
  
          const data = await request({
            url: "/member/slot/book",
            method: "POST",
            data: {
              subscriptionId:
                selectedSubscription.id,
              slotId:
                selectedSlot.id,
              bookingDate:
                selectedDate,
            },
          });
  
          Alert.alert(
            "Success",
            data.message ??
              "Booking confirmed."
          );
  
          router.replace('/slot');
        } catch (err) {
          console.log(err);
  
          Alert.alert(
            "Error",
            "Failed to create booking."
          );
        } finally {
          setBookingLoading(false);
        }
      };

      const onRefresh = async () => {
        setRefreshing(true);
      
        try {
          await refreshSession();
      
          if (
            selectedSubscription &&
            selectedDate
          ) {
            await fetchSlots();
          }
        } catch (err) {
          console.log(err);
        } finally {
          setRefreshing(false);
        }
      };
  
    return (
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
              router.replace('/slot')
            }
            style={tw`h-11 w-11 rounded-xl bg-neutral-900 border border-neutral-800 items-center justify-center`}
          >
            <ChevronLeft
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
  
          <View style={tw`ml-4`}>
            <Text
              style={tw`text-white text-2xl font-bold`}
            >
              Book Session
            </Text>
  
            <Text
              style={tw`text-neutral-400 mt-1`}
            >
              Reserve your next training
              slot
            </Text>
          </View>
        </View>
  
        <StepIndicator step={step} />
  
        <View style={tw`mt-6`}>
          {step === 1 && (
            <MembershipStep
              subscriptions={
                subscriptions
              }
              selectedSubscription={
                selectedSubscription
              }
              setSelectedSubscription={
                setSelectedSubscription
              }
              onContinue={() =>
                setStep(2)
              }
            />
          )}
  
          {step === 2 && (
            <DateStep
              dates={dates}
              selectedDate={
                selectedDate
              }
              selectedSubscription={
                selectedSubscription
              }
              onSelectDate={
                setSelectedDate
              }
              onBack={() =>
                setStep(1)
              }
              onContinue={async () => {
                await fetchSlots();
                setStep(3);
              }}
            />
          )}
  
          {step === 3 && (
            <SlotStep
              slots={slots}
              loading={
                slotsLoading
              }
              selectedSlot={
                selectedSlot
              }
              onSelectSlot={
                setSelectedSlot
              }
              onBack={() =>
                setStep(2)
              }
              onContinue={
                validateBooking
              }
            />
          )}
  
          {step === 4 && (
            <ConfirmStep
              bookingLoading={
                bookingLoading
              }
              selectedDate={
                selectedDate
              }
              selectedSlot={
                selectedSlot
              }
              selectedSubscription={
                selectedSubscription
              }
              onBack={() =>
                setStep(3)
              }
              onConfirm={
                handleBooking
              }
            />
          )}
        </View>
  
        {bookingLoading && (
          <View style={tw`mt-6`}>
            <ActivityIndicator
              size="large"
              color="#A3E635"
            />
          </View>
        )}
      </ScrollView>
    );
  }