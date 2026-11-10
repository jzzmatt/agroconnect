"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  getUnreadNotificationCountAction,
  getUserNotificationsAction,
} from "@/lib/services/logistics-actions";
import type { AppNotification } from "@/types/notifications";

const POLL_MS = 20000;

type UnreadNotificationsState = {
  count: number;
  increased: boolean;
  loading: boolean;
  notifications: AppNotification[];
  refresh: () => Promise<void>;
};

const UnreadNotificationsContext = createContext<UnreadNotificationsState>({
  count: 0,
  increased: false,
  loading: true,
  notifications: [],
  refresh: async () => {},
});

export function UnreadNotificationsProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const previous = useRef<number | null>(null);
  const [count, setCount] = useState(0);
  const [increased, setIncreased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pulseToken, setPulseToken] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [nextCount, list] = await Promise.all([
        getUnreadNotificationCountAction(),
        getUserNotificationsAction(),
      ]);
      if (previous.current !== null && nextCount > previous.current && !reduceRef.current) {
        setPulseToken((token) => token + 1);
      }
      previous.current = nextCount;
      setCount(nextCount);
      setNotifications(list);
    } catch {
      previous.current = previous.current ?? 0;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  useEffect(() => {
    if (pulseToken === 0 || reduceRef.current) return;
    setIncreased(true);
    const timeout = window.setTimeout(() => setIncreased(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [pulseToken]);

  return (
    <UnreadNotificationsContext.Provider value={{ count, increased, loading, notifications, refresh }}>
      {children}
    </UnreadNotificationsContext.Provider>
  );
}

export function useUnreadNotifications() {
  return useContext(UnreadNotificationsContext);
}
