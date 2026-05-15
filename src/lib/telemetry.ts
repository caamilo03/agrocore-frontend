export interface TelemetryReading {
  id: number;
  idCropBatch: string;
  recordedAt: string;
  temperature: number;
  humidity: number;
  co2: number;
}

export interface SpeciesThresholds {
  minTemperature: number;
  maxTemperature: number;
  minHumidity: number;
  maxHumidity: number;
  minCo2: number;
  maxCo2: number;
}

export type ReadingStatus = "OK" | "WARN" | "CRITICAL";

export interface ClassifiedReading {
  tempStatus: ReadingStatus;
  humStatus: ReadingStatus;
  co2Status: ReadingStatus;
  worstStatus: ReadingStatus;
}

import { apiFetch } from "./api";

const TELEMETRY_BASE = "/telemetry/batches";

interface RawReading {
  id: number;
  idCropBatch: string;
  recordedAt: string;
  temperature: number | string;
  humidity: number | string;
  co2: number | string;
}

function toNumber(value: number | string): number {
  return typeof value === "number" ? value : parseFloat(value);
}

/**
 * Backend serializes LocalDateTime without timezone marker (the VPS clock is
 * UTC, but the JSON looks like "2026-05-06T23:20:00.123456"). Browsers parse
 * that as local time, so we explicitly append "Z" to make it UTC. Combined
 * with toLocaleString({ timeZone: "America/Bogota" }) downstream, displays
 * end up in Colombian time regardless of the user's machine.
 */
export function normalizeRecordedAt(iso: string): string {
  if (/[Z]|[+-]\d{2}:?\d{2}$/.test(iso)) return iso;
  return iso + "Z";
}

function normalize(raw: RawReading): TelemetryReading {
  return {
    id: raw.id,
    idCropBatch: raw.idCropBatch,
    recordedAt: normalizeRecordedAt(raw.recordedAt),
    temperature: toNumber(raw.temperature),
    humidity: toNumber(raw.humidity),
    co2: toNumber(raw.co2),
  };
}

export const DISPLAY_TZ = "America/Bogota";

export function formatReadingTime(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleTimeString("es-CO", { timeZone: DISPLAY_TZ, hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", ...opts });
}

export function formatReadingDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: DISPLAY_TZ, day: "2-digit", month: "2-digit", ...opts });
}

export function formatReadingDateTime(iso: string): string {
  return formatReadingDate(iso) + " " + new Date(iso).toLocaleTimeString("es-CO", { timeZone: DISPLAY_TZ, hour12: false, hour: "2-digit", minute: "2-digit" });
}

export type BucketGranularity = "raw" | "minute" | "hour" | "day";

export interface BucketedReading {
  /** ISO instant (UTC) representing the START of the bucket in Colombian local time. For raw, equals reading time. */
  bucketStart: string;
  temperature: number;
  humidity: number;
  co2: number;
  count: number;
}

// America/Bogota is UTC-5 year-round (Colombia does not observe DST).
const COLOMBIA_UTC_OFFSET_HOURS = 5;

/** Pads a number to 2 digits ("3" -> "03"). */
function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

/** Extracts Colombian-local Y/M/D/h/m components from an ISO instant. */
function colombiaParts(iso: string): { y: number; mo: number; d: number; h: number; mi: number } {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    y: Number(parts.year),
    mo: Number(parts.month),
    d: Number(parts.day),
    // Intl can emit "24" for midnight in some locales — normalize to 0.
    h: Number(parts.hour) % 24,
    mi: Number(parts.minute),
  };
}

/**
 * Produces an ISO instant (UTC) corresponding to the START of the bucket in
 * Colombian local time. e.g. for hour bucket "2026-05-10 18 Colombia",
 * returns "2026-05-10T23:00:00.000Z".
 */
function bucketStartIso(y: number, mo: number, d: number, h: number, mi: number): string {
  return new Date(Date.UTC(y, mo - 1, d, h + COLOMBIA_UTC_OFFSET_HOURS, mi)).toISOString();
}

/**
 * Aggregates raw readings into time buckets by averaging. Bucket boundaries
 * are aligned to Colombian local time so the labels match what the user
 * sees on the clock. "raw" returns one bucket per input reading (identity).
 */
export function aggregateReadings(readings: TelemetryReading[], granularity: BucketGranularity): BucketedReading[] {
  if (granularity === "raw") {
    return readings.map((r) => ({
      bucketStart: r.recordedAt,
      temperature: r.temperature,
      humidity: r.humidity,
      co2: r.co2,
      count: 1,
    }));
  }

  const groups = new Map<string, { key: string; t: number; h: number; c: number; n: number; start: string }>();
  for (const r of readings) {
    const { y, mo, d, h, mi } = colombiaParts(r.recordedAt);
    let key: string;
    let start: string;
    if (granularity === "minute") {
      key = `${y}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}`;
      start = bucketStartIso(y, mo, d, h, mi);
    } else if (granularity === "hour") {
      key = `${y}-${pad2(mo)}-${pad2(d)}T${pad2(h)}`;
      start = bucketStartIso(y, mo, d, h, 0);
    } else {
      key = `${y}-${pad2(mo)}-${pad2(d)}`;
      start = bucketStartIso(y, mo, d, 0, 0);
    }

    const entry = groups.get(key);
    if (entry) {
      entry.t += r.temperature; entry.h += r.humidity; entry.c += r.co2; entry.n++;
    } else {
      groups.set(key, { key, t: r.temperature, h: r.humidity, c: r.co2, n: 1, start });
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((v) => ({
      bucketStart: v.start,
      temperature: v.t / v.n,
      humidity: v.h / v.n,
      co2: v.c / v.n,
      count: v.n,
    }));
}

export async function getLatest(batchId: string): Promise<TelemetryReading | null> {
  const res = await apiFetch(`${TELEMETRY_BASE}/${batchId}/latest`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Telemetry latest failed: ${res.status}`);
  return normalize(await res.json());
}

export async function getRecent(batchId: string, limit = 100): Promise<TelemetryReading[]> {
  const res = await apiFetch(`${TELEMETRY_BASE}/${batchId}/recent?limit=${limit}`);
  if (!res.ok) throw new Error(`Telemetry recent failed: ${res.status}`);
  const data: RawReading[] = await res.json();
  return data.map(normalize);
}

export async function getRange(
  batchId: string,
  from: Date,
  to: Date,
): Promise<TelemetryReading[]> {
  const params = new URLSearchParams({
    from: from.toISOString().slice(0, 19),
    to: to.toISOString().slice(0, 19),
  });
  const res = await apiFetch(`${TELEMETRY_BASE}/${batchId}/range?${params}`);
  if (!res.ok) throw new Error(`Telemetry range failed: ${res.status}`);
  const data: RawReading[] = await res.json();
  return data.map(normalize);
}

const WARN_MARGIN = 0.1;

function classifyValue(value: number, min: number, max: number): ReadingStatus {
  if (value < min || value > max) return "CRITICAL";
  const margin = (max - min) * WARN_MARGIN;
  if (value < min + margin || value > max - margin) return "WARN";
  return "OK";
}

export function classifyReading(
  reading: Pick<TelemetryReading, "temperature" | "humidity" | "co2">,
  thresholds: SpeciesThresholds,
): ClassifiedReading {
  const tempStatus = classifyValue(reading.temperature, thresholds.minTemperature, thresholds.maxTemperature);
  const humStatus = classifyValue(reading.humidity, thresholds.minHumidity, thresholds.maxHumidity);
  const co2Status = classifyValue(reading.co2, thresholds.minCo2, thresholds.maxCo2);

  const order: ReadingStatus[] = ["OK", "WARN", "CRITICAL"];
  const worstStatus = [tempStatus, humStatus, co2Status].reduce((worst, s) =>
    order.indexOf(s) > order.indexOf(worst) ? s : worst,
  "OK" as ReadingStatus);

  return { tempStatus, humStatus, co2Status, worstStatus };
}

/** Defensive cap the backend uses for /range. Mirrors RANGE_MAX_LIMIT on the Spring controller. */
export const RANGE_MAX_LIMIT = 5000;

export type CoverageStatus =
  | { kind: "ok" }
  | { kind: "cap"; limit: number }
  | { kind: "insufficient-history"; earliest: string };

/**
 * Diagnoses why a /range response may not match the requested window.
 *
 * - "cap": the backend returned exactly the defensive limit (RANGE_MAX_LIMIT).
 *   In that case the data is truncated and the user should narrow the range.
 * - "insufficient-history": the response has fewer items than the cap AND
 *   doesn't cover the start of the requested window. Typical when the
 *   simulator (or the real sensor stream) only has data for the last few
 *   days. Not actually an error.
 * - "ok": nothing to flag.
 *
 * `readings` must be ordered ASC by recordedAt.
 */
export function diagnoseCoverage(
  readings: TelemetryReading[],
  requestedFrom: Date,
  toleranceMs: number = 6 * 60 * 60 * 1000, // 6 hours
): CoverageStatus {
  if (readings.length >= RANGE_MAX_LIMIT) {
    return { kind: "cap", limit: RANGE_MAX_LIMIT };
  }
  if (readings.length === 0) return { kind: "ok" };
  const earliest = new Date(readings[0].recordedAt);
  if (earliest.getTime() - requestedFrom.getTime() > toleranceMs) {
    return { kind: "insufficient-history", earliest: readings[0].recordedAt };
  }
  return { kind: "ok" };
}

export const STATUS_COLORS: Record<ReadingStatus, { bg: string; text: string; ring: string; hex: string }> = {
  OK: { bg: "bg-green-100", text: "text-green-700", ring: "ring-green-200", hex: "#22c55e" },
  WARN: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200", hex: "#f59e0b" },
  CRITICAL: { bg: "bg-red-100", text: "text-red-700", ring: "ring-red-200", hex: "#ef4444" },
};
