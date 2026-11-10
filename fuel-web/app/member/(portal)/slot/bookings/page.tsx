"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  QrCode,
  CalendarPlus2,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/app/utils/date";
import QrModal from "../QrModal";

const Page = () => {
  const router = useRouter();

  const [upcomingBooking, setUpcomingBooking] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second so expired passes update automatically.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch bookings
  const fetchBookings = async () => {
    const res = await fetch("/api/member/slot");
    const data = await res.json();

    setUpcomingBooking(data.upcomingBooking);
    setRecentBookings(data.recentBookings || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchBookings();
      } catch (error) {
        console.error("Failed to fetch bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate session start and end times.
  const getSessionTimes = (booking: any) => {
    if (
      !booking?.bookingDate ||
      !booking?.slot?.startTime ||
      !booking?.slot?.endTime
    ) {
      return null;
    }

    const bookingDate = new Date(booking.bookingDate);

    if (Number.isNaN(bookingDate.getTime())) {
      return null;
    }

    const parseTime = (time: string) => {
      const match = /^(\d{1,2}):(\d{2})$/.exec(time);

      if (!match) return null;

      const hours = Number(match[1]);
      const minutes = Number(match[2]);

      if (
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        return null;
      }

      return { hours, minutes };
    };

    const start = parseTime(booking.slot.startTime);
    const end = parseTime(booking.slot.endTime);

    if (!start || !end) return null;

    const sessionStart = new Date(bookingDate);
    sessionStart.setHours(start.hours, start.minutes, 0, 0);

    const sessionEnd = new Date(bookingDate);
    sessionEnd.setHours(end.hours, end.minutes, 0, 0);

    // Support sessions that end after midnight.
    if (sessionEnd <= sessionStart) {
      sessionEnd.setDate(sessionEnd.getDate() + 1);
    }

    return { sessionStart, sessionEnd };
  };

  // Determine whether a booking's pass has expired.
  const isBookingExpired = (booking: any) => {
    const times = getSessionTimes(booking);

    return (
      !times ||
      currentTime >= times.sessionEnd.getTime()
    );
  };

  // Cancellation is available only before one hour prior to the session.
  const isBeforeOneHour = (() => {
    const times = getSessionTimes(upcomingBooking);

    if (!times) return false;

    return (
      upcomingBooking.status === "BOOKED" &&
      !upcomingBooking.checkedInAt &&
      currentTime <
        times.sessionStart.getTime() - 60 * 60 * 1000 &&
      currentTime < times.sessionEnd.getTime()
    );
  })();

  // Cancel upcoming booking
  const handleCancelBooking = async () => {
    if (!upcomingBooking?.id) return;

    // Recheck cancellation eligibility immediately before submitting.
    const times = getSessionTimes(upcomingBooking);

    if (
      !times ||
      upcomingBooking.status !== "BOOKED" ||
      upcomingBooking.checkedInAt ||
      Date.now() >=
        times.sessionStart.getTime() - 60 * 60 * 1000 ||
      Date.now() >= times.sessionEnd.getTime()
    ) {
      alert("This booking can no longer be cancelled.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const response = await fetch("/api/member/slot/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: upcomingBooking.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.message || "Failed to cancel booking");
        return;
      }

      setUpcomingBooking(null);

      await fetchBookings();
    } catch (error) {
      console.error("Cancel booking error:", error);
      alert("Something went wrong while cancelling the booking.");
    } finally {
      setLoading(false);
    }
  };

  // Automatically close the QR modal when the selected session expires.
  useEffect(() => {
    if (!selectedBooking) return;

    if (isBookingExpired(selectedBooking)) {
      setSelectedBooking(null);
    }
  }, [currentTime, selectedBooking]);

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-sm text-gray-400">
          Manage your training sessions
        </p>
      </div>

      {/* Upcoming Booking */}
      {loading ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
        </div>
      ) : upcomingBooking ? (
        <div className="bg-white/[0.03] backdrop-blur border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-400">
                Upcoming Booking
              </p>

              <h2 className="text-lg font-semibold">
                {upcomingBooking.slot?.name || "Session"}
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                {upcomingBooking.subscription?.serviceName}
                {" • "}
                {upcomingBooking.subscription?.packageName}
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-lime-400/10 text-lime-400 text-xs font-medium">
              {isBookingExpired(upcomingBooking)
                ? "EXPIRED"
                : upcomingBooking.status}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-300">
              <CalendarDays size={18} />
              <span>
                {new Date(
                  upcomingBooking.bookingDate
                ).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center gap-3 text-gray-300">
              <Clock3 size={18} />
              <span>
                {formatTime(upcomingBooking.slot.startTime)} -{" "}
                {formatTime(upcomingBooking.slot.endTime)}
              </span>
            </div>

            <div className="text-sm text-gray-400">
              {upcomingBooking.branch?.name}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            {/* Session Pass */}
            <button
              onClick={() => {
                if (isBookingExpired(upcomingBooking)) return;
                setSelectedBooking(upcomingBooking);
              }}
              disabled={isBookingExpired(upcomingBooking)}
              className="
                flex-1 px-3 py-3 text-xs
                flex items-center justify-center gap-2
                bg-lime-400 text-black font-semibold
                rounded-xl hover:bg-lime-300 transition
                disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              <QrCode size={18} />
              {isBookingExpired(upcomingBooking)
                ? "Pass expired"
                : "Session Pass"}
            </button>

            {/* Cancel */}
            {isBeforeOneHour && (
              <button
                onClick={handleCancelBooking}
                disabled={loading}
                className="
                  px-4 py-3 text-xs font-semibold rounded-xl
                  border border-red-500/30 bg-red-500/10
                  text-red-400 hover:bg-red-500/20
                  hover:border-red-500/50 transition
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {loading ? "Cancelling..." : "Cancel"}
              </button>
            )}
          </div>

          {isBookingExpired(upcomingBooking) && (
            <p className="text-xs text-gray-500 mt-3">
              This session has ended. Your pass has expired.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white/[0.03] backdrop-blur border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-gray-400">
            No upcoming bookings
          </p>
        </div>
      )}

      {/* Book New Session */}
      <div
        onClick={() => router.push("/member/slot/book")}
        className="
          cursor-pointer bg-white/[0.03] backdrop-blur
          border border-white/10 rounded-2xl p-5
          hover:border-lime-400/30 transition-all
        "
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-lime-400/10">
              <CalendarPlus2
                size={22}
                className="text-lime-400"
              />
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Book New Session
              </h3>

              <p className="text-sm text-gray-400">
                Reserve your next training slot
              </p>
            </div>
          </div>

          <ArrowRight size={20} className="text-gray-500" />
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white/[0.03] backdrop-blur border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">
            Recent Bookings
          </h2>
        </div>

        {recentBookings.length > 0 ? (
          <div className="space-y-3 flex flex-col">
            {recentBookings.map((booking) => {
              const isExpired = isBookingExpired(booking);

              const displayStatus = isExpired
                ? "EXPIRED"
                : booking.status;

              return (
                <div
                  key={booking.id}
                  className="
                    p-4 rounded-xl bg-white/[0.03]
                    border border-white/10
                  "
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-medium text-white">
                        {booking.slot?.name || "Session"}
                      </h3>

                      <p className="text-xs text-gray-400 mt-1">
                        {booking.subscription?.serviceName}
                        {" • "}
                        {booking.subscription?.packageName}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {booking.branch?.name || "Branch"}
                      </p>
                    </div>

                    {/* Booking Status */}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        displayStatus === "EXPIRED"
                          ? "bg-neutral-500/10 text-gray-400"
                          : displayStatus === "ATTENDED"
                          ? "bg-green-500/10 text-green-400"
                          : displayStatus === "CANCELLED"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-lime-400/10 text-lime-400"
                      }`}
                    >
                      {displayStatus}
                    </span>
                  </div>

                  {/* Date and Time */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={14} />
                      {new Date(
                        booking.bookingDate
                      ).toLocaleDateString()}
                    </span>

                    <span className="flex items-center gap-1">
                      <Clock3 size={14} />
                      {formatTime(booking.slot.startTime)} -{" "}
                      {formatTime(booking.slot.endTime)}
                    </span>
                  </div>

                  {/* Session Pass */}
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        if (isExpired) return;
                        setSelectedBooking(booking);
                      }}
                      disabled={isExpired}
                      className="
                        text-xs flex items-center justify-center
                        gap-2 px-3 py-2 bg-lime-400 text-black
                        font-semibold rounded-xl hover:bg-lime-300
                        transition disabled:opacity-40
                        disabled:cursor-not-allowed
                      "
                    >
                      <QrCode size={15} />
                      {isExpired ? "Pass expired" : "Session Pass"}
                    </button>
                  </div>

                  {/* Expired Message */}
                  {isExpired && (
                    <p className="text-xs text-gray-500 mt-3">
                      This session has ended. Your pass has expired.
                    </p>
                  )}
                </div>
              );
            })}

            <button
              onClick={() =>
                router.push("/member/slot/bookings")
              }
              className="text-sm text-lime-400 hover:text-lime-300"
            >
              View More
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">
              No recent bookings found
            </p>
          </div>
        )}
      </div>

      {/* QR Modal */}
      <QrModal
        selectedBooking={selectedBooking}
        setSelectedBooking={setSelectedBooking}
      />
    </div>
  );
};

export default Page;