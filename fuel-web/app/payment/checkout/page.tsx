import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

function CheckoutLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-lime-400" />

        <p className="mt-4 text-sm text-neutral-400">
          Loading payment details...
        </p>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutClient />
    </Suspense>
  );
}