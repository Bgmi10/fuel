"use client";

import { useEffect, useState } from "react";
import { MemberModal } from "./MemberModal";
import { Member as MemberType } from "@prisma/client";
import { useRouter } from 'next/navigation'


export const Member = () => {
  const [members, setMembers] = useState<(MemberType & {
    currentStatus: string;
})[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "FROZEN" | "CANCELLED">("ALL");
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      setMembers(data.members || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchMembers();
  }, []);

  const statusStyles: Record<string, string> = {
    ACTIVE: "bg-green-500/20 text-green-400",
    EXPIRED: "bg-red-500/20 text-red-400",
    FROZEN: "bg-blue-500/20 text-blue-400",
    CANCELLED: "bg-yellow-500/20 text-yellow-400",
    NONE: "bg-neutral-700 text-neutral-400",
  };

  const filtered = members.filter((m: any) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search);
  
    const matchesFilter =
      filter === "ALL" || m.currentStatus === filter;
  
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Members</h1>
          <p className="text-neutral-500 text-sm">
            Manage your gym members
          </p>
        </div>

        <button
          onClick={() => {
            setSelected(null);
            setOpen(true);
          }}
          className="px-4 py-2 bg-lime-400 text-black rounded-md font-semibold"
        >
          + Add Member
        </button>
      </div>

      {/* SEARCH */}
      <input
        placeholder="Search by name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full px-4 py-2 bg-neutral-800 text-white rounded-md border border-neutral-700"
      />
      <div className="flex gap-3 mb-4">
  {["ALL", "ACTIVE", "EXPIRED", "CANCELLED", "FROZEN"].map((f) => (
    <button
      key={f}
      onClick={() => setFilter(f as any)}
      className={`px-3 py-1 text-xs rounded ${
        filter === f
          ? "bg-lime-400 text-black"
          : "bg-neutral-800 text-neutral-400"
      }`}
    >
      {f}
    </button>
  ))}
</div>

      {/* TABLE */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-neutral-400 border-b border-neutral-800">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((m) => (
              <tr
                key={m.id}
                className="border-b border-neutral-800 hover:bg-neutral-800/40 cursor-pointer"
                onClick={() => {
                    router.push(`/dashboard/members/${m.id}`);
                }}
              >
                <td className="p-4 text-white">{m.name}</td>
                <td className="text-neutral-300">{m.phone}</td>
                <td className="text-neutral-400">{m.email || "-"}</td>
                <td className="text-neutral-500 text-xs">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
                <td>
                <span
  className={`text-xs px-2 py-1 rounded ${
    statusStyles[m.currentStatus] || statusStyles["NONE"]
  }`}
>
  {m.currentStatus}
</span>
                </td>
               
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <p className="text-neutral-500 mt-4">Loading...</p>
      )}
      
      {
        open && <MemberModal open={open} setOpen={setOpen} onSuccess={() => {
          window.alert('Member created successfully');
          setOpen(false);
          fetchMembers()
        }}/>
      }
    

    </div>
  );
};