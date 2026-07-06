"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Gift,
  Copy,
  Share2,
  Users,
  IndianRupee,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { useAuth } from "@/app/contexts/MemberAuthContext";

export default function ReferralPage() {

   const { user: member, loading } = useAuth();
   
   const [claimData, setClaimData] =
   useState<any>(null);
   const [openClaim, setOpenClaim] =
   useState(false);
 

   // this page is reposible for rewards that are membership then when click of claim we should fetch the /api/memeber/referral and tehn if the reward was in discount and amount show it without claim button since this can be claimed at the new purchase and hten if it was the membership type then we should show the claim button when fetch hte api and hten on click of submit hit the ./api/referral/claim 
 const [
   selectedReward,
   setSelectedReward,
 ] = useState<any>(null);
 
 const [
   selectedSubscription,
   setSelectedSubscription,
 ] = useState("");
 const [referralLink, setReferralLink] = useState("");

useEffect(() => {
  if (member?.referralCode) {
    setReferralLink(
      `${window.location.origin}?ref=${member.referralCode}`
    );
  }
}, [member]);


    const totalRewards =
    useMemo(() => {
      return (
        member?.referrals?.filter(
          (r: any) =>
            r.rewardType ===
            "FIXED_AMOUNT"
        ).reduce(
          (
            total: number,
            referral: any
          ) =>
            total +
            (referral.rewardAmount ||
              0),
          0
        ) || 0
      );
    }, [member]);

    const pendingRewards =
  useMemo(() => {
    return (
      member?.referrals?.filter(
        (r: any) =>
          r.rewardIssued &&
          !r.rewardClaimed
      ).length || 0
    );
  }, [member]);


    const fetchClaimData = async () => {
      try {
        const res = await fetch(
          "/api/member/referral"
        );
    
        if (!res.ok) {
          throw new Error("Failed to fetch rewards");
        }
    
        const data = await res.json();
    
        setClaimData(data);
      } catch (error) {
        console.error(error);
      }
    };

useEffect(() => {
  fetchClaimData();
}, []);

  const copyLink =
    async () => {
      await navigator.clipboard.writeText(
        referralLink
      );

      alert(
        "Referral link copied"
      );
    };

    const shareLink = async () => {
        try {
          const shareData = {
            title: "Join Fuel Gym",
            text: "Use my referral link",
            url: referralLink,
          };
      
          if (
            navigator.share &&
            (!navigator.canShare || navigator.canShare(shareData))
          ) {
            await navigator.share(shareData);
            return;
          }
        } catch (error) {
          console.log(error);
        }
      
        copyLink();
      };


      const claimReward = async () => {
        if (!selectedReward) {
          return;
        }
      
        if (!selectedSubscription) {
          alert("Please select a subscription");
          return;
        }
      
        try {
          const res = await fetch(
            "/api/member/referral/claim",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                referralId:
                  selectedReward.id,
                subscriptionId:
                  selectedSubscription,
              }),
            }
          );
      
          const data = await res.json();
      
          if (!res.ok) {
            alert(data.message);
            return;
          }
      
          alert(data.message);
      
          setOpenClaim(false);
          setSelectedReward(null);
          setSelectedSubscription("");
      
          fetchClaimData();
        } catch (error) {
          console.error(error);
      
          alert("Failed to claim reward");
        }
      };

  if (loading) {
    return (
      <div className="p-6">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HERO */}

      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">

        <div className="flex items-center gap-3 mb-4">
          <Gift
            className="text-lime-400"
          />

          <h1 className="text-2xl font-bold text-white">
            Referral Program
          </h1>
        </div>

        <p className="text-gray-400 mb-5">
          Invite your friends and earn rewards
          when they become members.
        </p>

        <div className="bg-black/20 rounded-2xl p-4 break-all text-lime-400">
          {referralLink}
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={
              copyLink
            }
            className="px-5 py-3 rounded-2xl bg-white/10 text-white flex items-center gap-2"
          >
            <Copy size={18} />
            Copy Link
          </button>

          <button
            onClick={
              shareLink
            }
            className="px-5 py-3 rounded-2xl bg-lime-400 text-black font-semibold flex items-center gap-2"
          >
            <Share2 size={18} />
            Share Referral Link
          </button>
        </div>

      </div>

      {/* STATS */}

      <div className="grid md:grid-cols-3 gap-4">

        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5">
          <Users className="text-blue-400" />

          <h3 className="text-3xl font-bold mt-3 text-white">
            {
              member?.referrals
                ?.length || 0
            }
          </h3>

          <p className="text-gray-400">
            Total Referrals
          </p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5">
          <IndianRupee className="text-green-400" />

          <h3 className="text-3xl font-bold mt-3 text-white">
            ₹
            {(
              totalRewards /
              100
            ).toLocaleString()}
          </h3>

          <p className="text-gray-400">
            Total Rewards
          </p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5">
          <Clock3 className="text-yellow-400" />

          <h3 className="text-3xl font-bold mt-3 text-white">
          {pendingRewards}
          </h3>

          <p className="text-gray-400">
            Pending Rewards
          </p>
        </div>

      </div>


      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">

<h2 className="text-xl font-bold text-white mb-5">
  Available Rewards
</h2>

<div className="space-y-3">

  {claimData?.rewards?.length ===
  0 ? (
    <p className="text-gray-400">
      No rewards available
    </p>
  ) : (
    claimData?.rewards?.map(
      (reward: any) => (
        <div
          key={reward.id}
          className="bg-black/20 rounded-2xl p-4 flex justify-between items-center"
        >
          <div>

            {reward.rewardType ===
              "FIXED_AMOUNT" && (
              <>
                <p className="text-white font-semibold">
                  ₹
                  {reward.rewardAmount / 100}
                </p>

                <p className="text-sm text-gray-400">
                  Discount Reward
                </p>
              </>
            )}

            {reward.rewardType ===
              "PERCENTAGE_DISCOUNT" && (
              <>
                <p className="text-white font-semibold">
                  {
                    reward.rewardPercentage
                  }
                  %
                </p>

                <p className="text-sm text-gray-400">
                  Discount Reward
                </p>
              </>
            )}

            {reward.rewardType ===
              "MEMBERSHIP_DAYS" && (
              <>
                <p className="text-white font-semibold">
                  {
                    reward.rewardMembershipDays
                  }{" "}
                  Days
                </p>

                <p className="text-sm text-gray-400">
                  Membership Extension
                </p>
              </>
            )}

          </div>

          {reward.rewardType ===
            "MEMBERSHIP_DAYS" && (
            <button
              onClick={() => {
                setSelectedReward(
                  reward
                );

                setOpenClaim(
                  true
                );
              }}
              className="px-4 py-2 bg-lime-400 text-black rounded-xl font-medium"
            >
              Claim Reward
            </button>
          )}

        </div>
      )
    )
  )}

</div>

</div>
      {/* REFERRAL HISTORY */}

      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">

        <h2 className="text-xl font-bold text-white mb-5">
          Referral History
        </h2>

        <div className="space-y-3">

          {(member?.referrals.length === 0) ? <>
           <span className="text-center text-gray-400">No referrels found</span>
          </> : member?.referrals?.map(
            (
              referral: any
            ) => (
              <div
                key={
                  referral.id
                }
                className="bg-black/20 rounded-2xl p-4 flex justify-between items-center flex-wrap gap-4"
              >
                <div>
                  <h3 className="font-semibold text-white">
                    {
                      referral
                        .referredMember
                        ?.name ||
                      "Pending Signup"
                    }
                  </h3>

                  <p className="text-sm text-gray-400">
                    {new Date(
                      referral.createdAt
                    ).toLocaleDateString(
                      "en-IN"
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4">

                  <div>
                    <p className="text-sm text-gray-400">
                      Reward
                    </p>

                    <p className="text-white font-semibold">

  {referral.rewardType ===
    "FIXED_AMOUNT" &&
    `₹${referral.rewardAmount / 100}`}

  {referral.rewardType ===
    "PERCENTAGE_DISCOUNT" &&
    `${referral.rewardPercentage}%`}

  {referral.rewardType ===
    "MEMBERSHIP_DAYS" &&
    `${referral.rewardMembershipDays} Days`}

</p>
                  </div>

                  <div
                    className={`px-3 py-2 rounded-full text-xs font-medium ${
                      referral.rewardClaimed
  ? "bg-green-500/10 text-green-400"
  : referral.rewardIssued
  ? "bg-yellow-500/10 text-yellow-400"
  : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {referral.rewardClaimed  ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        Claimed
                      </span>
                    ) : (
                      referral.status
                    )}
                  </div>

                </div>
              </div>
            )
          )}

        </div>

      </div>


      {openClaim && (
  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

    <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6">

      <h3 className="text-xl font-bold text-white mb-2">
        Claim Reward
      </h3>

      <p className="text-gray-400 text-sm mb-5">
        Select a subscription to extend.
      </p>

      <select
        value={selectedSubscription}
        onChange={(e) =>
          setSelectedSubscription(
            e.target.value
          )
        }
        className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white"
      >
        <option value="">
          Select Subscription
        </option>

        {claimData?.subscriptions?.map(
          (subscription: any) => (
            <option
              key={subscription.id}
              value={subscription.id}
            >
              {subscription.serviceName}
              {" - "}
              {subscription.packageName}
            </option>
          )
        )}
      </select>

      <div className="flex gap-3 mt-6">

        <button
          onClick={() =>
            setOpenClaim(false)
          }
          className="flex-1 py-3 rounded-2xl bg-white/10 text-white"
        >
          Cancel
        </button>

        <button
          onClick={claimReward}
          className="flex-1 py-3 rounded-2xl bg-lime-400 text-black font-semibold"
        >
          Claim
        </button>

      </div>

    </div>

  </div>
)}
    </div>
  );
}