import React, { useState } from "react";

import {
  ScrollView,
  View,
  RefreshControl,
} from "react-native";

import tw from "twrnc";

import MembershipSummary from "./MembershipSummary";
import OutstandingBalanceAlert from "./OutstandingBalanceAlert";
import MembershipCard from "./MembershipCard";

import { useAuth } from "../../../src/contexts/AuthContext";

export default function Membership() {
  const {
    user: member,
    refreshSession,
  } = useAuth();

  const [refreshing, setRefreshing] =
    useState(false);

  const subscriptions =
    member?.subscriptions || [];

  const onRefresh = async () => {
    try {
      setRefreshing(true);

      await refreshSession();
    } catch (err) {
      console.log(err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={tw`flex-1 bg-black`}
      contentContainerStyle={tw`p-5 pb-10`}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#A3E635"
          colors={["#A3E635"]}
          progressBackgroundColor="#171717"
        />
      }
    >
      <View style={tw`space-y-4`}>
        <MembershipSummary
          subscriptions={subscriptions}
        />

        <OutstandingBalanceAlert
          subscriptions={subscriptions}
        />

        {subscriptions.map(
          (subscription: any) => (
            <View
              key={subscription.id}
              style={tw`mb-4`}
            >
              <MembershipCard
                subscription={subscription}
              />
            </View>
          )
        )}
      </View>
    </ScrollView>
  );
}