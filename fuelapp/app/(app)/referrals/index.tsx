import React, {
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Share,
    Alert,
    Modal,
    RefreshControl,
  } from "react-native";
  
  import * as Clipboard from "expo-clipboard";
  
  import tw from "twrnc";
  
  import {
    Gift,
    Copy,
    Share2,
    Users,
    IndianRupee,
    CheckCircle2,
    Clock3,
  } from "lucide-react-native";
import { useAuth } from "../../../src/contexts/AuthContext";
import { request } from "../../../src/api/client";
  

  export default function ReferralScreen() {

  const { user: member, loading, refreshSession } =
  useAuth();

const [claimData, setClaimData] =
  useState<any>(null);

const [openClaim, setOpenClaim] =
  useState(false);

const [
  selectedReward,
  setSelectedReward,
] = useState<any>(null);

const [
  selectedSubscription,
  setSelectedSubscription,
] = useState("");

const [
  referralLink,
  setReferralLink,
] = useState("");

const [refreshing, setRefreshing] = useState(false);    



useEffect(() => {
    if (member?.referralCode) {
      setReferralLink(
        `https://fuel.moviespot.space?ref=${member.referralCode}`
      );
    }
  }, [member]);



  const totalRewards = useMemo(() => {
    return (
      member?.referrals
        ?.filter(
          (r: any) =>
            r.rewardType ===
            "FIXED_AMOUNT"
        )
        .reduce(
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



  const fetchClaimData =
  async () => {
    try {
      const res =
      await request({
        url: '/member/referral'
      })

      setClaimData(res);
    } catch (err) {
      console.log(err);
    }
  };

useEffect(() => {
  fetchClaimData();
}, []);


const copyLink =
  async () => {
    await Clipboard.setStringAsync(
      referralLink
    );

    Alert.alert(
      "Copied",
      "Referral link copied."
    );
  };


  const shareLink =
  async () => {
    try {
      await Share.share({
        title:
          "Join Fuel Gym",
        message:
          `Join Fuel Gym using my referral link:\n\n${referralLink}`,
      });
    } catch (err) {
      console.log(err);

      copyLink();
    }
  };


  const claimReward =
  async () => {
    if (!selectedReward)
      return;

    if (!selectedSubscription) {
      Alert.alert(
        "Select Subscription",
        "Please select a subscription."
      );

      return;
    }

    try {

        const res = await request({
            data: {
                referralId:
                selectedReward.id,
              subscriptionId:
                selectedSubscription,
            },
            method: "POST",
            url: "/member/referral/claim"
        })
      

      Alert.alert(
        "Success",
        res.message
      );

      setOpenClaim(false);
      setSelectedReward(null);
      setSelectedSubscription("");

      fetchClaimData();
      refreshSession();
    } catch (err) {
      console.log(err);

      Alert.alert(
        "Error",
        "Failed to claim reward."
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
  
    try {
      await Promise.all([
        fetchClaimData(),
        refreshSession(),
      ]);
    } catch (err) {
      console.log(err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View
        style={tw`flex-1 justify-center items-center`}
      >
        <ActivityIndicator
          size="large"
          color="#A3E635"
        />
      </View>
    );
  }


  return (
    <>
      <ScrollView
        style={tw`flex-1 bg-black`}
        contentContainerStyle={tw`p-5 pb-10`}
        showsVerticalScrollIndicator={false}
        refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#A3E635"
              colors={["#A3E635"]} // Android
              progressBackgroundColor="#171717"
            />
          }
      >
        {/* HERO */}
  
        <View
          style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-6`}
        >
          <View
            style={tw`flex-row items-center mb-4`}
          >
            <Gift
              size={24}
              color="#A3E635"
            />
  
            <Text
              style={tw`text-white text-2xl font-bold ml-3`}
            >
              Referral Program
            </Text>
          </View>
  
          <Text
            style={tw`text-neutral-400 mb-5 leading-6`}
          >
            Invite your friends and earn rewards
            when they become members.
          </Text>
  
          {/* Referral Link */}
  
          <View
            style={tw`bg-black rounded-2xl p-4 border border-neutral-800`}
          >
            <Text
              selectable
              style={tw`text-lime-400`}
            >
              {referralLink}
            </Text>
          </View>
  
          {/* Buttons */}
  
          <View
            style={tw`mt-5`}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={copyLink}
              style={tw`bg-neutral-800 rounded-2xl py-4 flex-row items-center justify-center mb-3`}
            >
              <Copy
                size={18}
                color="#fff"
              />
  
              <Text
                style={tw`text-white font-semibold ml-2`}
              >
                Copy Link
              </Text>
            </TouchableOpacity>
  
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={shareLink}
              style={tw`bg-lime-400 rounded-2xl py-4 flex-row items-center justify-center`}
            >
              <Share2
                size={18}
                color="#000"
              />
  
              <Text
                style={tw`text-black font-bold ml-2`}
              >
                Share Referral Link
              </Text>
            </TouchableOpacity>
          </View>
        </View>
  
        {/* STATS */}
  
        <View style={tw`mt-6`}>
          <View
            style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-4`}
          >
            <Users
              size={24}
              color="#60A5FA"
            />
  
            <Text
              style={tw`text-white text-3xl font-bold mt-3`}
            >
              {member?.referrals?.length || 0}
            </Text>
  
            <Text
              style={tw`text-neutral-400 mt-1`}
            >
              Total Referrals
            </Text>
          </View>
  
          <View
            style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-4`}
          >
            <IndianRupee
              size={24}
              color="#4ADE80"
            />
  
            <Text
              style={tw`text-white text-3xl font-bold mt-3`}
            >
              ₹
              {(
                totalRewards / 100
              ).toLocaleString()}
            </Text>
  
            <Text
              style={tw`text-neutral-400 mt-1`}
            >
              Total Rewards
            </Text>
          </View>
  
          <View
            style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5`}
          >
            <Clock3
              size={24}
              color="#FACC15"
            />
  
            <Text
              style={tw`text-white text-3xl font-bold mt-3`}
            >
              {pendingRewards}
            </Text>
  
            <Text
              style={tw`text-neutral-400 mt-1`}
            >
              Pending Rewards
            </Text>
          </View>
        </View>


              {/* AVAILABLE REWARDS */}

      <View
        style={tw`mt-6 bg-neutral-900 border border-neutral-800 rounded-3xl p-6`}
      >
        <Text
          style={tw`text-white text-xl font-bold mb-5`}
        >
          Available Rewards
        </Text>

        {!claimData?.rewards ||
        claimData.rewards.length === 0 ? (
          <Text
            style={tw`text-neutral-400`}
          >
            No rewards available
          </Text>
        ) : (
          claimData.rewards.map(
            (reward: any) => (
              <View
                key={reward.id}
                style={tw`bg-black rounded-2xl p-4 mb-3 border border-neutral-800`}
              >
                <View
                  style={tw`flex-row items-center justify-between`}
                >
                  <View
                    style={tw`flex-1`}
                  >
                    {reward.rewardType ===
                      "FIXED_AMOUNT" && (
                      <>
                        <Text
                          style={tw`text-white text-lg font-bold`}
                        >
                          ₹
                          {reward.rewardAmount /
                            100}
                        </Text>

                        <Text
                          style={tw`text-neutral-400 mt-1`}
                        >
                          Discount Reward
                        </Text>
                      </>
                    )}

                    {reward.rewardType ===
                      "PERCENTAGE_DISCOUNT" && (
                      <>
                        <Text
                          style={tw`text-white text-lg font-bold`}
                        >
                          {
                            reward.rewardPercentage
                          }
                          %
                        </Text>

                        <Text
                          style={tw`text-neutral-400 mt-1`}
                        >
                          Discount Reward
                        </Text>
                      </>
                    )}

                    {reward.rewardType ===
                      "MEMBERSHIP_DAYS" && (
                      <>
                        <Text
                          style={tw`text-white text-lg font-bold`}
                        >
                          {
                            reward.rewardMembershipDays
                          }{" "}
                          Days
                        </Text>

                        <Text
                          style={tw`text-neutral-400 mt-1`}
                        >
                          Membership Extension
                        </Text>
                      </>
                    )}
                  </View>

                  {reward.rewardType ===
                    "MEMBERSHIP_DAYS" && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedReward(
                          reward
                        );
                        setOpenClaim(
                          true
                        );
                      }}
                      style={tw`bg-lime-400 rounded-xl px-5 py-3`}
                    >
                      <Text
                        style={tw`text-black font-bold`}
                      >
                        Claim
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          )
        )}
      </View>

            {/* REFERRAL HISTORY */}

            <View
        style={tw`mt-6 bg-neutral-900 border border-neutral-800 rounded-3xl p-6`}
      >
        <Text
          style={tw`text-white text-xl font-bold mb-5`}
        >
          Referral History
        </Text>

        {!member?.referrals ||
        member.referrals.length === 0 ? (
          <Text
            style={tw`text-center text-neutral-400 py-6`}
          >
            No referrals found
          </Text>
        ) : (
          member.referrals.map(
            (referral: any) => (
              <View
                key={referral.id}
                style={tw`bg-black border border-neutral-800 rounded-2xl p-4 mb-3`}
              >
                {/* Header */}

                <View
                  style={tw`flex-row justify-between items-center`}
                >
                  <View style={tw`flex-1`}>
                    <Text
                      style={tw`text-white font-bold text-base`}
                    >
                      {referral
                        .referredMember
                        ?.name ||
                        "Pending Signup"}
                    </Text>

                    <Text
                      style={tw`text-neutral-500 text-sm mt-1`}
                    >
                      {new Date(
                        referral.createdAt
                      ).toLocaleDateString(
                        "en-IN"
                      )}
                    </Text>
                  </View>

                  <View
                    style={tw`items-end`}
                  >
                    <Text
                      style={tw`text-neutral-400 text-xs`}
                    >
                      Reward
                    </Text>

                    <Text
                      style={tw`text-white font-bold mt-1`}
                    >
                      {referral.rewardType ===
                        "FIXED_AMOUNT" &&
                        `₹${
                          referral.rewardAmount /
                          100
                        }`}

                      {referral.rewardType ===
                        "PERCENTAGE_DISCOUNT" &&
                        `${referral.rewardPercentage}%`}

                      {referral.rewardType ===
                        "MEMBERSHIP_DAYS" &&
                        `${referral.rewardMembershipDays} Days`}
                    </Text>
                  </View>
                </View>

                {/* Status */}

                <View
                  style={tw`mt-4 self-start`}
                >
                  <View
                    style={[
                      tw`px-4 py-2 rounded-full flex-row items-center`,
                      referral.rewardClaimed
                        ? {
                            backgroundColor:
                              "rgba(74,222,128,0.12)",
                          }
                        : referral.rewardIssued
                        ? {
                            backgroundColor:
                              "rgba(250,204,21,0.12)",
                          }
                        : {
                            backgroundColor:
                              "rgba(96,165,250,0.12)",
                          },
                    ]}
                  >
                    {referral.rewardClaimed && (
                      <CheckCircle2
                        size={14}
                        color="#4ADE80"
                      />
                    )}

                    <Text
                      style={[
                        tw`ml-2 text-xs font-semibold`,
                        referral.rewardClaimed
                          ? {
                              color:
                                "#4ADE80",
                            }
                          : referral.rewardIssued
                          ? {
                              color:
                                "#FACC15",
                            }
                          : {
                              color:
                                "#60A5FA",
                            },
                      ]}
                    >
                      {referral.rewardClaimed
                        ? "Claimed"
                        : referral.status}
                    </Text>
                  </View>
                </View>
              </View>
            )
          )
        )}
      </View>


      </ScrollView>

{/* CLAIM REWARD MODAL */}

<Modal
  visible={openClaim}
  transparent
  animationType="fade"
  onRequestClose={() =>
    setOpenClaim(false)
  }
>
  <View
    style={tw`flex-1 bg-black/70 justify-center px-5`}
  >
    <View
      style={tw`bg-neutral-900 rounded-3xl border border-neutral-800 p-6`}
    >
      <Text
        style={tw`text-white text-xl font-bold mb-2`}
      >
        Claim Reward
      </Text>

      <Text
        style={tw`text-neutral-400 mb-6`}
      >
        Select a subscription to apply
        your reward.
      </Text>

      <Text
        style={tw`text-neutral-300 mb-3`}
      >
        Subscription
      </Text>

      <View
        style={tw`bg-neutral-800 rounded-2xl overflow-hidden`}
      >
        {claimData?.subscriptions?.map(
          (subscription: any) => {
            const selected =
              selectedSubscription ===
              subscription.id;

            return (
              <TouchableOpacity
                key={subscription.id}
                activeOpacity={0.8}
                onPress={() =>
                  setSelectedSubscription(
                    subscription.id
                  )
                }
                style={[
                  tw`px-4 py-4 border-b border-neutral-700`,
                  selected && {
                    backgroundColor:
                      "rgba(163,230,53,0.12)",
                  },
                ]}
              >
                <View
                  style={tw`flex-row justify-between items-center`}
                >
                  <View style={tw`flex-1`}>
                  <Text
  style={[
    tw`font-semibold`,
    {
      color: selected ? "#A3E635" : "#FFFFFF",
    },
  ]}
>
  {[subscription.serviceName, subscription.packageName]
    .filter(Boolean)
    .join(" • ")}
</Text>
                  </View>

                  {selected && (
                    <CheckCircle2
                      size={20}
                      color="#A3E635"
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          }
        )}
      </View>

      {/* Buttons */}

      <View
        style={tw`flex-row justify-end mt-8`}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            setOpenClaim(false)
          }
          style={tw`bg-neutral-700 rounded-xl px-6 py-4 mr-3`}
        >
          <Text
            style={tw`text-white font-semibold`}
          >
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={claimReward}
          style={tw`bg-lime-400 rounded-xl px-7 py-4`}
        >
          <Text
            style={tw`text-black font-bold`}
          >
            Claim Reward
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
</>
);
}