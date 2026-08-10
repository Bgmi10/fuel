"use client";

import {
  Apple,
  Download,
  Play,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { memberNavItems } from "./member-nav";

type MemberSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

type DownloadAppCardProps = {
  compact?: boolean;
};

function DownloadAppCard({
  compact = false,
}: DownloadAppCardProps) {
  const googlePlayUrl =
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_STORE_URL;

  const appStoreUrl =
    process.env.NEXT_PUBLIC_APP_STORE_URL;

  if (!googlePlayUrl && !appStoreUrl) {
    return null;
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        border border-lime-400/20
        bg-gradient-to-br
        from-lime-400/10 via-slate-900 to-slate-950
        ${compact ? "p-3" : "p-4"}
      `}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-lime-400/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center gap-3">
          <div
            className={`
              flex shrink-0 items-center justify-center
              rounded-xl bg-lime-400 text-black
              ${compact ? "h-9 w-9" : "h-10 w-10"}
            `}
          >
            <Download
              size={compact ? 16 : 18}
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              Get the Fuel Gym app
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Faster access on mobile
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {googlePlayUrl && (
            <a
              href={googlePlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center justify-center
                gap-1.5 rounded-xl
                border border-white/10
                bg-white/5 px-2 py-2.5
                text-[11px] font-semibold text-white
                transition
                hover:border-lime-400/30
                hover:bg-white/10
                active:scale-[0.98]
              "
            >
                <img src="https://cdn-icons-png.flaticon.com/128/732/732208.png" alt=""  className="w-5 h-5"/>
              

              <span className="whitespace-nowrap">
                Google Play
              </span>
            </a>
          )}

          {appStoreUrl && (
            <a
              href={appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center justify-center
                gap-1.5 rounded-xl
                border border-white/10
                bg-white/5 px-2 py-2.5
                text-[11px] font-semibold text-white
                transition
                hover:border-lime-400/30
                hover:bg-white/10
                active:scale-[0.98]
              "
            >
                <img src="https://cdn-icons-png.flaticon.com/128/16566/16566128.png" alt="" className="h-5 w-5" />


              <span className="whitespace-nowrap">
                App Store
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function MemberSidebar({
  mobileOpen,
  onMobileClose,
}: MemberSidebarProps) {
  const pathname = usePathname();

  const renderNavigation = (
    closeAfterNavigation = false
  ) => (
    <div className="space-y-1">
      {memberNavItems.map((item) => {
        const Icon = item.icon;

        const isActive =
          pathname === item.href ||
          pathname.startsWith(
            `${item.href}/`
          );

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={
              closeAfterNavigation
                ? onMobileClose
                : undefined
            }
            className={`
              flex items-center gap-3
              rounded-2xl px-4 py-3
              transition-all duration-200
              ${
                isActive
                  ? "bg-lime-400 font-semibold text-black"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }
            `}
          >
            <Icon
              size={20}
              className={
                isActive
                  ? "text-black"
                  : "text-slate-400"
              }
            />

            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="
          fixed bottom-0 left-0 top-0 z-40
          hidden w-[280px] flex-col
          overflow-hidden
          border-r border-slate-800
          bg-slate-950
          lg:flex
        "
      >
        {/* Glass background */}
        <div className="pointer-events-none absolute inset-0 border-r border-white/10 bg-white/[0.03] backdrop-blur-xl" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Logo */}
          <div className="shrink-0 px-6 pb-5 pt-6">
            <Link
              href="/member/dashboard"
              className="inline-flex items-center"
            >
              <img
                src="/logo.png"
                alt="Fuel Gym"
                className="w-20 object-contain"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {renderNavigation()}
          </nav>

          {/* Desktop App Card */}
          <div className="shrink-0 border-t border-white/5 p-4">
            <DownloadAppCard />
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      <button
        type="button"
        aria-label="Close navigation drawer"
        onClick={onMobileClose}
        className={`
          fixed inset-0 z-50 bg-black/70
          backdrop-blur-sm transition-opacity
          lg:hidden
          ${
            mobileOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }
        `}
      />

      {/* Mobile Drawer */}
      <aside
        aria-hidden={!mobileOpen}
        className={`
          fixed bottom-0 left-0 top-0 z-[60]
          flex w-[min(86vw,320px)] flex-col
          overflow-hidden
          border-r border-white/10
          bg-slate-950
          shadow-2xl shadow-black/60
          transition-transform duration-300
          lg:hidden
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        <div className="pointer-events-none absolute inset-0 bg-white/[0.03] backdrop-blur-xl" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Mobile Drawer Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-5">
            <Link
              href="/member/dashboard"
              onClick={onMobileClose}
              className="inline-flex items-center"
            >
              <img
                src="/logo.png"
                alt="Fuel Gym"
                className="w-20 object-contain"
              />
            </Link>

            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close navigation"
              className="
                flex h-10 w-10 items-center
                justify-center rounded-xl
                border border-white/10
                bg-white/5 text-slate-400
                transition
                hover:bg-white/10
                hover:text-white
              "
            >
              <X size={19} />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            {renderNavigation(true)}
          </nav>

          {/* Mobile App Card */}
          <div className="shrink-0 border-t border-white/10 p-4">
            <DownloadAppCard compact />
          </div>
        </div>
      </aside>
    </>
  );
}