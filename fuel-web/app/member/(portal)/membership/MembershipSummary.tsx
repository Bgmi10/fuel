"use client";

import { Invoice, Subscription } from "@prisma/client";
import {
  CreditCard,
  Building2,
  Calendar,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
type SubscriptionType = Subscription & {
  invoice: Invoice
}
interface MembershipSummaryProps {
  subscriptions: SubscriptionType[];
}

const MembershipSummary = ({
  subscriptions,
}: MembershipSummaryProps) => {
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

    let nextExpiry: Date | null = null;

    activeSubscriptions.forEach((sub) => {
      const endDate = new Date(
        sub.endDate
      );

      if (
        !nextExpiry ||
        endDate < nextExpiry
      ) {
        nextExpiry = endDate;
      }
    });

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
          (1000 * 60 * 60 * 24)
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
      icon: CreditCard,
      color:
        "text-lime-400",
    },
    {
      title: "Next Renewal",
      value:
        stats.daysRemaining > 0
          ? `${stats.daysRemaining}d`
          : "-",
      icon: Calendar,
      color:
        "text-orange-400",
    },
    {
      title:
        "Outstanding",
      value: `₹${(
        stats.totalBalance /
        100
      ).toLocaleString()}`,
      icon: Wallet,
      color:
        stats.totalBalance > 0
          ? "text-red-400"
          : "text-green-400",
    },
  ];

  return (
    <div
      className="
        grid
        grid-cols-2
        lg:grid-cols-4
        gap-4
      "
    >
      {cards.map(
        (
          {
            title,
            value,
            icon: Icon,
            color,
          },
          index
        ) => (
          <div
            key={index}
            className="
              bg-white/[0.03]
              backdrop-blur
              rounded-3xl
              border
              border-white/10
              p-5
            "
          >
            <div className="flex items-center justify-between mb-4">
              <Icon
                size={22}
                className={
                  color
                }
              />
            </div>

            <p className="text-xs text-gray-500 mb-1">
              {title}
            </p>

            <h3
              className={`text-2xl font-bold ${color}`}
            >
              {value}
            </h3>
          </div>
        )
      )}
    </div>
  );
};

export default MembershipSummary;