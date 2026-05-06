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

function normalize(raw: RawReading): TelemetryReading {
  return {
    id: raw.id,
    idCropBatch: raw.idCropBatch,
    recordedAt: raw.recordedAt,
    temperature: toNumber(raw.temperature),
    humidity: toNumber(raw.humidity),
    co2: toNumber(raw.co2),
  };
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
