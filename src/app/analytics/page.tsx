"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Thermometer, Droplets, Wind, Download, Filter, AlertCircle, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import {
  TelemetryReading,
  SpeciesThresholds,
  classifyReading,
  STATUS_COLORS,
  ReadingStatus,
  getRange,
  aggregateReadings,
  formatReadingDate,
  formatReadingDateTime,
  BucketGranularity,
  DISPLAY_TZ,
} from "@/lib/telemetry";

interface CropBatch {
  id: string;
  idSpecies: string | null;
  status: string;
  startDate: string;
}

interface Species extends SpeciesThresholds {
  idSpecies: string;
  name: string;
}

const BATCHES_API = `${process.env.NEXT_PUBLIC_API_URL}/batches`;
const SPECIES_API = `${process.env.NEXT_PUBLIC_API_URL}/species`;

type RangePreset = "24h" | "7d" | "30d";

const RANGE_LABEL: Record<RangePreset, string> = {
  "24h": "Últimas 24 horas",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
};

function presetToFromTo(preset: RangePreset): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  if (preset === "24h") from.setHours(from.getHours() - 24);
  if (preset === "7d") from.setDate(from.getDate() - 7);
  if (preset === "30d") from.setDate(from.getDate() - 30);
  return { from, to };
}

function granularityFor(preset: RangePreset): BucketGranularity {
  if (preset === "24h") return "hour";
  return "day";
}

function fmtBucketLabel(iso: string, preset: RangePreset): string {
  if (preset === "24h") {
    return new Date(iso).toLocaleTimeString("es-CO", { timeZone: DISPLAY_TZ, hour: "2-digit", minute: "2-digit" });
  }
  return formatReadingDate(iso);
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

interface Anomaly {
  recordedAt: string;
  variable: "temperature" | "humidity" | "co2";
  value: number;
  status: ReadingStatus;
}

function detectAnomalies(readings: TelemetryReading[], species: Species): Anomaly[] {
  const out: Anomaly[] = [];
  for (const r of readings) {
    const c = classifyReading(r, species);
    if (c.tempStatus === "CRITICAL") out.push({ recordedAt: r.recordedAt, variable: "temperature", value: r.temperature, status: c.tempStatus });
    if (c.humStatus === "CRITICAL") out.push({ recordedAt: r.recordedAt, variable: "humidity", value: r.humidity, status: c.humStatus });
    if (c.co2Status === "CRITICAL") out.push({ recordedAt: r.recordedAt, variable: "co2", value: r.co2, status: c.co2Status });
  }
  return out;
}

function downloadCsv(filename: string, readings: TelemetryReading[]) {
  const header = "recordedAt,temperature,humidity,co2\n";
  const rows = readings
    .map((r) => `${r.recordedAt},${r.temperature},${r.humidity},${r.co2}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const [batches, setBatches] = useState<CropBatch[]>([]);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [pendingPreset, setPendingPreset] = useState<RangePreset>("7d");
  const [appliedPreset, setAppliedPreset] = useState<RangePreset>("7d");

  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [batchesRes, speciesRes] = await Promise.all([fetch(BATCHES_API), fetch(SPECIES_API)]);
        if (batchesRes.ok) {
          const data: CropBatch[] = await batchesRes.json();
          setBatches(data);
          if (data.length > 0) setSelectedBatchId(data[0].id);
        }
        if (speciesRes.ok) setSpeciesList(await speciesRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando lotes");
      }
    })();
  }, []);

  const fetchData = useCallback(async (batchId: string, preset: RangePreset) => {
    if (!batchId) return;
    setLoading(true);
    setError(null);
    try {
      const { from, to } = presetToFromTo(preset);
      const data = await getRange(batchId, from, to);
      setReadings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando telemetría");
      setReadings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBatchId) fetchData(selectedBatchId, appliedPreset);
  }, [selectedBatchId, appliedPreset, fetchData]);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;
  const species = selectedBatch?.idSpecies
    ? speciesList.find((s) => s.idSpecies === selectedBatch.idSpecies) ?? null
    : null;

  const chartData = useMemo(() => {
    const buckets = aggregateReadings(readings, granularityFor(appliedPreset));
    return buckets.map((b) => ({
      tsLabel: fmtBucketLabel(b.bucketStart, appliedPreset),
      tsTooltip: formatReadingDateTime(b.bucketStart),
      temperature: b.temperature,
      humidity: b.humidity,
      co2: b.co2,
      count: b.count,
    }));
  }, [readings, appliedPreset]);

  const averages = useMemo(() => ({
    temperature: avg(readings.map((r) => r.temperature)),
    humidity: avg(readings.map((r) => r.humidity)),
    co2: avg(readings.map((r) => r.co2)),
  }), [readings]);

  const anomalies = useMemo(() => (species ? detectAnomalies(readings, species) : []), [readings, species]);

  return (
    <div className="p-8 text-slate-800 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Analítica Histórica</h1>
        <p className="text-slate-500 font-medium">Monitoreo profundo de variables climáticas y de suelo</p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="flex flex-1 flex-wrap gap-6 w-full">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-bold text-slate-500 mb-2 tracking-widest uppercase">Seleccionar Lote</label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 hover:border-slate-300 transition-colors cursor-pointer bg-white"
            >
              {batches.length === 0 && <option value="">Sin lotes disponibles</option>}
              {batches.map((b) => {
                const sp = speciesList.find((s) => s.idSpecies === b.idSpecies);
                return (
                  <option key={b.id} value={b.id}>
                    Lote {b.id.substring(0, 6).toUpperCase()} — {sp?.name ?? "sin especie"}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-bold text-slate-500 mb-2 tracking-widest uppercase">Rango de Fechas</label>
            <select
              value={pendingPreset}
              onChange={(e) => setPendingPreset(e.target.value as RangePreset)}
              className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 hover:border-slate-300 transition-colors cursor-pointer bg-white"
            >
              {(Object.keys(RANGE_LABEL) as RangePreset[]).map((p) => (
                <option key={p} value={p}>{RANGE_LABEL[p]}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => setAppliedPreset(pendingPreset)}
          className="bg-[#1e5631] hover:bg-[#153f23] text-white font-bold py-3 px-8 rounded-xl transition-all shadow-sm flex items-center active:scale-95 text-sm whitespace-nowrap"
        >
          <Filter size={16} className="mr-2" />
          Aplicar Filtros
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center text-sm text-red-700">
          <AlertCircle size={16} className="mr-2" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChartCard
            title="Tendencia de Temperatura"
            unit="°C"
            color="#f97316"
            dataKey="temperature"
            data={chartData}
            average={averages.temperature}
            band={species ? { min: species.minTemperature, max: species.maxTemperature } : null}
            loading={loading}
          />
          <ChartCard
            title="Tendencia de Humedad"
            unit="%"
            color="#3b82f6"
            dataKey="humidity"
            data={chartData}
            average={averages.humidity}
            band={species ? { min: species.minHumidity, max: species.maxHumidity } : null}
            loading={loading}
          />
          <ChartCard
            title="Tendencia de CO₂"
            unit="ppm"
            color="#16a34a"
            dataKey="co2"
            data={chartData}
            average={averages.co2}
            band={species ? { min: species.minCo2, max: species.maxCo2 } : null}
            loading={loading}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-slate-800 font-bold mb-4 text-lg">Promedios del Periodo</h3>
            <div className="space-y-5">
              <AvgRow icon={Thermometer} color="text-orange-500" label="Temperatura" value={averages.temperature} unit="°C" />
              <AvgRow icon={Droplets} color="text-blue-500" label="Humedad" value={averages.humidity} unit="%" />
              <AvgRow icon={Wind} color="text-green-500" label="CO₂" value={averages.co2} unit="ppm" />
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center"><TrendingUp size={12} className="mr-1.5" /> {readings.length} lecturas</span>
              <span>{RANGE_LABEL[appliedPreset]}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-slate-800 font-bold mb-3 text-lg">Reporte de Desvíos</h3>
            {!species ? (
              <p className="text-slate-500 text-sm">Asigna una especie al lote para detectar desvíos.</p>
            ) : anomalies.length === 0 ? (
              <p className="text-slate-500 text-sm">Sin lecturas fuera de rango en el periodo. ✓</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {anomalies.slice(0, 50).map((a, i) => (
                  <li key={i} className="flex items-start text-xs">
                    <span className={`inline-flex px-1.5 py-0.5 rounded ${STATUS_COLORS[a.status].bg} ${STATUS_COLORS[a.status].text} font-bold mr-2 flex-shrink-0`}>
                      {a.variable === "temperature" ? "TEMP" : a.variable === "humidity" ? "HUM" : "CO2"}
                    </span>
                    <span className="text-slate-700">
                      <span className="font-semibold">{a.value.toFixed(1)}</span>
                      <span className="text-slate-400"> · {formatReadingDateTime(a.recordedAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {anomalies.length > 50 && (
              <p className="text-[11px] text-slate-400 mt-3 italic">Mostrando los primeros 50 de {anomalies.length}.</p>
            )}
          </div>

          <button
            onClick={() => downloadCsv(`telemetria-${selectedBatchId.substring(0, 6)}-${appliedPreset}.csv`, readings)}
            disabled={readings.length === 0}
            className="w-full py-3 border-2 border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} className="mr-2" />
            Descargar CSV
          </button>
        </div>
      </div>
    </div>
  );
}

function AvgRow({ icon: Icon, color, label, value, unit }: {
  icon: typeof Thermometer; color: string; label: string; value: number | null; unit: string;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex items-center text-slate-500 font-medium">
        <Icon size={16} className={`${color} mr-3`} />
        {label}
      </div>
      <span className="font-extrabold text-slate-900">
        {value !== null ? `${value.toFixed(1)} ${unit}` : "—"}
      </span>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  unit: string;
  color: string;
  dataKey: "temperature" | "humidity" | "co2";
  data: Array<{ tsLabel: string; tsTooltip: string; temperature: number; humidity: number; co2: number; count: number }>;
  average: number | null;
  band: { min: number; max: number } | null;
  loading: boolean;
}

function ChartCard({ title, unit, color, dataKey, data, average, band, loading }: ChartCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-slate-800 font-bold">{title}</h3>
          <div className="flex items-baseline mt-1">
            <span className="text-3xl font-extrabold text-slate-900 mr-2">
              {average !== null ? `${average.toFixed(1)}${unit}` : "—"}
            </span>
            <span className="text-slate-400 text-xs font-semibold">promedio</span>
          </div>
        </div>
        {band && (
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rango Óptimo</p>
            <p className="text-xs font-semibold text-slate-600">{band.min} – {band.max} {unit}</p>
          </div>
        )}
      </div>
      <div className="w-full h-56">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">Cargando…</div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos en el periodo</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="tsLabel" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} unit={unit} />
              {band && (
                <ReferenceArea
                  y1={band.min}
                  y2={band.max}
                  fill="#22c55e"
                  fillOpacity={0.07}
                  stroke="#22c55e"
                  strokeOpacity={0.25}
                  strokeDasharray="3 3"
                />
              )}
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                labelStyle={{ color: "#475569", fontWeight: 600 }}
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload as { tsTooltip?: string; count?: number } | undefined;
                  if (!item) return "";
                  const suffix = item.count && item.count > 1 ? ` · ${item.count} lecturas` : "";
                  return (item.tsTooltip ?? "") + suffix;
                }}
                formatter={(value) => {
                  const num = typeof value === "number" ? value : parseFloat(String(value));
                  return [`${num.toFixed(2)} ${unit}`, title];
                }}
              />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
