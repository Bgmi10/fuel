"use client";

import { Invoice, Subscription } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
} from "lucide-react";



interface SubscriptionWithInvoice extends Subscription {
  invoice: Invoice | null;
}

interface OutstandingBalanceAlertProps {
  subscriptions: SubscriptionWithInvoice[];
  onPayNow?: () => void;
}
const OutstandingBalanceAlert = ({
  subscriptions,
  onPayNow,
}: OutstandingBalanceAlertProps) => {
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
    <div
      className="
        bg-yellow-500/10
        border
        border-yellow-500/20
        rounded-3xl
        p-5
      "
    >
      <div
        className="
          flex
          flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-4
        "
      >
        <div className="flex gap-4">
          <div
            className="
              h-12
              w-12
              rounded-2xl
              bg-yellow-500/10
              flex
              items-center
              justify-center
              shrink-0
            "
          >
            <AlertTriangle
              size={24}
              className="text-yellow-400"
            />
          </div>

          <div>
            <h3 className="text-white font-semibold">
              Outstanding Balance
            </h3>

            <p className="text-gray-400 text-sm mt-1">
              You have pending payments
              across one or more memberships.
            </p>

            <p className="text-yellow-400 font-bold text-xl mt-3">
              ₹
              {(
                totalBalance / 100
              ).toLocaleString()}
            </p>
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default OutstandingBalanceAlert;