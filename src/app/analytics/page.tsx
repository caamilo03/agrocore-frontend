"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Thermometer, Droplets, Wind, Download, Filter, AlertCircle, TrendingUp, Activity, CheckCircle2, Leaf, Package, Building2, Scale, Calendar } from "lucide-react";
import {
  ComposedChart,
  Area,
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
  diagnoseCoverage,
  CoverageStatus,
} from "@/lib/telemetry";

interface CropBatch {
  id: string;
  idSpecies: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  yieldKg: number;
}

interface Species extends SpeciesThresholds {
  idSpecies: string;
  name: string;
}

interface SubstrateRef { idSubstrate: string; typeName: string; description?: string }
interface SupplierRef { idSupplier: string; nameSupplier: string; contactInfo?: string }

interface TelemetryStats {
  count: number;
  avgTemperature: number; minTemperature: number; maxTemperature: number; temperatureInRangePct: number;
  avgHumidity: number;    minHumidity: number;    maxHumidity: number;    humidityInRangePct: number;
  avgCo2: number;         minCo2: number;         maxCo2: number;         co2InRangePct: number;
}

interface Traceability {
  batch: CropBatch;
  species: Species | null;
  substrate: SubstrateRef | null;
  speciesSupplier: SupplierRef | null;
  substrateSupplier: SupplierRef | null;
  telemetryStats: TelemetryStats | null;
}

type StatusFilter = "ACTIVO" | "COSECHADO";

const BATCHES_API = "/batches";
const SPECIES_API = "/species";

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

function granularityForCycle(from: Date, to: Date): BucketGranularity {
  const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 2) return "hour";
  return "day";
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVO");
  const [batches, setBatches] = useState<CropBatch[]>([]);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [pendingPreset, setPendingPreset] = useState<RangePreset>("7d");
  const [appliedPreset, setAppliedPreset] = useState<RangePreset>("7d");

  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<CoverageStatus>({ kind: "ok" });

  const [traceability, setTraceability] = useState<Traceability | null>(null);
  const [traceabilityLoading, setTraceabilityLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const speciesRes = await apiFetch(SPECIES_API);
        if (speciesRes.ok) setSpeciesList(await speciesRes.json());
      } catch {
        // species fetch failure is non-fatal
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`${BATCHES_API}?status=${statusFilter}`);
        if (!res.ok) throw new Error(`Error cargando lotes (${res.status})`);
        const data: CropBatch[] = await res.json();
        if (cancelled) return;
        setBatches(data);
        setSelectedBatchId(data.length > 0 ? data[0].id : "");
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error cargando lotes");
      }
    })();
    return () => { cancelled = true; };
  }, [statusFilter]);

  const fetchActiveData = useCallback(async (batchId: string, preset: RangePreset) => {
    if (!batchId) return;
    setLoading(true);
    setError(null);
    try {
      const { from, to } = presetToFromTo(preset);
      const data = await getRange(batchId, from, to);
      setReadings(data);
      setCoverage(diagnoseCoverage(data, from));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando telemetría");
      setReadings([]);
      setCoverage({ kind: "ok" });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHarvestedData = useCallback(async (batch: CropBatch) => {
    setLoading(true);
    setTraceabilityLoading(true);
    setError(null);
    try {
      const traceRes = await apiFetch(`${BATCHES_API}/${batch.id}/traceability`);
      if (!traceRes.ok) throw new Error(`Error trazabilidad (${traceRes.status})`);
      const trace: Traceability = await traceRes.json();
      setTraceability(trace);

      const from = new Date(batch.startDate);
      const to = batch.endDate ? new Date(batch.endDate) : new Date();
      const data = await getRange(batch.id, from, to);
      setReadings(data);
      setCoverage({ kind: "ok" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando lote cosechado");
      setReadings([]);
      setTraceability(null);
    } finally {
      setLoading(false);
      setTraceabilityLoading(false);
    }
  }, []);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;

  useEffect(() => {
    if (!selectedBatchId || !selectedBatch) {
      setReadings([]);
      setTraceability(null);
      return;
    }
    if (statusFilter === "ACTIVO") {
      setTraceability(null);
      fetchActiveData(selectedBatchId, appliedPreset);
    } else {
      fetchHarvestedData(selectedBatch);
    }
  }, [selectedBatchId, selectedBatch, statusFilter, appliedPreset, fetchActiveData, fetchHarvestedData]);

  const species = selectedBatch?.idSpecies
    ? speciesList.find((s) => s.idSpecies === selectedBatch.idSpecies) ?? null
    : null;
  const isHarvested = statusFilter === "COSECHADO";

  const chartData = useMemo(() => {
    let granularity: BucketGranularity;
    if (isHarvested && selectedBatch) {
      const from = new Date(selectedBatch.startDate);
      const to = selectedBatch.endDate ? new Date(selectedBatch.endDate) : new Date();
      granularity = granularityForCycle(from, to);
    } else {
      granularity = granularityFor(appliedPreset);
    }
    const buckets = aggregateReadings(readings, granularity);
    return buckets.map((b) => ({
      tsLabel: granularity === "hour"
        ? new Date(b.bucketStart).toLocaleTimeString("es-CO", { timeZone: DISPLAY_TZ, hour12: false, hour: "2-digit", minute: "2-digit" })
        : formatReadingDate(b.bucketStart),
      tsTooltip: formatReadingDateTime(b.bucketStart),
      temperature: b.temperature,
      humidity: b.humidity,
      co2: b.co2,
      count: b.count,
    }));
  }, [readings, appliedPreset, isHarvested, selectedBatch]);

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

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        {(["ACTIVO", "COSECHADO"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-md transition-colors ${
              statusFilter === s ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {s === "ACTIVO" ? <><Activity size={12} className="mr-2" /> Lotes activos</> : <><CheckCircle2 size={12} className="mr-2" /> Lotes cosechados</>}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="flex flex-1 flex-wrap gap-6 w-full">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-bold text-slate-500 mb-2 tracking-widest uppercase">Seleccionar Lote</label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 hover:border-slate-300 transition-colors cursor-pointer bg-white"
            >
              {batches.length === 0 && <option value="">Sin lotes {isHarvested ? "cosechados" : "activos"}</option>}
              {batches.map((b) => {
                const sp = speciesList.find((s) => s.idSpecies === b.idSpecies);
                const yieldLabel = isHarvested && b.yieldKg != null ? ` · ${b.yieldKg.toFixed(1)} kg` : "";
                return (
                  <option key={b.id} value={b.id}>
                    Lote {b.id.substring(0, 6).toUpperCase()} — {sp?.name ?? "sin especie"}{yieldLabel}
                  </option>
                );
              })}
            </select>
          </div>
          {!isHarvested ? (
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
          ) : selectedBatch && (
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-bold text-slate-500 mb-2 tracking-widest uppercase">Ciclo del Lote</label>
              <div className="border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-700 bg-slate-50 inline-flex items-center w-full">
                <Calendar size={14} className="mr-2 text-slate-400" />
                {new Date(selectedBatch.startDate).toLocaleDateString("es-CO")}
                <span className="mx-2 text-slate-400">→</span>
                {selectedBatch.endDate ? new Date(selectedBatch.endDate).toLocaleDateString("es-CO") : "—"}
              </div>
            </div>
          )}
        </div>
        {!isHarvested && (
          <button
            onClick={() => setAppliedPreset(pendingPreset)}
            className="bg-[#1e5631] hover:bg-[#153f23] text-white font-bold py-3 px-8 rounded-xl transition-all shadow-sm flex items-center active:scale-95 text-sm whitespace-nowrap"
          >
            <Filter size={16} className="mr-2" />
            Aplicar Filtros
          </button>
        )}
      </div>

      {isHarvested && traceability && (
        <TraceabilityCard trace={traceability} loading={traceabilityLoading} />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center text-sm text-red-700">
          <AlertCircle size={16} className="mr-2" /> {error}
        </div>
      )}

      {!loading && coverage.kind === "insufficient-history" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start text-sm text-blue-800">
          <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>
            Sólo hay datos disponibles desde el <strong>{formatReadingDateTime(coverage.earliest)}</strong>. El rango completo estará disponible cuando haya suficiente histórico.
          </span>
        </div>
      )}

      {!loading && coverage.kind === "cap" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start text-sm text-amber-800">
          <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>
            Datos parciales: se alcanzó el límite de <strong>{coverage.limit} puntos</strong> del endpoint <code className="font-mono">/range</code>. Considera reducir el rango.
          </span>
        </div>
      )}

      {isHarvested && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start text-sm text-blue-800">
          <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0 text-blue-500" />
          <span>
            <strong>Visualización histórica · solo lectura.</strong>{" "}
            Estas gráficas reflejan las condiciones registradas durante el ciclo cerrado del lote. No se actualizan en tiempo real.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChartCard
            title={isHarvested ? "Tendencia histórica de Temperatura" : "Tendencia de Temperatura"}
            unit="°C"
            color="#f97316"
            dataKey="temperature"
            data={chartData}
            average={averages.temperature}
            band={species ? { min: species.minTemperature, max: species.maxTemperature } : null}
            loading={loading}
          />
          <ChartCard
            title={isHarvested ? "Tendencia histórica de Humedad" : "Tendencia de Humedad"}
            unit="%"
            color="#3b82f6"
            dataKey="humidity"
            data={chartData}
            average={averages.humidity}
            band={species ? { min: species.minHumidity, max: species.maxHumidity } : null}
            loading={loading}
          />
          <ChartCard
            title={isHarvested ? "Tendencia histórica de CO₂" : "Tendencia de CO₂"}
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
            <h3 className="text-slate-800 font-bold mb-4 text-lg">Promedios del Periodo</h3>
            <div className="space-y-5">
              <AvgRow icon={Thermometer} color="text-orange-500" label="Temperatura" value={averages.temperature} unit="°C" />
              <AvgRow icon={Droplets} color="text-blue-500" label="Humedad" value={averages.humidity} unit="%" />
              <AvgRow icon={Wind} color="text-green-500" label="CO₂" value={averages.co2} unit="ppm" />
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center"><TrendingUp size={12} className="mr-1.5" /> {readings.length} lecturas</span>
              <span>{isHarvested ? "Ciclo completo" : RANGE_LABEL[appliedPreset]}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
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

function TraceabilityCard({ trace, loading }: { trace: Traceability; loading: boolean }) {
  const { batch, species, substrate, speciesSupplier, substrateSupplier, telemetryStats } = trace;
  const startStr = new Date(batch.startDate).toLocaleDateString("es-CO");
  const endStr = batch.endDate ? new Date(batch.endDate).toLocaleDateString("es-CO") : "—";
  const cycleDays = batch.endDate
    ? Math.max(1, Math.round((new Date(batch.endDate).getTime() - new Date(batch.startDate).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 inline-flex items-center">
            <CheckCircle2 size={18} className="mr-2 text-blue-600" />
            Trazabilidad del lote {batch.id.substring(0, 6).toUpperCase()}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ciclo {startStr} → {endStr}{cycleDays !== null && <> · {cycleDays} {cycleDays === 1 ? "día" : "días"}</>}
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase bg-blue-100 text-blue-700">
          <CheckCircle2 size={12} className="mr-1.5" /> Cosechado
        </span>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Cargando trazabilidad…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pb-5 border-b border-slate-100">
            <TraceItem icon={Leaf} color="green" label="Especie" value={species?.name ?? "—"} />
            <TraceItem icon={Package} color="amber" label="Sustrato" value={substrate?.typeName ?? "—"} />
            <TraceItem icon={Building2} color="indigo" label="Proveedor de semilla" value={speciesSupplier?.nameSupplier ?? "—"} />
            <TraceItem icon={Building2} color="indigo" label="Proveedor de sustrato" value={substrateSupplier?.nameSupplier ?? "—"} />
            <TraceItem icon={Scale} color="emerald" label="Peso cosechado" value={batch.yieldKg != null ? `${batch.yieldKg.toFixed(2)} kg` : "—"} highlight />
          </div>

          {telemetryStats ? (
            <div className="pt-5">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                Resumen de condiciones · {telemetryStats.count.toLocaleString("es-CO")} lecturas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ConditionCard
                  icon={Thermometer} color="#f97316" label="Temperatura" unit="°C"
                  avg={telemetryStats.avgTemperature} min={telemetryStats.minTemperature} max={telemetryStats.maxTemperature}
                  inRangePct={telemetryStats.temperatureInRangePct}
                />
                <ConditionCard
                  icon={Droplets} color="#3b82f6" label="Humedad" unit="%"
                  avg={telemetryStats.avgHumidity} min={telemetryStats.minHumidity} max={telemetryStats.maxHumidity}
                  inRangePct={telemetryStats.humidityInRangePct}
                />
                <ConditionCard
                  icon={Wind} color="#16a34a" label="CO₂" unit="ppm"
                  avg={telemetryStats.avgCo2} min={telemetryStats.minCo2} max={telemetryStats.maxCo2}
                  inRangePct={telemetryStats.co2InRangePct}
                />
              </div>
            </div>
          ) : (
            <div className="pt-5 text-sm text-slate-500 inline-flex items-center">
              <AlertCircle size={14} className="mr-2 text-slate-400" />
              Sin estadísticas de telemetría disponibles para este ciclo.
            </div>
          )}
        </>
      )}
    </div>
  );
}

const TRACE_ICON_BG: Record<string, string> = {
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

function TraceItem({ icon: Icon, color, label, value, highlight }: {
  icon: typeof Leaf; color: string; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="flex items-start">
      <div className={`w-9 h-9 rounded flex items-center justify-center mr-3 flex-shrink-0 ${TRACE_ICON_BG[color] ?? "bg-slate-50 text-slate-600"}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-semibold truncate ${highlight ? "text-emerald-700 tabular-nums" : "text-slate-800"}`} title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ConditionCard({ icon: Icon, color, label, unit, avg, min, max, inRangePct }: {
  icon: typeof Thermometer; color: string; label: string; unit: string;
  avg: number; min: number; max: number; inRangePct: number;
}) {
  const pct = Math.max(0, Math.min(100, inRangePct));
  const barColor = pct >= 80 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const badgeBg = pct >= 80 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2.5" style={{ backgroundColor: `${color}15` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-sm font-bold text-slate-700">{label}</span>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase tabular-nums ${badgeBg}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mín</p>
          <p className="text-sm font-bold text-slate-800 tabular-nums">{min.toFixed(1)}<span className="text-slate-400 font-medium ml-0.5">{unit}</span></p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prom</p>
          <p className="text-base font-extrabold text-slate-900 tabular-nums">{avg.toFixed(1)}<span className="text-slate-400 font-medium ml-0.5 text-sm">{unit}</span></p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Máx</p>
          <p className="text-sm font-bold text-slate-800 tabular-nums">{max.toFixed(1)}<span className="text-slate-400 font-medium ml-0.5">{unit}</span></p>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
          <span>Tiempo en rango óptimo</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
      </div>
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
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
          <ResponsiveContainer width="100%" height="100%" minHeight={1}>
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`chartFillGradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="tsLabel" tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }} tickMargin={8} axisLine={false} tickLine={false} minTickGap={40} />
              <YAxis tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} unit={` ${unit}`} />
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
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
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
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="none"
                fill={`url(#chartFillGradient-${dataKey})`}
                fillOpacity={1}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2.5}
                dot={data.length <= 30 ? { r: 3, fill: color, strokeWidth: 0 } : false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
