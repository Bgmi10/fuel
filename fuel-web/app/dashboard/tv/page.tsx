"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  MonitorPlay,
  Plus,
  RefreshCw,
  Tv,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import { socket } from "@/src/lib/socket-client";
import { useRouter } from "next/navigation";

type Branch = {
  id: string;
  name: string;
};

type TvDevice = {
  id: string;
  name: string;
  branchId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  pairedAt: string;
  branch: {
    id: string;
    name: string;
  };
};

type DeviceStatusPayload = {
  deviceId: string;
  isOnline: boolean;
  lastSeenAt: string;
};

function extractArray<T>(
  payload: unknown,
  key: string
): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    key in payload
  ) {
    const value = (
      payload as Record<string, unknown>
    )[key];

    return Array.isArray(value)
      ? (value as T[])
      : [];
  }

  return [];
}

export default function FuelTvPage() {
  const [devices, setDevices] =
    useState<TvDevice[]>([]);
    const [onlineDeviceIds, setOnlineDeviceIds] =
  useState<Set<string>>(
    () => new Set()
  );

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isPairModalOpen, setIsPairModalOpen] =
    useState(false);

  const [isPairing, setIsPairing] =
    useState(false);

  const [socketConnected, setSocketConnected] =
    useState(socket.connected);

  const [pairingCode, setPairingCode] =
    useState("");

  const [branchId, setBranchId] =
    useState("");

  const [deviceName, setDeviceName] =
    useState("");

  const [error, setError] =
    useState("");
    const router = useRouter();

  const [successMessage, setSuccessMessage] =
    useState("");


  const onlineCount = useMemo(
    () =>
      devices.filter((device) =>
        onlineDeviceIds.has(device.id)
      ).length,
    [devices, onlineDeviceIds]
  );

  const loadDevices = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/tv-devices",
        {
          cache: "no-store",
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message ||
            "Unable to load TV devices."
        );
      }

      setDevices(
        extractArray<TvDevice>(
          payload,
          "devices"
        )
      );
    } catch (loadError) {
      console.error(
        "Load TV devices error:",
        loadError
      );
    }
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/branches",
        {
          cache: "no-store",
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message ||
            "Unable to load branches."
        );
      }

      setBranches(
        extractArray<Branch>(
          payload,
          "branches"
        )
      );
    } catch (loadError) {
      console.error(
        "Load branches error:",
        loadError
      );
    }
  }, []);

  const loadPage = useCallback(async () => {
    setIsLoading(true);

    await Promise.all([
      loadDevices(),
      loadBranches(),
    ]);

    setIsLoading(false);
  }, [loadBranches, loadDevices]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    type DashboardJoinResponse = {
      success: boolean;
      onlineDeviceIds: string[];
      message?: string;
    };
  
    type DeviceStatusPayload = {
      deviceId: string;
      isOnline: boolean;
      lastSeenAt?: string;
    };
  
    function handleConnect() {
      console.log(
        "Admin socket connected:",
        socket.id
      );
  
      setSocketConnected(true);
  
      socket.emit(
        "admin:tv-dashboard:join",
        {},
        (
          response?: DashboardJoinResponse
        ) => {
          if (!response?.success) {
            console.error(
              "Unable to join TV dashboard:",
              response?.message
            );
  
            return;
          }
  
          console.log(
            "Current online TVs:",
            response.onlineDeviceIds
          );
  
          /*
           * This immediately fixes TVs that were
           * already online before this page opened.
           */
          setOnlineDeviceIds(
            new Set(
              response.onlineDeviceIds ?? []
            )
          );
        }
      );
    }
  
    function handleDisconnect() {
      setSocketConnected(false);
  
      /*
       * The admin socket disconnected.
       * We no longer have a reliable live snapshot.
       */
      setOnlineDeviceIds(new Set());
    }
  
    function handleDeviceStatus(
      payload: DeviceStatusPayload
    ) {
      console.log(
        "TV status changed:",
        payload
      );
  
      setOnlineDeviceIds(
        (currentOnlineIds) => {
          const nextOnlineIds =
            new Set(currentOnlineIds);
  
          if (payload.isOnline) {
            nextOnlineIds.add(
              payload.deviceId
            );
          } else {
            nextOnlineIds.delete(
              payload.deviceId
            );
          }
  
          return nextOnlineIds;
        }
      );
  
      if (payload.lastSeenAt) {
        setDevices((currentDevices) =>
          currentDevices.map((device) =>
            device.id === payload.deviceId
              ? {
                  ...device,
                  isOnline:
                    payload.isOnline,
                  lastSeenAt:
                    payload.lastSeenAt ??
                    device.lastSeenAt,
                }
              : device
          )
        );
      }
    }
  
    socket.on("connect", handleConnect);
  
    socket.on(
      "disconnect",
      handleDisconnect
    );
  
    socket.on(
      "tv:device-status",
      handleDeviceStatus
    );
  
    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }
  
    return () => {
      socket.off(
        "connect",
        handleConnect
      );
  
      socket.off(
        "disconnect",
        handleDisconnect
      );
  
      socket.off(
        "tv:device-status",
        handleDeviceStatus
      );
  
      /*
       * Do not call socket.disconnect() here if the
       * same socket is shared across dashboard pages.
       */
    };
  }, []);

  function openPairModal() {
    setError("");
    setSuccessMessage("");
    setPairingCode("");
    setBranchId("");
    setDeviceName("");
    setIsPairModalOpen(true);
  }

  function closePairModal() {
    if (isPairing) {
      return;
    }

    setIsPairModalOpen(false);
  }

  function handleCodeChange(value: string) {
    const normalizedCode = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);

    setPairingCode(normalizedCode);
    setError("");
  }

  async function handlePairTv(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (pairingCode.length !== 6) {
      setError(
        "Enter the six-character code displayed on the TV."
      );

      return;
    }

    if (!branchId) {
      setError("Select a branch.");

      return;
    }

    if (!deviceName.trim()) {
      setError("Enter a name for the TV.");

      return;
    }

    try {
      setIsPairing(true);

      const response = await fetch(
        "/api/tv-devices/pair",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            pairingCode,
            branchId,
            deviceName:
              deviceName.trim(),
          }),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message ||
            "Unable to pair the TV."
        );
      }

      setSuccessMessage(
        `${payload.device.name} was connected successfully.`
      );

      setDevices((current) => [
        payload.device,
        ...current.filter(
          (device) =>
            device.id !==
            payload.device.id
        ),
      ]);

      setTimeout(() => {
        setIsPairModalOpen(false);
        setSuccessMessage("");
      }, 1_200);
    } catch (pairError) {
      setError(
        pairError instanceof Error
          ? pairError.message
          : "Unable to pair the TV."
      );
    } finally {
      setIsPairing(false);
    }
  }

  return (
    <div className="min-h-full bg-neutral-950 p-6 text-white lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-neutral-800 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400">
                <MonitorPlay size={23} />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  Fuel TV
                </h1>

                <p className="mt-1 text-sm text-neutral-400">
                  Pair and manage workout display
                  devices.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                socketConnected
                  ? "border-emerald-900 bg-emerald-950/40 text-emerald-400"
                  : "border-amber-900 bg-amber-950/40 text-amber-400"
              }`}
            >
              {socketConnected ? (
                <Wifi size={15} />
              ) : (
                <WifiOff size={15} />
              )}

              {socketConnected
                ? "Live connection"
                : "Connecting"}
            </div>

            <button
              type="button"
              onClick={loadPage}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition hover:border-neutral-700 hover:text-white"
              aria-label="Refresh TV devices"
            >
              <RefreshCw size={17} />
            </button>

            <button
              type="button"
              onClick={openPairModal}
              className="flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-bold text-neutral-950 transition hover:bg-lime-300"
            >
              <Plus size={18} />
              Pair New TV
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total TVs"
            value={String(devices.length)}
            icon={<Tv size={20} />}
          />

          <SummaryCard
            label="Online"
            value={String(onlineCount)}
            icon={<Wifi size={20} />}
          />

          <SummaryCard
            label="Offline"
            value={String(
              devices.length - onlineCount
            )}
            icon={<WifiOff size={20} />}
          />
        </div>

        <div className="mt-7 rounded-2xl border border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
            <div>
              <h2 className="font-semibold">
                Connected TVs
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                TVs paired with your gym
                branches.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2
                className="animate-spin text-lime-400"
                size={28}
              />
            </div>
          ) : devices.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-neutral-500">
                <MonitorPlay size={30} />
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                No TVs connected
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                Open Fuel TV on the television,
                note the pairing code, and connect
                it here.
              </p>

              <button
                type="button"
                onClick={openPairModal}
                className="mt-5 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-bold text-neutral-950"
              >
                Pair Your First TV
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {devices.map((device) => (
                
                <div
                  key={device.id}
                  className="flex flex-col gap-4 px-5 py-5 transition hover:bg-neutral-900/70 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-lime-400">
                      <Tv size={22} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold">
                          {device.name}
                        </h3>

                        <StatusBadge
                          online={
                            onlineDeviceIds.has(device.id)
                          }
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-500">
                        <span className="flex items-center gap-2">
                          <Building2
                            size={15}
                          />

                          {device.branch.name}
                        </span>

                        <span className="flex items-center gap-2">
  <Clock3 size={15} />

  {onlineDeviceIds.has(device.id)
    ? "Connected now"
    : device.lastSeenAt
      ? `Last seen ${formatDate(
          device.lastSeenAt
        )}`
      : "Not connected yet"}
</span>
                      </div>
                    </div>
                  </div>

                  <button
                  onClick={() => {
                   router.push(
      `/dashboard/tv/${device.id}/controller`
    );
                  }} 
                    type="button"
                    className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-lime-400 hover:text-lime-400"
                  >
                    Open Controller
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isPairModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">
                  Pair New TV
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Enter the code visible on the
                  Fuel TV screen.
                </p>
              </div>

              <button
                type="button"
                onClick={closePairModal}
                disabled={isPairing}
                className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-900 hover:text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handlePairTv}
              className="space-y-5 p-6"
            >
              <div className="rounded-xl border border-lime-900/50 bg-lime-950/20 p-4">
                <p className="text-sm leading-6 text-lime-200">
                  Keep the TV pairing screen
                  open. The code expires after
                  ten minutes.
                </p>
              </div>

              <div>
                <label
                  htmlFor="pairingCode"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Pairing code
                </label>

                <input
                  id="pairingCode"
                  value={pairingCode}
                  onChange={(event) =>
                    handleCodeChange(
                      event.target.value
                    )
                  }
                  autoFocus
                  autoComplete="off"
                  placeholder="K7MP4Q"
                  className="h-16 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-center font-mono text-2xl font-bold uppercase tracking-[0.45em] text-white outline-none transition placeholder:text-neutral-700 focus:border-lime-400"
                />
              </div>

              <div>
                <label
                  htmlFor="branch"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Branch
                </label>

                <select
                  id="branch"
                  value={branchId}
                  onChange={(event) => {
                    setBranchId(
                      event.target.value
                    );
                    setError("");
                  }}
                  className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-sm text-white outline-none focus:border-lime-400"
                >
                  <option value="">
                    Select branch
                  </option>

                  {branches.map((branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                    >
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="deviceName"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  TV name
                </label>

                <input
                  id="deviceName"
                  value={deviceName}
                  onChange={(event) => {
                    setDeviceName(
                      event.target.value
                    );
                    setError("");
                  }}
                  placeholder="Main Workout Floor TV"
                  maxLength={80}
                  className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              {successMessage ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
                  <CheckCircle2 size={18} />
                  {successMessage}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 border-t border-neutral-800 pt-5">
                <button
                  type="button"
                  onClick={closePairModal}
                  disabled={isPairing}
                  className="rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isPairing ||
                    pairingCode.length !== 6 ||
                    !branchId ||
                    !deviceName.trim()
                  }
                  className="flex min-w-32 items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-bold text-neutral-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isPairing ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Pairing
                    </>
                  ) : (
                    <>
                      <MonitorPlay
                        size={17}
                      />
                      Connect TV
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">
          {label}
        </span>

        <span className="text-neutral-600">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  online,
}: {
  online: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${
        online
          ? "border-emerald-900 bg-emerald-950/40 text-emerald-400"
          : "border-neutral-700 bg-neutral-900 text-neutral-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online
            ? "bg-emerald-400"
            : "bg-neutral-600"
        }`}
      />

      {online ? "Online" : "Offline"}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}