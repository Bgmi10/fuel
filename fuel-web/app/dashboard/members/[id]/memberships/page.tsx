"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell, Snowflake, Flame } from "lucide-react";
import { FreezeModal } from "../Freezemodal";

export default function MembershipsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [member, setMember] = useState<any>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [openFreezeModal, setOpenFreezeModal] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);

  const fetchMember = async () => {
    try {
      const res = await fetch(`/api/members/${id}`);
      const data = await res.json();

      setMember(data.member);
      setActiveSubscriptions(data.activeSubscriptions || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchMember();
  }, [id]);

  if (loading) {
    return <div className="p-10 text-neutral-500">Loading...</div>;
  }

  if (!member) {
    return <div className="p-10 text-red-500">Member not found</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/dashboard/members/${id}`)}
              className="w-10 h-10 rounded-xl border border-neutral-800 flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 className="text-2xl font-bold">Memberships</h1>
              <p className="text-sm text-neutral-500">{member.name}</p>
            </div>
          </div>
        </div>

        {/* ACTIVE MEMBERSHIPS */}
        <div className="space-y-6">

          {activeSubscriptions.length === 0 ? (
            <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400">
              No active memberships found
            </div>
          ) : (
            activeSubscriptions.map((sub) => {
              const today = new Date();
              const startDate = new Date(sub.startDate);
              const endDate = new Date(sub.endDate);

              const effectiveStart = today > startDate ? today : startDate;

              const daysLeft = Math.max(
                0,
                Math.ceil((endDate.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24))
              );

              const totalDays = Math.ceil(
                (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={sub.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"
                >

                  {/* TOP */}
                  <div className="flex items-start justify-between flex-wrap gap-4">

                    <div>
                      <div className="flex items-center gap-3">
                        <Dumbbell size={18} className="text-lime-400" />

                        <h2 className="text-xl font-bold">
                          {sub.package.name}
                        </h2>

                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            sub.status === "ACTIVE"
                              ? "bg-lime-400/15 text-lime-400"
                              : sub.status === "FROZEN"
                              ? "bg-blue-400/15 text-blue-400"
                              : "bg-neutral-400/15 text-neutral-400"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>

                      <p className="text-sm text-neutral-400 mt-2">
                        {sub.package.service.name} • {sub.branch?.name}
                      </p>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-2 flex-wrap">

<button

onClick={() => {
  router.push(`/dashboard/members/${member.id}/memberships/${sub.id}/edit`)
}}
  className="h-8 px-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors"
>
  Edit Membership
</button>

{sub.status === "ACTIVE" && (
  <button
    onClick={() => {
      setSelectedSubscriptionId(sub.id);
      setOpenFreezeModal(true);
    }}
    className="h-8 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
  >
    Freeze
  </button>
)}

{sub.status === "FROZEN" && (
  <button
    onClick={async () => {
      const ok = confirm("Unfreeze this subscription?");
      if (!ok) return;

      await fetch(`/api/subscriptions/${sub.id}/unfreeze`, {
        method: "PATCH",
      });

      fetchMember();
    }}
    className="h-8 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
  >
    Unfreeze
  </button>
)}

<button
onClick={() => {
  router.push(`/dashboard/members/${member.id}/assignplan`)
}}
  className="h-8 px-4 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:bg-violet-500/20 transition-colors font-medium"
>
  Upgrade
</button>

<button
onClick={() => {
  router.push(`/dashboard/members/${member.id}/memberships/${sub.id}/billing`)
}}
  className="h-8 px-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-colors font-medium"
>
  Billing History
</button>

<button
  className="h-8 px-4 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 transition-colors"
>
  Download Invoice
</button>

</div>
                  </div>

                  {/* DETAILS */}
                  <div className="grid md:grid-cols-3 gap-2 mt-6 max-w-md">

                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 w-fit">
                      <p className="text-xs text-neutral-500">Start Date</p>
                      <p className="mt-2">{new Date(sub.startDate).toLocaleDateString()}</p>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                      <p className="text-xs text-neutral-500">End Date</p>
                      <p className="mt-2">{new Date(sub.endDate).toLocaleDateString()}</p>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                      <p className="text-xs text-neutral-500">
                        {sub.status === "FROZEN"
                          ? "Frozen"
                          : today < startDate
                          ? "Starts In"
                          : "Remaining"}
                      </p>

                      <p className="mt-2 text-lime-400 font-semibold">
                        {sub.status === "FROZEN"
                          ? "FROZEN"
                          : `${daysLeft} / ${totalDays} Days`}
                      </p>
                    </div>

                  </div>

                  {/* FREEZE INFO */}
                  {sub.status === "FROZEN" && (
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-blue-950/20 border border-blue-800/40 rounded-2xl p-4">
                        <p className="text-xs text-blue-400">Freeze Start</p>
                        <p className="mt-2">{new Date(sub.freezeStart).toLocaleDateString()}</p>
                      </div>

                      <div className="bg-blue-950/20 border border-blue-800/40 rounded-2xl p-4">
                        <p className="text-xs text-blue-400">Freeze End</p>
                        <p className="mt-2">{new Date(sub.freezeEnd).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>

        {/* MODAL */}
        {openFreezeModal && selectedSubscriptionId && (
          <FreezeModal
            subscriptionId={selectedSubscriptionId}
            open={openFreezeModal}
            onClose={() => {
              setOpenFreezeModal(false);
              setSelectedSubscriptionId(null);
            }}
            onSuccess={() => {
              fetchMember();
              setOpenFreezeModal(false);
              setSelectedSubscriptionId(null);
            }}
          />
        )}

      </div>
    </div>
  );
}