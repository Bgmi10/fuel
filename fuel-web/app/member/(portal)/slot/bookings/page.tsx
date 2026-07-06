"use client";

import { useAuth } from "@/app/contexts/MemberAuthContext";
import { useState } from "react";
import {
  CalendarDays,
  Clock3,
  Building2,
  QrCode,
} from "lucide-react";
import QrModal from "../QrModal";
import { useRouter } from "next/navigation";

const Page = () => {
  const { user: member } = useAuth();
  const bookings = member?.slotBookings || [];

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
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
          <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-sm text-gray-400">
          All your session history & check-in passes
        </p>
          </div>
        
      </div>

      {/* List */}
      <div className="space-y-3">
        {bookings.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-center text-gray-400">
            No bookings found
          </div>
        ) : (
          bookings.map((booking: any) => (
            <div
              key={booking.id}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-lime-400/20 transition"
            >
              {/* Top */}
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

              {/* Meta */}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <CalendarDays size={14} />
                  {new Date(
                    booking.bookingDate
                  ).toLocaleDateString()}
                </span>

                <span className="flex items-center gap-1">
                  <Clock3 size={14} />
                  {booking.slot.startTime} -{" "}
                  {booking.slot.endTime}
                </span>
              </div>

              {/* Action */}
              <button
                onClick={() => setSelectedBooking(booking)}
                className="mt-4 px-3 flex items-center justify-center gap-2 px-4 py-2 bg-lime-400 text-black font-semibold rounded-xl hover:bg-lime-300 transition"
              >
                <QrCode size={15} />
                Session pass
              </button>
            </div>
          ))
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