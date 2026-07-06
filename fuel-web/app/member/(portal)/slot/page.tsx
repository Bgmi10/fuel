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
import QrModal from "./QrModal";

const Page = () => {
  const router = useRouter();

  const [upcomingBooking, setUpcomingBooking] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/member/slot");
        const data = await res.json();

        setUpcomingBooking(data.upcomingBooking);
        setRecentBookings(data.recentBookings || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      {upcomingBooking.slot.name}
    </h2>

    <p className="text-xs text-gray-400 mt-1">
      {upcomingBooking.subscription.serviceName}
      {" • "}
      {upcomingBooking.subscription.packageName}
    </p>
  </div>

  <span className="px-3 py-1 rounded-full bg-lime-400/10 text-lime-400 text-xs font-medium">
    {upcomingBooking.status}
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
                {upcomingBooking.slot.startTime} -{" "}
                {upcomingBooking.slot.endTime}
              </span>
            </div>

            <div className="text-sm text-gray-400">
              {upcomingBooking.branch.name}
            </div>
          </div>

          <button
              onClick={() => setSelectedBooking(upcomingBooking)}
            className="mt-5 px-3 text-xs flex items-center justify-center gap-2 bg-lime-400 text-black font-semibold py-3 rounded-xl hover:bg-lime-300 transition"
          >
            <QrCode size={18} />
            Session Pass
          </button>
        </div>
      ) : (
        <div className="bg-white/[0.03] backdrop-blur border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-gray-400">
            No upcoming bookings
          </p>
        </div>
      )}

      {/* Book Session */}
      <div
        onClick={() => router.push("/member/slot/book")}
        className="cursor-pointer bg-white/[0.03] backdrop-blur border border-white/10 rounded-2xl p-5 hover:border-lime-400/30 transition-all"
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

          <ArrowRight
            size={20}
            className="text-gray-500"
          />
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
            {recentBookings.map((booking) => (
             <div
             key={booking.id}
             className="p-4 rounded-xl bg-white/[0.03] border border-white/10"
           >
             <div className="flex justify-between items-start">
               <div>
                 <h3 className="font-medium text-white">
                   {booking.slot.name}
                 </h3>
           
                 <p className="text-xs text-gray-400 mt-1">
                   {booking.subscription.serviceName}
                   {" • "}
                   {booking.subscription.packageName}
                 </p>
           
                 <p className="text-xs text-gray-500 mt-1">
                   {booking.branch.name}
                 </p>
               </div>
           <div className="flex gap-1 items-center">
           <button
              onClick={() => setSelectedBooking(booking)}
            className="text-xs flex items-center justify-center gap-2 px-3 py-2 bg-lime-400 text-black font-semibold py-3 rounded-xl hover:bg-lime-300 transition"
          >
            <QrCode size={15} />
            Session Pass
          </button>

           </div>
             
             </div>
           
             <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
               <span>
                 {new Date(
                   booking.bookingDate
                 ).toLocaleDateString()}
               </span>
           
               <span>
                 {booking.slot.startTime} - {booking.slot.endTime}
               </span>
             </div>
           </div>
            ))}
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

      <QrModal selectedBooking={selectedBooking} setSelectedBooking={setSelectedBooking} />
    </div>
  );
};

export default Page;