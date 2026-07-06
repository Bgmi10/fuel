"use client";

import { Member, Referral } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Gift,
  Users,
} from "lucide-react";


type ReferredMember =  Referral & {
  referredMember: Member;
}
  
type MemberType = Member & {
  referrals: ReferredMember[]
};

export default function Page() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberType | null>(null);

  const fetchMember = async () => {
    try {
      const res = await fetch(`/api/members/${id}`);
      const data = await res.json();

      setMember(data.member);
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

  const referrals = member.referrals || [];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push(`/dashboard/members/${id}`)}
            className="w-10 h-10 rounded-xl border border-neutral-800 flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold">Referral History</h1>
            <p className="text-sm text-neutral-500">{member.name}</p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
            <Users className="text-lime-400 mb-3" />
            <p className="text-neutral-500 text-sm">Total Referrals</p>
            <h3 className="text-3xl font-bold mt-1">
              {referrals.length}
            </h3>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
            <Gift className="text-violet-400 mb-3" />
            <p className="text-neutral-500 text-sm">Rewards Issued</p>
            <h3 className="text-3xl font-bold mt-1">
              {referrals.filter((r) => r.rewardIssued).length}
            </h3>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
            <Gift className="text-violet-400 mb-3" />
            <p className="text-neutral-500 text-sm">Rewards Claimed</p>
            <h3 className="text-3xl font-bold mt-1">
              {referrals.filter((r) => r.rewardClaimed).length}
            </h3>
          </div>
        </div>

        {/* REFERRALS */}
        <div className="space-y-5">

          {referrals.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-neutral-400">
              No referrals yet
            </div>
          ) : (
            referrals.map((referral) => {
              const rewardText =
                referral.rewardType === "FIXED_AMOUNT"
                  ? `₹${(
                      (referral?.rewardAmount ?? 0)/ 100
                    ).toLocaleString()} Reward`
                  : referral.rewardType === "PERCENTAGE_DISCOUNT"
                  ? `${referral.rewardPercentage}% Discount`
                  : `${referral.rewardMembershipDays} Membership Days Extension`;

              return (
                <div
                  key={referral.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"
                >
                  <div className="flex justify-between items-start flex-wrap gap-4">

                    <div>
                      <div className="flex items-center gap-3">
                        <Gift size={18} className="text-lime-400" />

                        <h3 className="font-semibold text-lg">
                          {rewardText}
                        </h3>

                        <span className="px-3 py-1 rounded-full text-xs bg-lime-400/10 text-lime-400">
                          {referral.status}
                        </span>
                      </div>

                      <p className="text-sm text-neutral-400 mt-2">
                        Referred Member
                      </p>

                      <div className="font-mono text-sm mt-1 flex flex-col gap-2">
                        <span>
                        {referral.referredMember.name}</span>
                       
                        <span>  +91{referral.referredMember.phone} </span>

                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                     {!referral.rewardClaimed && <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          referral.rewardIssued
                            ? "bg-lime-400/10 text-lime-400"
                            : "bg-yellow-400/10 text-yellow-400"
                        }`}
                      >
                        {referral.rewardIssued
                          ? "Reward Issued"
                          : "Pending"}  
                      </span>}

                      {referral.rewardClaimed && (
                        <span className="px-3 py-1 rounded-full text-xs bg-cyan-400/10 text-cyan-400">
                          Claimed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}