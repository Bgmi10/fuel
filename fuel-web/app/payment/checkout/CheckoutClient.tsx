"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [sdkReady, setSdkReady] = useState(false);
  const [opened, setOpened] = useState(false);

  const orderId = params.get("orderId") ?? "";
  const amount = Number(params.get("amount") ?? 0);

  const invoiceId = params.get("invoiceId") ?? "";

  const name = params.get("name") ?? "";
  const phone = params.get("phone") ?? "";
  const email = params.get("email") ?? "";

  const service = params.get("service") ?? "";
  const packageName = params.get("package") ?? "";

  useEffect(() => {
    if (!sdkReady) return;

    if (opened) return;

    if (!window.Razorpay) return;

    setOpened(true);

    const razorpay = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,

      amount,

      currency: "INR",

      order_id: orderId,

      name: "Fuel Gym",

      description: `${service} - ${packageName}`,

      prefill: {
        name,
        email,
        contact: phone,
      },

      theme: {
        color: "#A3E635",
      },

      handler: async (response: any) => {
        try {
          const res = await fetch(
            "/api/payment/verify",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                invoiceId,

                razorpay_payment_id:
                  response.razorpay_payment_id,

                razorpay_order_id:
                  response.razorpay_order_id,

                razorpay_signature:
                  response.razorpay_signature,
              }),
            }
          );

          const data = await res.json();

          if (data.success) {
            router.replace(
              "/payment/success"
            );
          } else {
            router.replace(
              "/payment/failed"
            );
          }
        } catch {
          router.replace(
            "/payment/failed"
          );
        }
      },

      modal: {
        ondismiss() {
          router.replace(
            "/payment/cancelled"
          );
        },
      },
    });

    razorpay.on(
      "payment.failed",
      function () {
        router.replace(
          "/payment/failed"
        );
      }
    );

    razorpay.open();
  }, [sdkReady]);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() =>
          setSdkReady(true)
        }
      />

      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-lime-400 border-t-transparent rounded-full animate-spin mx-auto mb-5" />

          <h2 className="text-xl font-bold text-white">
            Opening Razorpay...
          </h2>

          <p className="text-gray-400 mt-2">
            Please wait while we
            redirect you to the
            payment gateway.
          </p>
        </div>
      </div>
    </>
  );
}