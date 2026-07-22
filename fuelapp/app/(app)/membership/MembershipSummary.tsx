import React, { useMemo } from "react";

import {
  View,
  Text,
} from "react-native";

import tw from "twrnc";

import {
  CreditCard,
  Calendar,
  Wallet,
} from "lucide-react-native";

interface MembershipSummaryProps {
  subscriptions: any[];
}

export default function MembershipSummary({
  subscriptions,
}: MembershipSummaryProps) {
  const stats = useMemo(() => {
    const activeSubscriptions =
      subscriptions.filter(
        (sub) =>
          sub.status === "ACTIVE" ||
          sub.status === "FROZEN"
      );

    const uniqueBranches = [
      ...new Set(
        activeSubscriptions.map(
          (sub) => sub.branchName
        )
      ),
    ];

    let nextExpiry: Date | null =
      null;

    activeSubscriptions.forEach(
      (sub) => {
        const endDate = new Date(
          sub.endDate
        );

        if (
          !nextExpiry ||
          endDate < nextExpiry
        ) {
          nextExpiry = endDate;
        }
      }
    );

    const totalBalance =
      subscriptions.reduce(
        (acc, sub) =>
          acc +
          (sub.invoice
            ?.balanceAmount || 0),
        0
      );

    let daysRemaining = 0;

    if (nextExpiry) {
      daysRemaining = Math.ceil(
        ((nextExpiry as Date).getTime() -
          Date.now()) /
          (1000 *
            60 *
            60 *
            24)
      );
    }

    return {
      activeCount:
        activeSubscriptions.length,

      branches:
        uniqueBranches.length,

      totalBalance,

      daysRemaining,
    };
  }, [subscriptions]);

  const cards = [
    {
      title: "Active Plans",
      value: stats.activeCount,
      Icon: CreditCard,
      color: "#A3E635",
    },
    {
      title: "Next Renewal",
      value:
        stats.daysRemaining > 0
          ? `${stats.daysRemaining}d`
          : "-",
      Icon: Calendar,
      color: "#FB923C",
    },
    {
      title: "Outstanding",
      value: `₹${(
        stats.totalBalance / 100
      ).toLocaleString()}`,
      Icon: Wallet,
      color:
        stats.totalBalance > 0
          ? "#F87171"
          : "#4ADE80",
    },
  ];

  return (
    <View
      style={tw`flex-row flex-wrap justify-between`}
    >
      {cards.map(
        (
          {
            title,
            value,
            Icon,
            color,
          },
          index
        ) => (
          <View
            key={index}
            style={[
              tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-4`,
              {
                width: "48%",
              },
            ]}
          >
            <View
              style={tw`flex-row justify-between items-center mb-4`}
            >
              <Icon
                size={22}
                color={color}
              />
            </View>

            <Text
              style={tw`text-xs text-neutral-500 mb-1`}
            >
              {title}
            </Text>

            <Text
              style={[
                tw`text-2xl font-bold`,
                {
                  color,
                },
              ]}
            >
              {value}
            </Text>
          </View>
        )
      )}
    </View>
  );
}