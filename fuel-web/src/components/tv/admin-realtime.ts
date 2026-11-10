"use client";

/**
 * Admin live updates. Subscribes the browser to its branch room and bumps
 * `tick` (debounced) whenever a broadcast changes status/version (start,
 * pause, stop, auto-start, layout edit) or a TV goes on/offline. Screens
 * refetch when `tick` changes. Admin sockets are listen-only; every
 * command is still a REST call.
 *
 * NOTE: adjust this import if your client socket lives elsewhere.
 */
import { useEffect, useState } from "react";


import { socket } from "@/src/lib/socket-client";
import { api } from "./api";

export function useAdminRealtime(branchId: string) {
  const [connected, setConnected] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!branchId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const bump = () => {
      if (timer) {
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        if (!cancelled) {
          setTick((value) => value + 1);
        }
      }, 150);
    };

    async function subscribe() {
      try {
        const payload = await api<{ token: string } | string>(
          "/api/tv/admin-socket-token"
        );
        const token = typeof payload === "string" ? payload : payload.token;

        socket.emit(
          "admin:subscribe",
          { token, branchId },
          (response?: { success: boolean }) => {
            if (!cancelled) {
              setConnected(Boolean(response?.success));
            }
          }
        );
      } catch {
        if (!cancelled) {
          setConnected(false);
        }
      }
    }

    const onConnect = () => void subscribe();
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("broadcast:status", bump);
    socket.on("tv:device-status", bump);

    if (socket.connected) {
      void subscribe();
    } else {
      socket.connect();
    }

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("broadcast:status", bump);
      socket.off("tv:device-status", bump);
    };
  }, [branchId]);

  return { connected, tick };
}