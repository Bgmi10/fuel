"use client"
import { Branch, Member, Slot, SlotBooking, Subscription } from "@prisma/client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";


type BookingType = SlotBooking & {
    branch: Branch
    subscription: Subscription
    member: Member
    slot: Slot
}

const page = () => {

    const { id } = useParams();
    const [bookings, setBookings] = useState<BookingType[] | null>(null);
    const [filter, setFilter] = useState<
  "TODAY" | "NEXT_7_DAYS" | "NEXT_30_DAYS" | "ALL"
>("TODAY");
const [slot, setSlot] = useState<any>(null);


const filteredBookings = bookings?.filter((booking) => {
    if (filter === "ALL") return true;
  
    const bookingDate = new Date(booking.bookingDate);
    const today = new Date();
  
    today.setHours(0, 0, 0, 0);
  
    if (filter === "TODAY") {
      return (
        bookingDate.toDateString() === today.toDateString()
      );
    }
  
    if (filter === "NEXT_7_DAYS") {
      const sevenDays = new Date();
      sevenDays.setDate(today.getDate() + 7);
  
      return (
        bookingDate >= today &&
        bookingDate <= sevenDays
      );
    }
  
    if (filter === "NEXT_30_DAYS") {
      const thirtyDays = new Date();
      thirtyDays.setDate(today.getDate() + 30);
  
      return (
        bookingDate >= today &&
        bookingDate <= thirtyDays
      );
    }
  
    return true;
  });
    // 
    const fetchSlots = async () => {
        try {
            const res = await fetch(`/api/slot/${id}`);
            const data = await res.json();
            setBookings(data.bookings)
            setSlot(data.bookings?.[0]?.slot)
        } catch (e) {
            console.log(e);
        }
    }
    useEffect(() => {
      fetchSlots();
    }, [])
    return(
        <div>
<div className="p-6">

{/* HEADER */}
<div className="mb-6">
  <h1 className="text-2xl font-bold text-white">
    Slot Bookings
  </h1>

</div>
<div className="mb-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

    <div>
      <h2 className="text-xl font-semibold text-white">
        {slot?.name}
      </h2>

      <p className="text-sm text-neutral-400 mt-1">
        {slot?.startTime} - {slot?.endTime}
      </p>
    </div>

    <div className="flex gap-6">

      <div>
        <p className="text-xs text-neutral-500">
          Capacity
        </p>

        <p className="text-white font-medium">
          {slot?.capacity}
        </p>
      </div>

      <div>
        <p className="text-xs text-neutral-500">
          Bookings
        </p>

        <p className="text-lime-400 font-medium">
          {bookings?.length || 0}
        </p>
      </div>

      <div>
        <p className="text-xs text-neutral-500">
          Attendance
        </p>

        <p className="text-green-400 font-medium">
          {bookings?.filter(
            (b) => b.status === "ATTENDED"
          ).length || 0}
        </p>
      </div>

    </div>
  </div>
</div>
{/* FILTERS */}
<div className="mb-6 flex gap-2 flex-wrap">

  {[
    "TODAY",
    "NEXT_7_DAYS",
    "NEXT_30_DAYS",
    "ALL",
  ].map((item) => (
    <button
      key={item}
      onClick={() => setFilter(item as any)}
      className={`px-4 py-2 rounded-xl text-sm border transition ${
        filter === item
          ? "bg-lime-400 text-black border-lime-400"
          : "bg-neutral-900 text-neutral-300 border-neutral-800"
      }`}
    >
      {item.replaceAll("_", " ")}
    </button>
  ))}

</div>

{/* LIST */}
<div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">

  {!filteredBookings?.length ? (
    <div className="p-10 text-center text-neutral-500">
      No bookings found
    </div>
  ) : (
    <div className="divide-y divide-neutral-800">

      {filteredBookings.map((booking) => (
       <div
       key={booking.id}
       className="p-4 hover:bg-neutral-900/70 transition"
     >
       <div className="flex items-center justify-between">
     
         <div className="min-w-0">
     
           <div className="flex items-center gap-3">
     
             <h3 className="font-medium text-white">
               {booking.member.name}
             </h3>
     
             <span
               className={`px-2 py-1 rounded-md text-[11px] border ${
                 booking.status === "ATTENDED"
                   ? "bg-green-500/10 text-green-400 border-green-500/20"
                   : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
               }`}
             >
               {booking.status}
             </span>
     
           </div>
     
           <div className="flex flex-wrap gap-4 mt-2 text-sm">
     
             <span className="text-neutral-400">
               {booking.member.phone}
             </span>
     
             <span className="text-neutral-500">
               {booking.subscription.serviceName}
             </span>
     
             <span className="text-neutral-500">
               {booking.subscription.packageName}
             </span>
     
           </div>
     
         </div>
     
         <div className="text-right shrink-0">
           <p className=" text-white">
            Booking date:  {new Date(
               booking.bookingDate
             ).toLocaleDateString()}
           </p>
     
           <p>Booked at: {new Date(
               booking.createdAt
             ).toLocaleDateString()} </p>
         </div>
     
       </div>
     
       {booking.checkedInAt && (
         <div className="mt-2 text-xs text-lime-400">
           Checked in •{" "}
           {new Date(
             booking.checkedInAt
           ).toLocaleTimeString()}
         </div>
       )}
     </div>
      ))}

    </div>
  )}

</div>
</div>
        </div>
    )
}

export default page;