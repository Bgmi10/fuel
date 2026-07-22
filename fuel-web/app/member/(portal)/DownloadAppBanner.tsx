

    "use client";

import {
  Apple,
  Play,
  X,
} from "lucide-react";

type DownloadAppBannerProps = {
  onClose: () => void;
};

export function DownloadAppBanner({
  onClose,
}: DownloadAppBannerProps) {
  const googlePlayUrl =
    process.env
      .NEXT_PUBLIC_GOOGLE_PLAY_STORE_URL;

  const appStoreUrl =
    process.env
      .NEXT_PUBLIC_APP_STORE_URL;

  return (
    <div
      className="
        fixed inset-x-0 top-0 z-[100]
        flex h-14 w-full items-center
        overflow-hidden
        border-b border-white/10
        bg-slate-950/75
        px-4
        shadow-lg shadow-black/20
        backdrop-blur-xl
        backdrop-saturate-150
      "
    >
      {/* Glass highlight */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />

      {/* Subtle lime glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-20 w-96 -translate-x-1/2 bg-lime-400/10 blur-3xl" />
      
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-center gap-2 sm:flex-row sm:gap-5">
            <p className="text-center lg:text-sm text-xs font-semibold text-white ">
            Download the Fuel Gym app for a faster and better experience.
            </p>

            <div className="flex shrink-0 items-center gap-2">
            <a
                href={googlePlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition bg-slate-800"
            >
                <img src="https://cdn-icons-png.flaticon.com/128/732/732208.png" alt=""  className="w-5 h-5"/>
                Google Play
            </a>

            <a
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition bg-slate-800"
            >
                <img src="https://cdn-icons-png.flaticon.com/128/16566/16566128.png" alt="" className="h-5 w-5" />
                App Store
            </a>
            </div>
        </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close app download banner"
        className="
          absolute right-3 top-1/2 z-20
          -translate-y-1/2
          rounded-full border border-white/10
          bg-black/30 p-2
          text-slate-300
          transition
          hover:bg-black/60
          hover:text-white
        "
      >
        <X size={17} />
      </button>
    </div>
  );
}