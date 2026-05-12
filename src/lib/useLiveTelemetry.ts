"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getLatest, getRecent, TelemetryReading } from "./telemetry";

export interface LiveTelemetryState {
  latest: TelemetryReading | null;
  recent: TelemetryReading[];
  loading: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
  refresh: () => void;
}

export interface UseLiveTelemetryOptions {
  intervalMs?: number;
  recentLimit?: number;
  enabled?: boolean;
}

export function useLiveTelemetry(
  batchId: string | null | undefined,
  options: UseLiveTelemetryOptions = {},
): LiveTelemetryState {
  const { intervalMs = 5000, recentLimit = 60, enabled = true } = options;

  const [latest, setLatest] = useState<TelemetryReading | null>(null);
  const [recent, setRecent] = useState<TelemetryReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const cancelledRef = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (!batchId) return;
    try {
      setLoading(true);
      const [latestRes, recentRes] = await Promise.all([
        getLatest(batchId),
        getRecent(batchId, recentLimit),
      ]);
      if (cancelledRef.current) return;
      setLatest(latestRes);
      setRecent(recentRes.slice().reverse());
      setLastUpdatedAt(new Date());
      setError(null);
    } catch (err) {
      if (cancelledRef.current) return;
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [batchId, recentLimit]);

  useEffect(() => {
    if (!enabled || !batchId) return;
    cancelledRef.current = false;
    fetchOnce();
    const id = window.setInterval(fetchOnce, intervalMs);
    return () => {
      cancelledRef.current = true;
      window.clearInterval(id);
    };
  }, [batchId, enabled, intervalMs, fetchOnce]);

  return { latest, recent, loading, error, lastUpdatedAt, refresh: fetchOnce };
}
