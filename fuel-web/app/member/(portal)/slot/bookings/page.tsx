"use client";

import { useAuth } from "@/app/contexts/MemberAuthContext";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Building2,
  QrCode,
  XCircle,
} from "lucide-react";
import QrModal from "../QrModal";
import { useRouter } from "next/navigation";

const Page = () => {
  const {
    user: member,
    checkSession
  } = useAuth();

  const [bookings, setBookings] = useState<any[]>(
    member?.slotBookings || []
  );

  const [selectedBooking, setSelectedBooking] =
    useState<any>(null);

  const [cancellingId, setCancellingId] =
    useState<string | null>(null);

  const router = useRouter();

  // =========================================================
  // REFRESH MEMBER DATA WHEN PAGE LOADS
  // =========================================================

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // =========================================================
  // SYNC BOOKINGS WITH MEMBER DATA
  // =========================================================

  useEffect(() => {
    setBookings(member?.slotBookings || []);
  }, [member?.slotBookings]);

  // =========================================================
  // CANCEL BOOKING
  // =========================================================

  const handleCancelBooking = async (booking: any) => {
    if (!booking?.id) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    try {
      setCancellingId(booking.id);

      const response = await fetch(
        "/api/member/slot/cancel",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: booking.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data?.message ||
            "Failed to cancel booking"
        );
        return;
      }

      // Close QR modal if this booking was selected
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(null);
      }

      // Immediately remove from UI
      setBookings((currentBookings) =>
        currentBookings.filter(
          (item) => item.id !== booking.id
        )
      );

      // Refresh member context from database
      await checkSession();
    } catch (error) {
      console.error(
        "Cancel booking error:",
        error
      );

      alert(
        "Something went wrong while cancelling the booking"
      );
    } finally {
      setCancellingId(null);
    }
  };

  
  return (
    <div className="space-y-6 text-white">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex gap-2 items-center">
        <button
          onClick={() => router.back()}
          className="
            h-10
            w-10
            rounded-xl
            bg-neutral-900
            border
            border-neutral-800
            text-white
            hover:bg-neutral-800
            transition
          "
        >
          ←
        </button>

        <div>
          <h1 className="text-2xl font-bold">
            My Bookings
          </h1>

          <p className="text-sm text-gray-400">
            All your session history & check-in passes
          </p>
        </div>
      </div>

      {/* =====================================================
          BOOKINGS
      ===================================================== */}

      <div className="space-y-3">
        {bookings.length === 0 ? (
          <div
            className="
              bg-white/[0.03]
              border
              border-white/10
              rounded-2xl
              p-6
              text-center
              text-gray-400
            "
          >
            No bookings found
          </div>
        ) : (
          bookings.map((booking: any) => {
            const bookingDate = new Date(
              booking.bookingDate
            );

            const isPast =
              bookingDate.getTime() < Date.now();

            const canCancel =
              booking.status === "BOOKED" &&
              !booking.checkedInAt &&
              !isPast;

              const isBeforeOneHour = (() => {
                if (
                  !booking?.bookingDate ||
                  !booking?.slot?.startTime
                ) {
                  return false;
                }
              
                const bookingDate = new Date(booking.bookingDate);
              
                // Extract YYYY-MM-DD from booking date
                const year = bookingDate.getFullYear();
                const month = String(bookingDate.getMonth() + 1).padStart(2, "0");
                const day = String(bookingDate.getDate()).padStart(2, "0");
              
                // slot.startTime example: "13:23"
                const [hours, minutes] = booking.slot.startTime
                  .split(":")
                  .map(Number);
              
                // Create the exact session datetime
                const sessionStart = new Date(
                  year,
                  Number(month) - 1,
                  Number(day),
                  hours,
                  minutes,
                  0,
                  0
                );
              
                // One hour before session
                const cancellationDeadline =
                  sessionStart.getTime() - 60 * 60 * 1000;
              
                // Cancel is available only BEFORE the deadline
                return Date.now() < cancellationDeadline;
              })();

            return (
              <div
                key={booking.id}
                className="
                  bg-white/[0.03]
                  border
                  border-white/10
                  rounded-2xl
                  p-4
                  hover:border-lime-400/20
                  transition
                "
              >
                {/* =================================================
                    TOP
                ================================================= */}

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white">
                      {booking.slot.name}
                    </h3>

                    <p className="text-xs text-gray-400 mt-1">
                      {booking.subscription.serviceName}
                      {" • "}
                      {booking.subscription.packageName}
                    </p>

                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Building2 size={12} />
                      {booking.branch.name}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === "ATTENDED"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-lime-400/10 text-lime-400"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>

                {/* =================================================
                    META
                ================================================= */}

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={14} />

                    {bookingDate.toLocaleDateString()}
                  </span>

                  <span className="flex items-center gap-1">
                    <Clock3 size={14} />

                    {booking.slot.startTime} -{" "}
                    {booking.slot.endTime}
                  </span>
                </div>

                {/* =================================================
                    ACTIONS
                ================================================= */}

                <div className="mt-4 flex gap-2">

                  {/* SESSION PASS */}

                  <button
                    onClick={() =>
                      setSelectedBooking(booking)
                    }
                    className="
                      flex-1
                      flex
                      items-center
                      justify-center
                      gap-2
                      px-4
                      py-2
                      bg-lime-400
                      text-black
                      font-semibold
                      rounded-xl
                      hover:bg-lime-300
                      transition
                    "
                  >
                    <QrCode size={15} />

                    Session pass
                  </button>

                  {/* CANCEL */}

                  {isBeforeOneHour && canCancel && (
                    <button
                      onClick={() =>
                        handleCancelBooking(booking)
                      }
                      disabled={
                        cancellingId === booking.id
                      }
                      className="
                        flex
                        items-center
                        justify-center
                        gap-2
                        px-4
                        py-2
                        bg-red-500/10
                        border
                        border-red-500/20
                        text-red-400
                        font-semibold
                        rounded-xl
                        hover:bg-red-500/20
                        hover:border-red-500/40
                        transition
                        disabled:opacity-50
                        disabled:cursor-not-allowed
                      "
                    >
                      <XCircle size={15} />

                      {cancellingId === booking.id
                        ? "Cancelling..."
                        : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =====================================================
          QR MODAL
      ===================================================== */}

      <QrModal
        selectedBooking={selectedBooking}
        setSelectedBooking={setSelectedBooking}
      />
    </div>
  );
};

export default Page;