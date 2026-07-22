import { diffDaysUTC, nowUTC } from "./date";


export const formatDate = (date: any) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
};

export const generateReferralCode = (
  name: string
) => {
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 6);

  const random = Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase();

  return `${prefix}${random}`;
};


export function formatPaidAt(date?: Date | string): string {
    if (!date) return '-'
    const d = new Date(date);
  
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /**
 * GST calculation helpers for invoices.
 *
 * Total = Base + CGST (2.5%) + SGST (2.5%) = Base * 1.05
 * We reverse-calculate base & taxes from the inclusive total.
 */

export type GSTBreakdown = {
  baseFee: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  amount: number;
  cgstPercentage: number;
  sgstPercentage: number;
};

export type GSTBreakdownFormatted = {
  baseFee: string;
  cgst: string;
  sgst: string;
  totalTax: string;
  amount: string;
};

/**
 * Reverse-calculate GST breakdown from a total amount (inclusive of 5% GST).
 * Returns numeric values — useful for PDF generation, calculations, etc.
 *
 * @param totalAmount Total amount in rupees (e.g., 1000 for ₹1000)
 */


/**
 * Same as calculateGSTBreakdown but returns string values formatted to 2 decimals.
 * Useful for email template params (strings render predictably in templates).
 *
 * @param totalAmount Total amount in rupees
 */

/**
 * Convert paise (Razorpay format) to rupees.
 *
 * @param paise Amount in paise (e.g., 100000 for ₹1000)
 */
export const paiseToRupees = (paise: number): number => paise / 100;

/**
 * Map Razorpay payment method codes to user-friendly labels.
 */
export const formatPaymentMethod = (method: string): string => {
  const map: Record<string, string> = {
    card: "Card",
    netbanking: "Net Banking",
    upi: "UPI",
    wallet: "Wallet",
    emi: "EMI",
  };
  return map[method] || method;
};


export const isFrozen = (freezeStart?: Date | null, freezeEnd?: Date | null) => {
  if (!freezeStart || !freezeEnd) return false;

  const now = nowUTC();
  return now >= freezeStart && now < freezeEnd;
};

export const isExpired = (endDate: Date) => {
  return nowUTC() > endDate;
};

export const getFreezeDays = (start: Date, end: Date) => {
  return diffDaysUTC(start, end);
};

/**
 * Calculate BMI from weight (kg) and height (cm).
 * Formula: BMI = weight / (height * height)
 * 
 * @param weightKg Weight in kilograms
 * @param heightCm Height in centimeters
 * @returns BMI rounded to 1 decimal place
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightInMeters = heightCm / 100;
  return +(weightKg / (heightInMeters * heightInMeters)).toFixed(1);
}

/**
 * Calculate comparison between current and previous values.
 * 
 * @param current Current value
 * @param previous Previous value
 * @returns Object with change value and label
 */
export function calculateDifference(current: number, previous: number) {
  const change = +(current - previous).toFixed(1);
  
  return {
    value: change,
    label: change < 0 ? "decrease" : change > 0 ? "increase" : "no change",
    isPositive: change > 0,
    isNegative: change < 0,
  };
}
