"use client";

import { useAuth } from "@/app/contexts/MemberAuthContext";
import { useState } from "react";
import {
  Check,
  ChevronRight,
  Building2,
  Package,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/app/utils/date";

const Page = () => {
  const { user: member } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedSubscription, setSelectedSubscription] =
    useState<any>(null);
    const [selectedDate, setSelectedDate] =
  useState<Date | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
const [slotsLoading, setSlotsLoading] = useState(false);
const [selectedSlot, setSelectedSlot] = useState<any>(null);
const [bookingLoading, setBookingLoading] = useState(false);
const fetchSlots = async () => {
    if (!selectedSubscription || !selectedDate) return;
  
    try {
      setSlotsLoading(true);
  
      const res = await fetch(
        `/api/member/slot/book/available?subscriptionId=${
          selectedSubscription.id
        }&bookingDate=${selectedDate.toISOString()}`
      );
  
      const data = await res.json();
  
      setSlots(data);
    } catch (error) {
      console.error(error);
    } finally {
      setSlotsLoading(false);
    }
  };    

  const handleBooking = async () => {
    try {
      setBookingLoading(true);
  
      const res = await fetch(
        "/api/member/slot/book",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriptionId:
              selectedSubscription.id,
            slotId: selectedSlot.id,
            bookingDate: selectedDate,
          }),
        }
      );
  
      const data = await res.json();
  
      if (!res.ok) {
        alert(
          data.error ||
            "Failed to create booking"
        );
        return;
      }
  
      alert("Booking confirmed");
  
      window.location.href =
        "/member/slot";
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setBookingLoading(false);
    }
  };

  const dates = Array.from(
    { length: 7 },
    (_, i) => {
      const date = new Date();
  
      date.setDate(
        date.getDate() + i
      );
  
      return date;
    }
  );

  const subscriptions =
    member?.subscriptions?.filter(
      (s) => s.status === "ACTIVE"
    ) || [];

    const validateBooking = async () => {
        try {
          const res = await fetch(
            "/api/member/slot/book/validate",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                memberId: member?.id,
                subscriptionId:
                  selectedSubscription.id,
                slotId: selectedSlot.id,
                bookingDate: selectedDate,
              }),
            }
          );
      
          const data = await res.json();
      
          if (!data.valid) {
            alert(data.error);
            return;
          }
      
          setStep(4);
        } catch (error) {
          console.error(error);
        }
      };
      const steps = ["Membership", "Date", "Slot", "Confirm"];
      const router = useRouter();

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="flex gap-2 items-center">
      <button
            onClick={() =>
              router.back()
            }
            className="h-10 w-10 rounded-xl bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 transition"
          >
            ←
          </button>
          <div>
          <h1 className="text-2xl font-bold">
          Book Session
        </h1>

        <p className="text-sm text-gray-400">
          Reserve your next training slot
        </p>
          </div>
        
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 w-full">
      <div className="w-full overflow-x-auto">
  <div className="flex items-start min-w-max px-2">
    {steps.map((item, index) => (
      <div key={item} className="flex flex-1 items-start">
        <div className="flex flex-col items-center shrink-0">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${
              step > index + 1
                ? "bg-lime-400 text-black"
                : step === index + 1
                ? "bg-lime-400/20 border border-lime-400 text-lime-400"
                : "bg-white/5 text-gray-500"
            }`}
          >
            {step > index + 1 ? <Check size={16} /> : index + 1}
          </div>

          <span className="mt-3 text-sm text-gray-400 whitespace-nowrap">
            {item}
          </span>
        </div>

        {index < steps.length - 1 && (
          <div
            className={`flex-1 h-px mx-6 mt-5 ${
              step > index + 1 ? "bg-lime-400/50" : "bg-white/10"
            }`}
          />
        )}
      </div>
    ))}
  </div>
</div>
</div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-lg">
              Select Membership
            </h2>

            <p className="text-sm text-gray-400">
              Choose the membership you want to
              use for this booking.
            </p>
          </div>

          {subscriptions.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-center">
              <p className="text-gray-400">
                No active memberships found.
              </p>
            </div>
          ) : (
            subscriptions.map((subscription) => (
              <button
                key={subscription.id}
                onClick={() =>
                  setSelectedSubscription(
                    subscription
                  )
                }
                className={`w-full text-left p-5 rounded-2xl border transition-all ${
                  selectedSubscription?.id ===
                  subscription.id
                    ? "border-lime-400 bg-lime-400/5"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <div className="flex justify-between items-start">
                <div className="space-y-2">
  <div className="flex items-center gap-2">
    <Building2 size={16} className="text-lime-400" />
    <span className="font-medium">
      {subscription.branch?.name}
    </span>
  </div>

  <div className="flex items-center gap-2 text-sm text-gray-300">
    <Package size={16} className="shrink-0" />

    <span>
      {subscription.serviceName}
      {" • "}
      {subscription.packageName}
    </span>
  </div>

  <div className="text-xs text-gray-400">
    Valid until {new Date(subscription.endDate).toLocaleDateString()}
  </div>
</div>

                  {selectedSubscription?.id ===
                    subscription.id && (
                    <div className="h-8 w-8 rounded-full bg-lime-400 flex items-center justify-center">
                      <Check
                        size={16}
                        className="text-black"
                      />
                    </div>
                  )}
                </div>
              </button>
            ))
          )}

          <button
            disabled={!selectedSubscription}
            onClick={() => setStep(2)}
            className="w-full bg-lime-400 text-black font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Continue
            <ChevronRight size={18} />
          </button>
        </div>
      )}



     {/* Step 2 */}
{step === 2 && (
  <div className="space-y-4">
    <div>
      <h2 className="font-semibold text-lg">
        Select Date
      </h2>

      <p className="text-sm text-gray-400">
        Choose the day you would like to attend.
      </p>
    </div>

    {/* Selected Membership Summary */}
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">
            Selected Membership
          </p>

          <h3 className="font-medium">
            {selectedSubscription?.package?.name}
          </h3>

          <p className="text-xs text-gray-500 mt-1">
            {selectedSubscription?.branch?.name}
          </p>
        </div>

        <button
          onClick={() => setStep(1)}
          className="text-sm text-lime-400"
        >
          Change
        </button>
      </div>
    </div>

    {/* Date Selection */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {dates.map((date, index) => {
        const isSelected =
          selectedDate?.toDateString() ===
          date.toDateString();

        const dayName =
          index === 0
            ? "Today"
            : index === 1
            ? "Tomorrow"
            : date.toLocaleDateString("en-US", {
                weekday: "short",
              });

        return (
          <button
            key={date.toISOString()}
            onClick={() =>
              setSelectedDate(date)
            }
            className={`p-4 rounded-2xl border transition-all text-center ${
              isSelected
                ? "border-lime-400 bg-lime-400/10"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                isSelected
                  ? "text-lime-400"
                  : "text-gray-300"
              }`}
            >
              {dayName}
            </p>

            <p className="text-2xl font-bold mt-1">
              {date.getDate()}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              {date.toLocaleDateString(
                "en-US",
                {
                  month: "short",
                }
              )}
            </p>
          </button>
        );
      })}
    </div>

    {/* Selected Date Preview */}
    {selectedDate && (
      <div className="bg-lime-400/10 border border-lime-400/20 rounded-2xl p-4">
        <p className="text-sm text-lime-400">
          Selected Date
        </p>

        <p className="font-medium mt-1">
          {selectedDate.toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }
          )}
        </p>
      </div>
    )}

    {/* Navigation */}
    <div className="flex gap-3">
      <button
        onClick={() => setStep(1)}
        className="flex-1 border border-white/10 bg-white/[0.03] rounded-xl py-3 font-medium"
      >
        Back
      </button>

      <button
        disabled={!selectedDate}
        onClick={async () => {
            await fetchSlots();
            setStep(3);
          }}
        className="flex-1 bg-lime-400 text-black font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        Continue
        <ChevronRight size={18} />
      </button>
    </div>
  </div>
)}

{step === 3 && (
  <div className="space-y-4">
    <div>
      <h2 className="font-semibold text-lg">
        Select Slot
      </h2>
    </div>
   

    {slotsLoading ? (
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-center">
        Loading slots...
      </div>
    ) : slots.length === 0 ? (
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-center text-red-400">
        No slots available.
      </div>
    ) : (
      <div className="space-y-3">
        {slots?.map((slot) => (
          <button
            key={slot.id}
            disabled={slot.isFull}
            onClick={() =>
              setSelectedSlot(slot)
            }
            className={`w-full p-5 rounded-2xl border text-left transition-all ${
              selectedSlot?.id === slot.id
                ? "border-lime-400 bg-lime-400/10"
                : "border-white/10 bg-white/[0.03]"
            } ${
              slot.isFull
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-white/20"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">
                  {slot.name}
                </h3>

                <p className="text-sm text-gray-400 mt-1">
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                </p>

                <p className="text-xs text-gray-500 mt-2">
                  {slot.available} spots available
                </p>
              </div>

              {slot.isFull ? (
                <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">
                  Full
                </span>
              ) : selectedSlot?.id ===
                slot.id ? (
                <div className="h-8 w-8 rounded-full bg-lime-400 flex items-center justify-center">
                  <Check
                    size={16}
                    className="text-black"
                  />
                </div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    )}

    <div className="flex gap-3">
      <button
        onClick={() => setStep(2)}
        className="flex-1 border border-white/10 bg-white/[0.03] rounded-xl py-3 font-medium"
      >
        Back
      </button>

      <button
        disabled={!selectedSlot}
        onClick={validateBooking}
        className="flex-1 bg-lime-400 text-black font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        Continue
        <ChevronRight size={18} />
      </button>
    </div>
  </div>
)}

{step === 4 && (
  <div className="space-y-4">
    <div>
      <h2 className="font-semibold text-lg">
        Confirm Booking
      </h2>

      <p className="text-sm text-gray-400">
        Review your booking details before
        confirming.
      </p>
    </div>

    <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-white/10">
        <p className="text-xs text-gray-500">
          Membership
        </p>

        <p className="font-medium mt-1">
          {selectedSubscription?.package?.name}
        </p>
      </div>

      <div className="p-5 border-b border-white/10">
        <p className="text-xs text-gray-500">
          Branch
        </p>

        <p className="font-medium mt-1">
          {selectedSubscription?.branch?.name}
        </p>
      </div>

      <div className="p-5 border-b border-white/10">
        <p className="text-xs text-gray-500">
          Date
        </p>

        <p className="font-medium mt-1">
          {selectedDate?.toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }
          )}
        </p>
      </div>

      <div className="p-5 border-b border-white/10">
        <p className="text-xs text-gray-500">
          Slot
        </p>

        <p className="font-medium mt-1">
          {selectedSlot?.name}
        </p>

        <p className="text-sm text-gray-400 mt-1">
          {formatTime(selectedSlot?.startTime)} -{" "}
          {formatTime(selectedSlot?.endTime)}
        </p>
      </div>
    </div>

    <div className="bg-lime-400/10 border border-lime-400/20 rounded-2xl p-4">
      <p className="text-sm text-lime-400">
        After booking, a QR code will be
        generated and can be used for
        check-in during your session.
      </p>
    </div>

    <div className="flex gap-3">
      <button
        onClick={() => setStep(3)}
        disabled={bookingLoading}
        className="flex-1 border border-white/10 bg-white/[0.03] rounded-xl py-3 font-medium"
      >
        Back
      </button>

      <button
        onClick={handleBooking}
        disabled={bookingLoading}
        className="flex-1 bg-lime-400 text-black font-semibold py-3 rounded-xl disabled:opacity-50"
      >
        {bookingLoading
          ? "Booking..."
          : "Confirm Booking"}
      </button>
    </div>
  </div>
)}
    </div>
  );
};

export default Page;