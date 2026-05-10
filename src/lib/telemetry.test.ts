import { describe, it, expect } from "vitest";
import {
  normalizeRecordedAt,
  aggregateReadings,
  classifyReading,
  TelemetryReading,
} from "./telemetry";

describe("normalizeRecordedAt", () => {
  it("appends Z when there is no timezone marker", () => {
    expect(normalizeRecordedAt("2026-05-06T23:20:00")).toBe("2026-05-06T23:20:00Z");
    expect(normalizeRecordedAt("2026-05-06T23:20:00.123456")).toBe("2026-05-06T23:20:00.123456Z");
  });

  it("leaves the string alone when Z is already present", () => {
    expect(normalizeRecordedAt("2026-05-06T23:20:00Z")).toBe("2026-05-06T23:20:00Z");
    expect(normalizeRecordedAt("2026-05-06T23:20:00.123Z")).toBe("2026-05-06T23:20:00.123Z");
  });

  it("leaves the string alone when an offset is already present", () => {
    expect(normalizeRecordedAt("2026-05-06T23:20:00+00:00")).toBe("2026-05-06T23:20:00+00:00");
    expect(normalizeRecordedAt("2026-05-06T18:20:00-05:00")).toBe("2026-05-06T18:20:00-05:00");
    expect(normalizeRecordedAt("2026-05-06T18:20:00-0500")).toBe("2026-05-06T18:20:00-0500");
  });

  it("normalized timestamp parses to the expected UTC instant", () => {
    // 2026-05-06T23:20:00Z is the same as 2026-05-06T18:20:00 in Colombia (UTC-5).
    const d = new Date(normalizeRecordedAt("2026-05-06T23:20:00"));
    const colombian = d.toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    expect(colombian).toBe("18:20");
  });
});

// Helper to build a fake reading.
function reading(iso: string, t = 0, h = 0, c = 0): TelemetryReading {
  return { id: 0, idCropBatch: "x", recordedAt: iso, temperature: t, humidity: h, co2: c };
}

describe("aggregateReadings", () => {
  it("raw granularity returns one bucket per reading, preserved order", () => {
    const r1 = reading("2026-05-10T20:00:00Z", 5);
    const r2 = reading("2026-05-10T20:00:05Z", 6);
    const out = aggregateReadings([r1, r2], "raw");
    expect(out).toHaveLength(2);
    expect(out[0].bucketStart).toBe("2026-05-10T20:00:00Z");
    expect(out[1].bucketStart).toBe("2026-05-10T20:00:05Z");
    expect(out[0].count).toBe(1);
  });

  it("hour granularity groups readings of the same Colombian hour and averages them", () => {
    // 23:00 UTC = 18:00 Colombia. Both readings should fall in the 18:00 Colombia bucket.
    const r1 = reading("2026-05-10T23:00:00Z", 4, 60, 800);
    const r2 = reading("2026-05-10T23:15:00Z", 6, 70, 1000);
    const r3 = reading("2026-05-10T23:45:00Z", 8, 80, 1200);
    const out = aggregateReadings([r1, r2, r3], "hour");
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(3);
    expect(out[0].temperature).toBeCloseTo(6, 5);
    expect(out[0].humidity).toBeCloseTo(70, 5);
    expect(out[0].co2).toBeCloseTo(1000, 5);
    // Bucket start = 18:00 Colombia = 23:00 UTC.
    expect(out[0].bucketStart).toBe("2026-05-10T23:00:00.000Z");
  });

  it("hour granularity splits readings across different hours and sorts ASC", () => {
    // 22:30 UTC = 17:30 Colombia (hour 17), 23:30 UTC = 18:30 Colombia (hour 18).
    const r1 = reading("2026-05-10T22:30:00Z", 5);
    const r2 = reading("2026-05-10T23:30:00Z", 10);
    const out = aggregateReadings([r2, r1], "hour");
    expect(out).toHaveLength(2);
    expect(out[0].bucketStart).toBe("2026-05-10T22:00:00.000Z");
    expect(out[0].temperature).toBe(5);
    expect(out[1].bucketStart).toBe("2026-05-10T23:00:00.000Z");
    expect(out[1].temperature).toBe(10);
  });

  it("day granularity respects Colombian midnight boundary", () => {
    // 04:00 UTC May 11 = 23:00 Colombia May 10. 05:30 UTC May 11 = 00:30 Colombia May 11.
    // So these two readings belong to different Colombian days.
    const r1 = reading("2026-05-11T04:00:00Z", 5);
    const r2 = reading("2026-05-11T05:30:00Z", 10);
    const out = aggregateReadings([r1, r2], "day");
    expect(out).toHaveLength(2);
    // Day "May 10 Colombia" starts at 05:00 UTC May 10.
    expect(out[0].bucketStart).toBe("2026-05-10T05:00:00.000Z");
    expect(out[0].temperature).toBe(5);
    // Day "May 11 Colombia" starts at 05:00 UTC May 11.
    expect(out[1].bucketStart).toBe("2026-05-11T05:00:00.000Z");
    expect(out[1].temperature).toBe(10);
  });

  it("day granularity groups many readings of a single Colombian day", () => {
    // All UTC May 10 in [05:00, 28:59] would be Colombian May 10 [00:00, 23:59].
    const readings = [
      reading("2026-05-10T05:00:00Z", 4),
      reading("2026-05-10T12:00:00Z", 6),
      reading("2026-05-10T23:00:00Z", 8),
      reading("2026-05-11T04:59:59Z", 10),
    ];
    const out = aggregateReadings(readings, "day");
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(4);
    expect(out[0].temperature).toBe(7);
    expect(out[0].bucketStart).toBe("2026-05-10T05:00:00.000Z");
  });

  it("returns an empty array for empty input", () => {
    expect(aggregateReadings([], "hour")).toEqual([]);
    expect(aggregateReadings([], "day")).toEqual([]);
    expect(aggregateReadings([], "raw")).toEqual([]);
  });
});

describe("classifyReading", () => {
  const thresholds = {
    minTemperature: 10, maxTemperature: 30,
    minHumidity: 40, maxHumidity: 80,
    minCo2: 400, maxCo2: 1200,
  };

  it("returns OK when all variables are well inside the range", () => {
    const c = classifyReading({ temperature: 20, humidity: 60, co2: 800 }, thresholds);
    expect(c.tempStatus).toBe("OK");
    expect(c.humStatus).toBe("OK");
    expect(c.co2Status).toBe("OK");
    expect(c.worstStatus).toBe("OK");
  });

  it("returns CRITICAL when a variable is outside the range", () => {
    const c = classifyReading({ temperature: 35, humidity: 60, co2: 800 }, thresholds);
    expect(c.tempStatus).toBe("CRITICAL");
    expect(c.worstStatus).toBe("CRITICAL");
  });

  it("returns WARN near the band edges (within the 10% margin)", () => {
    // Range is 20 wide, 10% margin = 2. So 11 (=10+1) is WARN, 28 (=30-2) is WARN.
    const c = classifyReading({ temperature: 11, humidity: 60, co2: 800 }, thresholds);
    expect(c.tempStatus).toBe("WARN");
    expect(c.worstStatus).toBe("WARN");
  });

  it("worstStatus escalates CRITICAL > WARN > OK", () => {
    const c = classifyReading({ temperature: 11, humidity: 100, co2: 800 }, thresholds);
    expect(c.tempStatus).toBe("WARN");
    expect(c.humStatus).toBe("CRITICAL");
    expect(c.worstStatus).toBe("CRITICAL");
  });
});
