// lib/membership-transfer-fee.ts

import { Prisma } from "@prisma/client";
import { prisma } from "@/prisma";

export type MembershipTransferFeeRule = {
  id: string;
  label: string;
  minDays: number;
  maxDays: number;
  fee: number;
  isActive: boolean;
};

export type MembershipTransferQuote = {
  remainingDays: number;

  slab: {
    id: string;
    label: string;
    minDays: number;
    maxDays: number;
  };

  baseTransferFee: number;

  cgstPercentage: number;
  sgstPercentage: number;

  cgstAmount: number;
  sgstAmount: number;

  transferFee: number;
};

type DatabaseClient =
  | typeof prisma
  | Prisma.TransactionClient;

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

const BUSINESS_TIMEZONE = "Asia/Kolkata";

function getCalendarDayNumber(
  date: Date,
  timeZone = BUSINESS_TIMEZONE
) {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(date);

  const year = Number(
    parts.find((part) => part.type === "year")
      ?.value
  );

  const month = Number(
    parts.find((part) => part.type === "month")
      ?.value
  );

  const day = Number(
    parts.find((part) => part.type === "day")
      ?.value
  );

  return Math.floor(
    Date.UTC(year, month - 1, day) /
      MILLISECONDS_PER_DAY
  );
}

export function calculateRemainingDays(
  endDate: Date,
  referenceDate = new Date()
) {
  const currentDay =
    getCalendarDayNumber(referenceDate);

  const membershipEndDay =
    getCalendarDayNumber(endDate);

  /*
   * Inclusive calculation:
   * If the membership ends today,
   * one membership day remains.
   */
  return Math.max(
    0,
    membershipEndDay - currentDay + 1
  );
}

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function parseTransferFeeRules(
  value: unknown
): MembershipTransferFeeRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rules: MembershipTransferFeeRule[] =
    [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const rule =
      item as Record<string, unknown>;

    const id = String(rule.id || "").trim();
    const label = String(
      rule.label || ""
    ).trim();

    const minDays = Number(rule.minDays);
    const maxDays = Number(rule.maxDays);
    const fee = Number(rule.fee);

    const isActive =
      typeof rule.isActive === "boolean"
        ? rule.isActive
        : true;

    if (
      !id ||
      !label ||
      !Number.isInteger(minDays) ||
      !Number.isInteger(maxDays) ||
      !Number.isFinite(fee)
    ) {
      continue;
    }

    rules.push({
      id,
      label,
      minDays,
      maxDays,
      fee,
      isActive,
    });
  }

  return rules;
}

export async function calculateMembershipTransferQuote(
  subscriptionId: string,
  database: DatabaseClient = prisma
): Promise<MembershipTransferQuote> {
  const subscription =
    await database.subscription.findUnique({
      where: {
        id: subscriptionId,
      },
      select: {
        id: true,
        endDate: true,
        status: true,
      },
    });

  if (!subscription) {
    throw new Error(
      "Membership subscription not found."
    );
  }

  if (
    subscription.status === "EXPIRED" ||
    subscription.status === "CANCELLED"
  ) {
    throw new Error(
      "This membership cannot be transferred because it is no longer active."
    );
  }

  const remainingDays =
    calculateRemainingDays(
      subscription.endDate
    );

  if (remainingDays <= 0) {
    throw new Error(
      "This membership has expired and cannot be transferred."
    );
  }

  const setting =
    await database.setting.findFirst({
      select: {
        cgstPercentage: true,
        sgstPercentage: true,
        membershipTransferFeeRules: true,
      },
    });

  if (!setting) {
    throw new Error(
      "Central settings are not configured."
    );
  }

  const rules = parseTransferFeeRules(
    setting.membershipTransferFeeRules
  );

  const activeRules = rules
    .filter((rule) => rule.isActive)
    .sort(
      (a, b) => b.minDays - a.minDays
    );

  if (activeRules.length === 0) {
    throw new Error(
      "No active membership transfer fee slabs are configured."
    );
  }

  const matchedRule = activeRules.find(
    (rule) =>
      remainingDays >= rule.minDays &&
      remainingDays <= rule.maxDays
  );

  if (!matchedRule) {
    throw new Error(
      `No transfer fee slab is configured for ${remainingDays} remaining days.`
    );
  }

  const cgstPercentage = Number(
    setting.cgstPercentage
  );

  const sgstPercentage = Number(
    setting.sgstPercentage
  );

  if (
    !Number.isFinite(cgstPercentage) ||
    !Number.isFinite(sgstPercentage) ||
    cgstPercentage < 0 ||
    sgstPercentage < 0
  ) {
    throw new Error(
      "The configured GST percentages are invalid."
    );
  }

  const baseTransferFee =
    matchedRule.fee;

  const cgstAmount = roundAmount(
    (baseTransferFee * cgstPercentage) /
      100
  );

  const sgstAmount = roundAmount(
    (baseTransferFee * sgstPercentage) /
      100
  );

  /*
   * transferFee is an Int in Prisma,
   * so the final value is rounded to
   * the nearest whole rupee.
   */
  const transferFee = Math.round(
    baseTransferFee +
      cgstAmount +
      sgstAmount
  );

  return {
    remainingDays,

    slab: {
      id: matchedRule.id,
      label: matchedRule.label,
      minDays: matchedRule.minDays,
      maxDays: matchedRule.maxDays,
    },

    baseTransferFee,

    cgstPercentage,
    sgstPercentage,

    cgstAmount,
    sgstAmount,

    transferFee,
  };
}