import React from "react";

import {
  View,
  Text,
} from "react-native";

import tw from "twrnc";

import {
  AlertTriangle,
} from "lucide-react-native";

interface OutstandingBalanceAlertProps {
  subscriptions: any[];
  onPayNow?: () => void;
}

export default function OutstandingBalanceAlert({
  subscriptions,
  onPayNow,
}: OutstandingBalanceAlertProps) {
  const totalBalance =
    subscriptions.reduce(
      (total, sub) =>
        total +
        (sub.invoice?.balanceAmount || 0),
      0
    );

  if (totalBalance <= 0) {
    return null;
  }

  return (
    <View
      style={[
        tw`rounded-3xl p-5 border`,
        {
          backgroundColor:
            "rgba(234,179,8,0.10)",
          borderColor:
            "rgba(234,179,8,0.20)",
        },
      ]}
    >
      <View
        style={tw`flex-row`}
      >
        {/* Icon */}

        <View
          style={[
            tw`w-12 h-12 rounded-2xl items-center justify-center mr-4`,
            {
              backgroundColor:
                "rgba(234,179,8,0.10)",
            },
          ]}
        >
          <AlertTriangle
            size={24}
            color="#FACC15"
          />
        </View>

        {/* Content */}

        <View style={tw`flex-1`}>
          <Text
            style={tw`text-white font-semibold text-base`}
          >
            Outstanding Balance
          </Text>

          <Text
            style={tw`text-neutral-400 text-sm mt-1`}
          >
            You have pending payments
            across one or more
            memberships.
          </Text>

          <Text
            style={[
              tw`text-2xl font-bold mt-4`,
              {
                color: "#FACC15",
              },
            ]}
          >
            ₹
            {(
              totalBalance / 100
            ).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}