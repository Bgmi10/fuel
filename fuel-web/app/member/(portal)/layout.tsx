"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { MemberSidebar } from "./MemberSidebar";
import { MemberHeader } from "./MemberHeader";
import { DownloadAppBanner } from "./DownloadAppBanner";

import { useAuth } from "@/app/contexts/MemberAuthContext";

const APP_BANNER_STORAGE_KEY =
  "fuel-app-download-banner-dismissed";

export default function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user: member,
    loading,
  } = useAuth();

  const router = useRouter();

  const [
    showDownloadBanner,
    setShowDownloadBanner,
  ] = useState(false);

  const [
    bannerPreferenceLoaded,
    setBannerPreferenceLoaded,
  ] = useState(false);

  useEffect(() => {
    if (!loading && !member) {
      router.replace("/member/login");
    }
  }, [loading, member, router]);

  useEffect(() => {
    const dismissed =
      localStorage.getItem(
        APP_BANNER_STORAGE_KEY
      );

    setShowDownloadBanner(
      dismissed !== "true"
    );

    setBannerPreferenceLoaded(true);
  }, []);

  const handleCloseBanner = () => {
    localStorage.setItem(
      APP_BANNER_STORAGE_KEY,
      "true"
    );

    setShowDownloadBanner(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-lime-400 border-t-transparent" />

          <p className="text-slate-300">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!member) {
    return null;
  }

  const bannerVisible =
    bannerPreferenceLoaded &&
    showDownloadBanner;

  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      style={
        {
          "--member-portal-offset":
            bannerVisible
              ? "3.5rem"
              : "0rem",
        } as React.CSSProperties
      }
    >
      {bannerVisible && (
        <DownloadAppBanner
          onClose={handleCloseBanner}
        />
      )}

      {/* Pushes the complete portal below the fixed banner */}
      <div
        className="
          min-h-screen
          pt-[var(--member-portal-offset)]
          transition-[padding-top]
          duration-300
        "
      >
        <MemberSidebar />

        <div className="lg:pl-[280px]">
          <MemberHeader member={member} />

          <main className="relative p-4 lg:p-8">
            <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-lime-400/5 via-transparent to-green-400/5" />

            <div className="relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}