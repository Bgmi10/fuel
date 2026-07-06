import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/Providers"; // 👈 import
import Script from "next/script";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-main",
});

export const metadata: Metadata = {
  title: "Fuel Gym",
  description: "Transform your body at Fuel Gym",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} h-full antialiased`}
    >
    <head>
    <link
  rel="stylesheet"
  href="https://api.fontshare.com/v2/css?f[]=boxing@400&f[]=clash-grotesk@400,500,600,700&display=swap"
/>
    </head>
      
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
      <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
    </html>
  );
}