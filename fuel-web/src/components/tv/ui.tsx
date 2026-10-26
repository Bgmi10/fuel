"use client";

import { Loader2, X } from "lucide-react";

export const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-lime-400";

export function Banner({
  tone,
  onClose,
  children,
}: {
  tone: "error" | "success";
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mb-4 flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-red-500/20 bg-red-500/10 text-red-400"
          : "border-lime-400/20 bg-lime-400/10 text-lime-400"
      }`}
    >
      <span>{children}</span>
      <button type="button" onClick={onClose} className="shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

export function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className="h-5 w-1 rounded-full bg-lime-400" />
        <h3 className="text-sm font-semibold">{title}</h3>
        {aside && <span className="ml-auto text-xs text-zinc-600">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({
  icon,
  title,
  description,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-col gap-5 border-b border-zinc-800 pb-7 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function SecondaryButton({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium disabled:opacity-50 ${
        danger
          ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
          : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  footer,
  wide,
  closeDisabled,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  wide?: boolean;
  closeDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div
        className={`my-6 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl ${
          wide ? "max-w-5xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-40"
          >
            <X size={19} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-950/60 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 px-6 py-12 text-center">
      <div className="text-zinc-700">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
