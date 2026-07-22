"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  Dumbbell,
  Infinity as InfinityIcon,
} from "lucide-react";

import { TransferMembershipModal } from "./TransferMembershipModal";
import { FreezeModal } from "../Freezemodal";

export default function MembershipsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [member, setMember] = useState<any>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [openFreezeModal, setOpenFreezeModal] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [
    openTransferModal,
    setOpenTransferModal,
  ] = useState(false);
  
  const [
    selectedTransferSubscription,
    setSelectedTransferSubscription,
  ] = useState<any | null>(null);

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

              const isSessionBased =
                sub.usageType === "SESSION_BASED";

              const totalSessions =
                typeof sub.totalSessions === "number"
                  ? sub.totalSessions
                  : 0;

              const remainingSessions =
                typeof sub.remainingSessions === "number"
                  ? Math.max(
                      sub.remainingSessions,
                      0
                    )
                  : 0;

              const usedSessions =
                isSessionBased
                  ? Math.max(
                      totalSessions -
                        remainingSessions,
                      0
                    )
                  : 0;

              const sessionUsagePercentage =
                isSessionBased &&
                totalSessions > 0
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        Math.round(
                          (usedSessions /
                            totalSessions) *
                            100
                        )
                      )
                    )
                  : 0;

              const hasNoSessionsRemaining =
                isSessionBased &&
                remainingSessions <= 0;

              const effectiveStart = today > startDate ? today : startDate;

              const daysLeft = Math.max(
                0,
                Math.ceil((endDate.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24))
              );

              const totalDays = Math.ceil(
                (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
              );

              const latestTransfer =
  sub.membershipTransfers?.[0] || null;

  const receivedThroughTransfer =
  Boolean(latestTransfer);

              return (
                <div
                  key={sub.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"
                >

                  {/* TOP */}
                  <div className="flex items-start justify-between flex-wrap gap-4">

                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
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

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                            isSessionBased
                              ? hasNoSessionsRemaining
                                ? "border-red-500/30 bg-red-500/10 text-red-400"
                                : "border-violet-500/30 bg-violet-500/10 text-violet-300"
                              : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                          }`}
                        >
                          {isSessionBased ? (
                            <Dumbbell size={13} />
                          ) : (
                            <InfinityIcon size={13} />
                          )}

                          {isSessionBased
                            ? `${remainingSessions} Sessions Left`
                            : "Unlimited Access"}
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

{(sub.status === "ACTIVE" ||
  sub.status === "FROZEN") && (
  <button
    type="button"
    onClick={() => {
      setSelectedTransferSubscription(sub);
      setOpenTransferModal(true);
    }}
    className="flex h-8 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
  >
    <ArrowRightLeft size={15} />
    Transfer Membership
  </button>
)}

</div>
                  </div>


                  {receivedThroughTransfer && latestTransfer && (
  <div className="mt-6 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-violet-300">
          Received through membership transfer
        </p>

        <p className="mt-1 text-sm text-neutral-400">
          Transferred from{" "}
          <span className="font-medium text-white">
            {latestTransfer.fromMember.name}
          </span>{" "}
          by{" "}
          <span className="font-medium text-white">
            {latestTransfer.transferredBy.name}
          </span>
          .
        </p>
      </div>

      <p className="shrink-0 text-xs text-neutral-500">
        {new Date(
          latestTransfer.createdAt
        ).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
        <p className="text-xs text-neutral-500">
          Previous member
        </p>

        <p className="mt-1 text-sm font-medium text-white">
          {latestTransfer.fromMember.name}
        </p>

        <p className="mt-1 text-xs text-neutral-500">
          {latestTransfer.fromMember.phone}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
        <p className="text-xs text-neutral-500">
          Transfer fee
        </p>

        <p className="mt-1 text-sm font-medium text-white">
          ₹
          {Number(
            latestTransfer.transferFee ?? 0
          ).toLocaleString("en-IN")}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
        <p className="text-xs text-neutral-500">
          Transferred by
        </p>

        <p className="mt-1 text-sm font-medium text-white">
          {latestTransfer.transferredBy.name}
        </p>

        <p className="mt-1 text-xs text-neutral-500">
          {latestTransfer.transferredBy.role}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
        <p className="text-xs text-neutral-500">
          Reason
        </p>

        <p className="mt-1 break-words text-sm text-white">
          {latestTransfer.reason || "Not provided"}
        </p>
      </div>
    </div>
  </div>
)}

{/* MEMBERSHIP ACCESS */}
                  <div
                    className={`mt-6 rounded-2xl border p-5 ${
                      isSessionBased
                        ? hasNoSessionsRemaining
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-violet-500/30 bg-violet-500/5"
                        : "border-cyan-500/30 bg-cyan-500/5"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            isSessionBased
                              ? "bg-violet-500/10 text-violet-300"
                              : "bg-cyan-500/10 text-cyan-300"
                          }`}
                        >
                          {isSessionBased ? (
                            <Dumbbell size={20} />
                          ) : (
                            <InfinityIcon size={20} />
                          )}
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                            Membership Usage Type
                          </p>

                          <h3 className="mt-1 font-semibold text-white">
                            {isSessionBased
                              ? "Fixed Session Membership"
                              : "Duration-Based Membership"}
                          </h3>

                          <p className="mt-1 text-sm text-neutral-400">
                            {isSessionBased
                              ? "One session is deducted after each successful QR check-in."
                              : "Member has unlimited access until the membership end date."}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${
                          isSessionBased
                            ? hasNoSessionsRemaining
                              ? "bg-red-500/10 text-red-400"
                              : "bg-violet-500/10 text-violet-300"
                            : "bg-cyan-500/10 text-cyan-300"
                        }`}
                      >
                        {isSessionBased
                          ? `${remainingSessions} of ${totalSessions} available`
                          : "Unlimited Entry"}
                      </span>
                    </div>

                    {isSessionBased && (
                      <div className="mt-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                            <p className="text-xs text-neutral-500">
                              Total Sessions
                            </p>

                            <p className="mt-2 text-xl font-bold text-white">
                              {totalSessions}
                            </p>
                          </div>

                          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                            <p className="text-xs text-neutral-500">
                              Sessions Used
                            </p>

                            <p className="mt-2 text-xl font-bold text-white">
                              {usedSessions}
                            </p>
                          </div>

                          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                            <p className="text-xs text-neutral-500">
                              Sessions Remaining
                            </p>

                            <p
                              className={`mt-2 text-xl font-bold ${
                                hasNoSessionsRemaining
                                  ? "text-red-400"
                                  : "text-violet-300"
                              }`}
                            >
                              {remainingSessions}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="text-neutral-500">
                              Session Usage
                            </span>

                            <span className="font-medium text-neutral-300">
                              {usedSessions} / {totalSessions} used
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-black/40">
                            <div
                              className={`h-full rounded-full transition-all ${
                                hasNoSessionsRemaining
                                  ? "bg-red-400"
                                  : "bg-violet-400"
                              }`}
                              style={{
                                width: `${sessionUsagePercentage}%`,
                              }}
                            />
                          </div>
                        </div>

                        {hasNoSessionsRemaining && (
                          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                            <AlertCircle
                              size={18}
                              className="mt-0.5 shrink-0 text-red-400"
                            />

                            <div>
                              <p className="text-sm font-semibold text-red-400">
                                Session balance exhausted
                              </p>

                              <p className="mt-1 text-xs text-red-300/70">
                                The member cannot use another QR entry until the membership is renewed or another session package is purchased.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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


{openTransferModal &&
  selectedTransferSubscription && (
    <TransferMembershipModal
      open={openTransferModal}
      subscriptionId={
        selectedTransferSubscription.id
      }
      currentMemberId={member.id}
      currentMemberName={member.name}
      packageName={
        selectedTransferSubscription.package?.name
      }
      onClose={() => {
        setOpenTransferModal(false);
        setSelectedTransferSubscription(null);
      }}
      onSuccess={() => {
        setOpenTransferModal(false);
        setSelectedTransferSubscription(null);
        fetchMember();
      }}
    />
  )}

      </div>
    </div>
  );
}