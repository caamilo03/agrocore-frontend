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

const TELEMETRY_BASE = `${process.env.NEXT_PUBLIC_API_URL}/telemetry/batches`;

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
  return new Date(iso).toLocaleTimeString("es-CO", { timeZone: DISPLAY_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", ...opts });
}

export function formatReadingDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: DISPLAY_TZ, day: "2-digit", month: "2-digit", ...opts });
}

export function formatReadingDateTime(iso: string): string {
  return formatReadingDate(iso) + " " + new Date(iso).toLocaleTimeString("es-CO", { timeZone: DISPLAY_TZ, hour: "2-digit", minute: "2-digit" });
}

export type BucketGranularity = "raw" | "minute" | "hour" | "day";

export interface BucketedReading {
  bucketStart: string;
  temperature: number;
  humidity: number;
  co2: number;
  count: number;
}

/**
 * Aggregates raw readings into time buckets by averaging. The bucket key is
 * the ISO of the bucket start (truncated to the given granularity, in the
 * display timezone so the labels later look natural). "raw" returns one
 * bucket per input reading.
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

  const groups = new Map<string, { t: number; h: number; c: number; n: number; first: string }>();
  for (const r of readings) {
    const d = new Date(r.recordedAt);
    // Build a stable bucket key using Colombian-local fields so day boundaries match the user.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: DISPLAY_TZ,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(d).reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    let key: string;
    if (granularity === "minute") key = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
    else if (granularity === "hour") key = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}`;
    else key = `${parts.year}-${parts.month}-${parts.day}`;

    const entry = groups.get(key);
    if (entry) {
      entry.t += r.temperature; entry.h += r.humidity; entry.c += r.co2; entry.n++;
    } else {
      groups.set(key, { t: r.temperature, h: r.humidity, c: r.co2, n: 1, first: r.recordedAt });
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, v]) => ({
      bucketStart: v.first,
      temperature: v.t / v.n,
      humidity: v.h / v.n,
      co2: v.c / v.n,
      count: v.n,
    }));
}

export async function getLatest(batchId: string): Promise<TelemetryReading | null> {
  const res = await fetch(`${TELEMETRY_BASE}/${batchId}/latest`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Telemetry latest failed: ${res.status}`);
  return normalize(await res.json());
}

export async function getRecent(batchId: string, limit = 100): Promise<TelemetryReading[]> {
  const res = await fetch(`${TELEMETRY_BASE}/${batchId}/recent?limit=${limit}`, { cache: "no-store" });
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
  const res = await fetch(`${TELEMETRY_BASE}/${batchId}/range?${params}`, { cache: "no-store" });
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

export const STATUS_COLORS: Record<ReadingStatus, { bg: string; text: string; ring: string; hex: string }> = {
  OK: { bg: "bg-green-100", text: "text-green-700", ring: "ring-green-200", hex: "#22c55e" },
  WARN: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200", hex: "#f59e0b" },
  CRITICAL: { bg: "bg-red-100", text: "text-red-700", ring: "ring-red-200", hex: "#ef4444" },
};
