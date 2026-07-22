"use client";

import { socket } from "@/src/lib/socket-client";
import {
  ArrowLeft,
  CircleStop,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Tv,
  Wifi,
  WifiOff,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  useCallback,
  useEffect,
  useState,
} from "react";


type TvCommand =
  | "START"
  | "PLAY"
  | "PAUSE"
  | "NEXT"
  | "PREVIOUS"
  | "STOP";

type PlaybackState = {
  deviceId: string;
  assignmentId: string;
  status:
    | "IDLE"
    | "PLAYING"
    | "PAUSED"
    | "COMPLETED";

  currentVideoId?: string | null;
  currentVideoName?: string | null;

  currentIndex: number;
  totalVideos: number;
  currentTime: number;
};

type DeviceSnapshot = {
  id: string;
  name: string;
  branchName: string;

  isOnline: boolean;

  featuredAssignmentId?: string | null;

  playbackState?: PlaybackState | null;
};

type JoinResponse = {
  success: boolean;
  message?: string;
  device?: DeviceSnapshot;
};

type CommandResponse = {
  success: boolean;
  message?: string;
};

type Props = {
  deviceId: string;
};



function formatTime(
  totalSeconds: number
) {
  const safeSeconds = Math.max(
    0,
    Math.floor(totalSeconds || 0)
  );

  const minutes = Math.floor(
    safeSeconds / 60
  );

  const seconds =
    safeSeconds % 60;

  return `${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function TvRemoteController({
  deviceId,
}: Props) {
  const router = useRouter();


  const [
    device,
    setDevice,
  ] = useState<DeviceSnapshot | null>(
    null
  );

  const [
    playback,
    setPlayback,
  ] =
    useState<PlaybackState | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    commandLoading,
    setCommandLoading,
  ] =
    useState<TvCommand | null>(
      null
    );

  const [
    error,
    setError,
  ] = useState("");


  const joinController =
    useCallback(() => {
      setLoading(true);
      setError("");

      socket
        .timeout(8000)
        .emit(
          "admin:tv-controller:join",
          {
            deviceId,
          },
          (
            timeoutError: Error | null,
            response: JoinResponse
          ) => {
            setLoading(false);

            if (timeoutError) {
              setError(
                "The TV controller server did not respond."
              );

              return;
            }

            if (
              !response?.success ||
              !response.device
            ) {
              setError(
                response?.message ||
                  "Unable to open this TV controller."
              );

              return;
            }

            setDevice(
              response.device
            );

            setPlayback(
              response.device
                .playbackState ||
                null
            );
          }
        );
    }, [
      deviceId,
      socket,
    ]);

  useEffect(() => {
    const handleConnect = () => {
      joinController();
    };

    const handleDisconnect =
      () => {

        setDevice(
          (current) =>
            current
              ? {
                  ...current,
                  online: false,
                }
              : current
        );
      };

    const handleConnectionState =
      (payload: {
        deviceId: string;
        isOnline: boolean;
      }) => {
        if (
          payload.deviceId !==
          deviceId
        ) {
          return;
        }

        setDevice(
          (current) =>
            current
              ? {
                  ...current,
                  online:
                    payload.isOnline,
                }
              : current
        );
      };

    const handlePlaybackState =
      (
        payload: PlaybackState
      ) => {
        if (
          payload.deviceId !==
          deviceId
        ) {
          return;
        }

        setPlayback(payload);

        setDevice(
          (current) =>
            current
              ? {
                  ...current,
                  online: true,
                  playbackState:
                    payload,
                }
              : current
        );
      };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "tv:connection-state",
      handleConnectionState
    );

    socket.on(
      "tv:playback-state",
      handlePlaybackState
    );

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.emit(
        "admin:tv-controller:leave",
        {
          deviceId,
        }
      );

      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "tv:connection-state",
        handleConnectionState
      );

      socket.off(
        "tv:playback-state",
        handlePlaybackState
      );
    };
  }, [
    deviceId,
    joinController,
    socket,
  ]);

  const sendCommand = (
    command: TvCommand
  ) => {
    if (!socket.connected) {
      setError(
        "Controller socket is disconnected."
      );

      return;
    }

    if (!device?.isOnline) {
      setError(
        "This TV is currently offline."
      );

      return;
    }

    setCommandLoading(command);
    setError("");

    socket
      .timeout(6000)
      .emit(
        "admin:tv:command",
        {
          deviceId,
          command,

          assignmentId:
            command === "START"
              ? device
                  .featuredAssignmentId
              : undefined,
        },

        (
          timeoutError: Error | null,
          response: CommandResponse
        ) => {
          setCommandLoading(null);

          if (timeoutError) {
            setError(
              "The command timed out."
            );

            return;
          }

          if (!response?.success) {
            setError(
              response?.message ||
                "The command could not be sent."
            );
          }
        }
      );
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-lime-400" />
      </div>
    );
  }

  const isOnline =
    device?.isOnline === true;

  const isPlaying =
    playback?.status ===
    "PLAYING";

  const currentVideoNumber =
    playback
      ? playback.currentIndex + 1
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 transition hover:border-neutral-600 hover:text-white"
          >
            <ArrowLeft
              size={20}
            />
          </button>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400">
              Fuel TV Controller
            </p>

            <h1 className="mt-1 text-2xl font-bold text-white">
              {device?.name ||
                "TV Display"}
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              {device?.branchName ||
                "Branch not available"}
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
            isOnline
              ? "border-green-900 bg-green-950/50 text-green-300"
              : "border-red-900 bg-red-950/50 text-red-300"
          }`}
        >
          {isOnline ? (
            <Wifi size={16} />
          ) : (
            <WifiOff
              size={16}
            />
          )}

          {isOnline
            ? "TV Online"
            : "TV Offline"}
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950">
        <div className="flex min-h-72 flex-col items-center justify-center px-8 py-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-neutral-900 text-lime-400">
            <Tv size={36} />
          </div>

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-neutral-600">
            Now Playing
          </p>

          <h2 className="mt-3 max-w-2xl text-3xl font-bold text-white">
            {playback
              ?.currentVideoName ||
              "No workout playing"}
          </h2>

          {playback && (
            <p className="mt-3 text-neutral-500">
              Video{" "}
              {currentVideoNumber} of{" "}
              {
                playback.totalVideos
              }
              {" · "}
              {formatTime(
                playback.currentTime
              )}
            </p>
          )}

          <div className="mt-7 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-300">
            {playback?.status ||
              "IDLE"}
          </div>
        </div>

        <div className="border-t border-neutral-800 bg-neutral-900/50 px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <ControllerButton
              label="Previous"
              icon={
                <SkipBack
                  size={22}
                />
              }
              disabled={!isOnline}
              loading={
                commandLoading ===
                "PREVIOUS"
              }
              onClick={() =>
                sendCommand(
                  "PREVIOUS"
                )
              }
            />

            <ControllerButton
              label={
                isPlaying
                  ? "Pause"
                  : "Play"
              }
              primary
              icon={
                isPlaying ? (
                  <Pause
                    size={24}
                  />
                ) : (
                  <Play
                    size={24}
                  />
                )
              }
              disabled={!isOnline}
              loading={
                commandLoading ===
                  "PLAY" ||
                commandLoading ===
                  "PAUSE"
              }
              onClick={() =>
                sendCommand(
                  isPlaying
                    ? "PAUSE"
                    : "PLAY"
                )
              }
            />

            <ControllerButton
              label="Next"
              icon={
                <SkipForward
                  size={22}
                />
              }
              disabled={!isOnline}
              loading={
                commandLoading ===
                "NEXT"
              }
              onClick={() =>
                sendCommand(
                  "NEXT"
                )
              }
            />

            <ControllerButton
              label="Stop"
              danger
              icon={
                <CircleStop
                  size={22}
                />
              }
              disabled={!isOnline}
              loading={
                commandLoading ===
                "STOP"
              }
              onClick={() =>
                sendCommand(
                  "STOP"
                )
              }
            />
          </div>

          {!playback &&
            device
              ?.featuredAssignmentId && (
              <div className="mt-5 flex justify-center">
                <ControllerButton
                  label="Start Today's Program"
                  icon={
                    <Play
                      size={22}
                    />
                  }
                  primary
                  disabled={
                    !isOnline
                  }
                  loading={
                    commandLoading ===
                    "START"
                  }
                  onClick={() =>
                    sendCommand(
                      "START"
                    )
                  }
                />
              </div>
            )}
        </div>
      </section>

      <button
        type="button"
        onClick={() =>
          sendCommand("START")
        }
        disabled={
          !isOnline ||
          !device
            ?.featuredAssignmentId
        }
        className="hidden"
      >
        <RotateCcw />
      </button>
    </div>
  );
}

type ControllerButtonProps = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;

  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

function ControllerButton({
  label,
  icon,
  onClick,
  primary,
  danger,
  disabled,
  loading,
}: ControllerButtonProps) {
  let className =
    "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500";

  if (primary) {
    className =
      "border-lime-400 bg-lime-400 text-neutral-950 hover:bg-lime-300";
  }

  if (danger) {
    className =
      "border-red-900 bg-red-950/60 text-red-300 hover:border-red-700";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={
        disabled || loading
      }
      className={`flex min-w-36 items-center justify-center gap-3 rounded-2xl border px-6 py-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {loading ? (
        <Loader2
          size={21}
          className="animate-spin"
        />
      ) : (
        icon
      )}

      {label}
    </button>
  );
}