"use client";

import { Loader2, Monitor, Plus, RefreshCw, Trash2, Tv } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api, errorMessage } from "@/src/lib/tv/client";
import {
  Banner,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  inputClass,
} from "@/src/components/tv/ui";

interface Branch {
  id: string;
  name: string;
}

interface TvDevice {
  id: string;
  name: string;
  branchId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  pairedAt: string;
  branch: { name: string };
}

const REFRESH_MS = 10_000;

function formatSeen(iso: string | null) {
  if (!iso) {
    return "Never connected";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function TvDevicesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [devices, setDevices] = useState<TvDevice[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [pairing, setPairing] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [pairError, setPairError] = useState("");
  const [pairBusy, setPairBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/branches", { cache: "no-store" });
        const payload = await response.json();
        const list: Branch[] = Array.isArray(payload) ? payload : payload.branches ?? [];

        setBranches(list);
        setBranchId((current) => current || list[0]?.id || "");
      } catch (loadError) {
        setError(errorMessage(loadError));
      }
    })();
  }, []);

  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const query = branchFilter ? `?branchId=${encodeURIComponent(branchFilter)}` : "";
        setDevices(await api<TvDevice[]>(`/api/tvs${query}`));
      } catch (loadError) {
        if (!silent) {
          setError(errorMessage(loadError));
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [branchFilter]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Online dots stay fresh without a manual refresh.
  useEffect(() => {
    const timer = setInterval(() => void load(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  function openPair() {
    setCode("");
    setName("");
    setPairError("");
    setPairing(true);
  }

  async function pair() {
    if (code.trim().length !== 6) {
      setPairError("Enter the 6 character code shown on the TV.");
      return;
    }

    if (!name.trim()) {
      setPairError("Give the TV a name, for example Main Floor.");
      return;
    }

    if (!branchId) {
      setPairError("Select a branch.");
      return;
    }

    try {
      setPairBusy(true);
      setPairError("");

      await api("/api/tvs/pair", {
        method: "POST",
        body: JSON.stringify({ pairingCode: code.trim(), name: name.trim(), branchId }),
      });

      setPairing(false);
      setSuccess(`${name.trim()} is paired. It will open its home screen in a moment.`);
      await load(true);
    } catch (pairErr) {
      setPairError(errorMessage(pairErr));
    } finally {
      setPairBusy(false);
    }
  }

  async function remove(device: TvDevice) {
    if (
      !window.confirm(
        `Remove "${device.name}"? The TV returns to its pairing screen and must be paired again.`
      )
    ) {
      return;
    }

    try {
      setRemovingId(device.id);
      setError("");
      setSuccess("");
      await api(`/api/tvs/${device.id}`, { method: "DELETE" });
      await load(true);
      setSuccess(`${device.name} was removed.`);
    } catch (removeError) {
      setError(errorMessage(removeError));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="min-h-full bg-zinc-950 p-6 text-white lg:p-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          icon={<Tv size={25} />}
          title="TV Devices"
          description="Pair gym TVs to a branch and see which are online."
          actions={
            <>
              <select
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <SecondaryButton onClick={() => void load()} disabled={loading}>
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </SecondaryButton>
              <PrimaryButton onClick={openPair}>
                <Plus size={17} />
                Pair New TV
              </PrimaryButton>
            </>
          }
        />

        {error && (
          <Banner tone="error" onClose={() => setError("")}>
            {error}
          </Banner>
        )}
        {success && (
          <Banner tone="success" onClose={() => setSuccess("")}>
            {success}
          </Banner>
        )}

        {loading && devices.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 size={28} className="animate-spin text-lime-400" />
          </div>
        ) : devices.length === 0 ? (
          <EmptyState
            icon={<Monitor size={34} />}
            title="No TVs paired"
            hint="Open the Fuel TV app on a television, then choose Pair New TV and enter the code it shows."
            action={
              <PrimaryButton onClick={openPair}>
                <Plus size={16} />
                Pair New TV
              </PrimaryButton>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {devices.map((device) => (
              <div
                key={device.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
                      <Monitor size={20} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{device.name}</h3>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{device.branch.name}</p>
                    </div>
                  </div>

                  <span
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      device.isOnline
                        ? "border-lime-400/20 bg-lime-400/10 text-lime-400"
                        : "border-zinc-700 bg-zinc-800/50 text-zinc-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        device.isOnline ? "bg-lime-400" : "bg-zinc-600"
                      }`}
                    />
                    {device.isOnline ? "Online" : "Offline"}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-zinc-600">Last seen</dt>
                    <dd className="mt-1 text-zinc-300">
                      {device.isOnline ? "Now" : formatSeen(device.lastSeenAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Paired</dt>
                    <dd className="mt-1 text-zinc-300">{formatSeen(device.pairedAt)}</dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <button
                    type="button"
                    onClick={() => void remove(device)}
                    disabled={removingId === device.id}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 disabled:opacity-50"
                  >
                    {removingId === device.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    Remove TV
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pairing && (
        <Modal
          title="Pair a New TV"
          subtitle="Open the Fuel TV app on the television. It shows a 6 character code."
          onClose={() => setPairing(false)}
          closeDisabled={pairBusy}
          footer={
            <>
              <SecondaryButton onClick={() => setPairing(false)} disabled={pairBusy}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={() => void pair()} loading={pairBusy}>
                Pair TV
              </PrimaryButton>
            </>
          }
        >
          <div className="space-y-5">
            {pairError && (
              <Banner tone="error" onClose={() => setPairError("")}>
                {pairError}
              </Banner>
            )}

            <Field label="Pairing code">
              <input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
                }
                placeholder="ABC123"
                autoFocus
                className={`${inputClass} text-center font-mono text-2xl tracking-[0.4em]`}
              />
            </Field>

            <Field label="TV name">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="Example: Main Floor"
                className={inputClass}
              />
            </Field>

            <Field label="Branch">
              <select
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className={inputClass}
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
