"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  Calendar,
  Leaf,
  Package,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Scale,
  X,
} from "lucide-react";
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
  formatReadingTime,
  formatReadingDate,
  formatReadingDateTime,
  BucketGranularity,
  diagnoseCoverage,
  CoverageStatus,
} from "@/lib/telemetry";
import { useLiveTelemetry } from "@/lib/useLiveTelemetry";

interface CropBatch {
  id: string;
  idSpecies: string | null;
  idSubstrate: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  yieldKg: number;
}

interface Species extends SpeciesThresholds {
  idSpecies: string;
  name: string;
}

interface Substrate {
  idSubstrate: string;
  typeName: string;
}

const BATCHES_API = `${process.env.NEXT_PUBLIC_API_URL}/batches`;
const SPECIES_API = `${process.env.NEXT_PUBLIC_API_URL}/species`;
const SUBSTRATES_API = `${process.env.NEXT_PUBLIC_API_URL}/substrates`;

type Variable = "temperature" | "humidity" | "co2";
type RangePreset = "live" | "24h" | "7d" | "30d";

const VARIABLE_META: Record<Variable, { label: string; unit: string; color: string; icon: typeof Thermometer }> = {
  temperature: { label: "Temperatura", unit: "°C", color: "#f97316", icon: Thermometer },
  humidity: { label: "Humedad", unit: "%", color: "#3b82f6", icon: Droplets },
  co2: { label: "CO₂", unit: "ppm", color: "#16a34a", icon: Wind },
};

function thresholdsFor(variable: Variable, species: Species): { min: number; max: number } {
  switch (variable) {
    case "temperature": return { min: species.minTemperature, max: species.maxTemperature };
    case "humidity": return { min: species.minHumidity, max: species.maxHumidity };
    case "co2": return { min: species.minCo2, max: species.maxCo2 };
  }
}

function granularityFor(preset: RangePreset): BucketGranularity {
  if (preset === "live") return "raw";
  if (preset === "24h") return "hour";
  return "day";
}

function labelFor(iso: string, preset: RangePreset, compact = false): string {
  if (preset === "live") {
    return compact
      ? new Date(iso).toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour12: false, hour: "2-digit", minute: "2-digit" })
      : formatReadingTime(iso);
  }
  if (preset === "24h") return new Date(iso).toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour12: false, hour: "2-digit", minute: "2-digit" });
  return formatReadingDate(iso);
}

function timeSince(date: Date | null): string {
  if (!date) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  return `hace ${Math.floor(minutes / 60)}h`;
}

export default function BatchDetailClient({ batchId }: { batchId: string }) {
  const [batch, setBatch] = useState<CropBatch | null>(null);
  const [species, setSpecies] = useState<Species | null>(null);
  const [substrate, setSubstrate] = useState<Substrate | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [selectedVariable, setSelectedVariable] = useState<Variable>("temperature");
  const [rangePreset, setRangePreset] = useState<RangePreset>("live");
  const [historical, setHistorical] = useState<TelemetryReading[]>([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [coverage, setCoverage] = useState<CoverageStatus>({ kind: "ok" });

  const [harvestModalOpen, setHarvestModalOpen] = useState(false);
  const [harvestYield, setHarvestYield] = useState("");
  const [harvestEndDate, setHarvestEndDate] = useState("");
  const [harvestLoading, setHarvestLoading] = useState(false);
  const [harvestError, setHarvestError] = useState<string | null>(null);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [batchesRes, speciesRes, substratesRes] = await Promise.all([
        fetch(BATCHES_API),
        fetch(SPECIES_API),
        fetch(SUBSTRATES_API),
      ]);
      if (!batchesRes.ok || !speciesRes.ok) throw new Error("Error cargando metadata");
      const batches: CropBatch[] = await batchesRes.json();
      const speciesList: Species[] = await speciesRes.json();
      const substratesList: Substrate[] = substratesRes.ok ? await substratesRes.json() : [];

      const found = batches.find((b) => b.id === batchId) ?? null;
      setBatch(found);
      if (found?.idSpecies) {
        setSpecies(speciesList.find((s) => s.idSpecies === found.idSpecies) ?? null);
      }
      if (found?.idSubstrate) {
        setSubstrate(substratesList.find((s) => s.idSubstrate === found.idSubstrate) ?? null);
      }
      setMetaError(null);
      return found;
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : "Error desconocido");
      return null;
    } finally {
      setLoadingMeta(false);
    }
  }, [batchId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await loadMeta();
      if (cancelled) return;
      if (found && found.status !== "ACTIVO") setRangePreset("30d");
    })();
    return () => { cancelled = true; };
  }, [loadMeta]);

  const isActive = batch?.status === "ACTIVO";
  const live = useLiveTelemetry(batchId, { intervalMs: 5000, recentLimit: 60, enabled: isActive && rangePreset === "live" });

  const handleHarvest = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setHarvestError(null);
    const yieldNum = parseFloat(harvestYield);
    if (!Number.isFinite(yieldNum) || yieldNum <= 0) {
      setHarvestError("El peso obtenido debe ser un número mayor a 0.");
      return;
    }
    setHarvestLoading(true);
    try {
      const body: { yieldKg: number; endDate?: string } = { yieldKg: yieldNum };
      if (harvestEndDate) {
        const iso = new Date(harvestEndDate).toISOString();
        body.endDate = iso;
      }
      const res = await fetch(`${BATCHES_API}/${batchId}/harvest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({} as { error?: string }));
        if (res.status === 409) {
          setHarvestError(errBody.error ?? "Este lote ya fue cosechado o se perdió.");
        } else if (res.status === 400) {
          setHarvestError(errBody.error ?? "Datos inválidos.");
        } else if (res.status === 404) {
          setHarvestError("Lote no encontrado.");
        } else {
          setHarvestError(`Error inesperado (${res.status}).`);
        }
        return;
      }
      await loadMeta();
      setHarvestModalOpen(false);
      setHarvestYield("");
      setHarvestEndDate("");
      setRangePreset("30d");
    } catch (err) {
      setHarvestError(err instanceof Error ? err.message : "Error de red.");
    } finally {
      setHarvestLoading(false);
    }
  }, [batchId, harvestYield, harvestEndDate, loadMeta]);

  const loadHistorical = useCallback(async (preset: Exclude<RangePreset, "live">) => {
    const to = new Date();
    const from = new Date(to);
    if (preset === "24h") from.setHours(from.getHours() - 24);
    if (preset === "7d") from.setDate(from.getDate() - 7);
    if (preset === "30d") from.setDate(from.getDate() - 30);
    setHistoricalLoading(true);
    try {
      const data = await getRange(batchId, from, to);
      setHistorical(data);
      setCoverage(diagnoseCoverage(data, from));
    } catch {
      setHistorical([]);
      setCoverage({ kind: "ok" });
    } finally {
      setHistoricalLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (rangePreset !== "live") loadHistorical(rangePreset);
  }, [rangePreset, loadHistorical]);

  const series = rangePreset === "live" ? live.recent : historical;
  const chartData = useMemo(() => {
    const buckets = aggregateReadings(series, granularityFor(rangePreset));
    const compact = rangePreset === "live" && buckets.length > 30;
    return buckets.map((b) => ({
      ts: b.bucketStart,
      tsLabel: labelFor(b.bucketStart, rangePreset, compact),
      tsTooltip: rangePreset === "live" ? formatReadingTime(b.bucketStart) : formatReadingDateTime(b.bucketStart),
      temperature: b.temperature,
      humidity: b.humidity,
      co2: b.co2,
      count: b.count,
    }));
  }, [series, rangePreset]);

  const liveStatus = useMemo(() => {
    if (!live.latest || !species) return null;
    return classifyReading(live.latest, species);
  }, [live.latest, species]);

  if (loadingMeta) {
    return (
      <div className="p-8 text-slate-800 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded"></div>
          <div className="h-32 bg-slate-100 rounded-2xl"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-40 bg-slate-100 rounded-2xl"></div>
            <div className="h-40 bg-slate-100 rounded-2xl"></div>
            <div className="h-40 bg-slate-100 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="p-8 text-slate-800 max-w-7xl mx-auto">
        <Link href="/batches" className="text-slate-500 hover:text-slate-700 inline-flex items-center mb-6">
          <ArrowLeft size={16} className="mr-2" /> Volver a Lotes
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <p className="font-bold">Lote no encontrado</p>
          {metaError && <p className="text-sm mt-1">{metaError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 text-slate-800 max-w-7xl mx-auto">
      <Link href="/batches" className="text-slate-500 hover:text-slate-700 inline-flex items-center mb-4 text-sm font-medium">
        <ArrowLeft size={16} className="mr-2" /> Volver a Lotes
      </Link>

      <header className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase ${
                batch.status === "ACTIVO" ? "bg-green-100 text-green-700" :
                batch.status === "COSECHADO" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
              }`}>
                <Activity size={12} className="mr-1.5" />{batch.status}
              </span>
              {liveStatus && rangePreset === "live" && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase ${STATUS_COLORS[liveStatus.worstStatus].bg} ${STATUS_COLORS[liveStatus.worstStatus].text}`}>
                  Telemetría · {liveStatus.worstStatus}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Lote {batch.id.substring(0, 6).toUpperCase()}
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1">
              Telemetría en tiempo real y análisis histórico del ciclo.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isActive ? (
              <>
                <button
                  onClick={() => setHarvestModalOpen(true)}
                  className="inline-flex items-center bg-[#1e5631] hover:bg-[#153f23] text-white font-bold py-2 px-4 rounded-lg transition-all shadow-card active:scale-95 text-sm"
                >
                  <CheckCircle2 size={16} className="mr-2" /> Marcar como cosechado
                </button>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <RefreshCw size={14} className={live.loading ? "animate-spin" : ""} />
                  <span>Última actualización: {timeSince(live.lastUpdatedAt)}</span>
                  <span suppressHydrationWarning className="hidden">{tick}</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500 font-medium text-right">
                <p className="inline-flex items-center"><CheckCircle2 size={14} className="mr-1.5 text-blue-600" /> Lote finalizado</p>
                {batch.endDate && <p className="mt-1">Cierre: {new Date(batch.endDate).toLocaleDateString("es-CO")}</p>}
              </div>
            )}
          </div>
        </div>

        <div className={`grid grid-cols-1 ${batch.status === "COSECHADO" ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4 mt-6 pt-6 border-t border-slate-100`}>
          <div className="flex items-start">
            <div className="w-9 h-9 rounded bg-green-50 flex items-center justify-center mr-3 flex-shrink-0">
              <Leaf size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Especie</p>
              <p className="text-sm font-semibold text-slate-800">{species?.name ?? "Sin asignar"}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-9 h-9 rounded bg-amber-50 flex items-center justify-center mr-3 flex-shrink-0">
              <Package size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sustrato</p>
              <p className="text-sm font-semibold text-slate-800">{substrate?.typeName ?? "Sin asignar"}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-9 h-9 rounded bg-blue-50 flex items-center justify-center mr-3 flex-shrink-0">
              <Calendar size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inicio de Ciclo</p>
              <p className="text-sm font-semibold text-slate-800">{new Date(batch.startDate).toLocaleDateString()}</p>
            </div>
          </div>
          {batch.status === "COSECHADO" && (
            <div className="flex items-start">
              <div className="w-9 h-9 rounded bg-emerald-50 flex items-center justify-center mr-3 flex-shrink-0">
                <Scale size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Peso Cosechado</p>
                <p className="text-sm font-semibold text-slate-800 tabular-nums">{batch.yieldKg.toFixed(2)} kg</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {!species && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start">
          <AlertCircle size={18} className="text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">Especie no asignada</p>
            <p>Sin rangos óptimos no se puede clasificar la telemetría. Asigna una especie en la edición del lote.</p>
          </div>
        </div>
      )}

      {isActive && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <KpiCard variable="temperature" reading={live.latest} status={liveStatus?.tempStatus ?? null} species={species} />
          <KpiCard variable="humidity" reading={live.latest} status={liveStatus?.humStatus ?? null} species={species} />
          <KpiCard variable="co2" reading={live.latest} status={liveStatus?.co2Status ?? null} species={species} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(VARIABLE_META) as Variable[]).map((v) => {
              const Icon = VARIABLE_META[v].icon;
              const active = selectedVariable === v;
              return (
                <button
                  key={v}
                  onClick={() => setSelectedVariable(v)}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                    active ? "bg-[#1e5631] text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {active ? (
                    <Icon size={14} className="mr-2" />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: VARIABLE_META[v].color }}
                      aria-hidden
                    />
                  )}
                  {VARIABLE_META[v].label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(isActive
              ? (["live", "24h", "7d", "30d"] as RangePreset[])
              : (["24h", "7d", "30d"] as RangePreset[])
            ).map((p) => (
              <button
                key={p}
                onClick={() => setRangePreset(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  rangePreset === p ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p === "live" ? "EN VIVO" : p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-80">
          {historicalLoading || (rangePreset === "live" && live.loading && live.recent.length === 0) ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">Cargando datos…</div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                <AlertCircle size={24} className="text-slate-300" />
              </div>
              <p className="font-semibold text-slate-500">Sin lecturas en este rango</p>
              <p className="text-xs text-slate-400 mt-1">Prueba con otro periodo o espera nuevas lecturas.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartFillGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={VARIABLE_META[selectedVariable].color} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={VARIABLE_META[selectedVariable].color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="tsLabel"
                  tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  unit={` ${VARIABLE_META[selectedVariable].unit}`}
                  domain={["auto", "auto"]}
                />
                {species && (
                  <ReferenceArea
                    y1={thresholdsFor(selectedVariable, species).min}
                    y2={thresholdsFor(selectedVariable, species).max}
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
                    return [`${num.toFixed(2)} ${VARIABLE_META[selectedVariable].unit}`, VARIABLE_META[selectedVariable].label];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={selectedVariable}
                  stroke="none"
                  fill="url(#chartFillGradient)"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey={selectedVariable}
                  stroke={VARIABLE_META[selectedVariable].color}
                  strokeWidth={2.5}
                  dot={rangePreset !== "live" && chartData.length <= 30
                    ? { r: 3, fill: VARIABLE_META[selectedVariable].color, strokeWidth: 0 }
                    : false}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {species && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-sm mr-2 border border-green-500" style={{ backgroundColor: "rgba(34,197,94,0.07)" }}></span>
              Rango óptimo de la especie: {thresholdsFor(selectedVariable, species).min} – {thresholdsFor(selectedVariable, species).max} {VARIABLE_META[selectedVariable].unit}
            </div>
            <span className="font-medium">
              {rangePreset === "live"
                ? `${chartData.length} lecturas`
                : `${chartData.length} ${rangePreset === "24h" ? "horas" : "días"} · ${series.length} lecturas`}
            </span>
          </div>
        )}

        {rangePreset !== "live" && !historicalLoading && coverage.kind === "insufficient-history" && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start">
            <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>
              Sólo hay datos disponibles desde el <strong>{formatReadingDateTime(coverage.earliest)}</strong>. El rango completo estará disponible cuando haya suficiente histórico.
            </span>
          </div>
        )}

        {rangePreset !== "live" && !historicalLoading && coverage.kind === "cap" && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start">
            <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>
              Datos parciales: se alcanzó el límite de <strong>{coverage.limit} puntos</strong> del endpoint <code className="font-mono">/range</code>. Considera reducir el rango para ver detalle completo.
            </span>
          </div>
        )}


        {live.error && rangePreset === "live" && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-center">
            <AlertCircle size={14} className="mr-2" /> Error consultando telemetría: {live.error}
          </div>
        )}
      </div>

      {harvestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card-lg w-full max-w-md">
            <form onSubmit={handleHarvest}>
              <div className="flex items-start justify-between p-6 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 inline-flex items-center">
                    <CheckCircle2 size={18} className="mr-2 text-[#1e5631]" /> Marcar lote como cosechado
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Esta acción es definitiva y cierra el ciclo del lote.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setHarvestModalOpen(false); setHarvestError(null); }}
                  className="text-slate-400 hover:text-slate-600 p-1 -mr-1"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2 tracking-widest uppercase">
                    Peso obtenido (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={harvestYield}
                    onChange={(e) => setHarvestYield(e.target.value)}
                    placeholder="Ej: 12.50"
                    className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2 tracking-widest uppercase">
                    Fecha de finalización (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={harvestEndDate}
                    onChange={(e) => setHarvestEndDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">Si se omite, se usa la fecha y hora actual.</p>
                </div>

                {harvestError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start">
                    <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                    <span>{harvestError}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 px-6 py-4 bg-slate-50 rounded-b-2xl border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setHarvestModalOpen(false); setHarvestError(null); }}
                  className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  disabled={harvestLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={harvestLoading}
                  className="px-5 py-2 text-sm font-bold bg-[#1e5631] text-white rounded-lg hover:bg-[#153f23] transition-colors shadow-card disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center"
                >
                  {harvestLoading ? "Procesando…" : (<><CheckCircle2 size={14} className="mr-2" /> Confirmar cosecha</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  variable,
  reading,
  status,
  species,
}: {
  variable: Variable;
  reading: TelemetryReading | null;
  status: ReadingStatus | null;
  species: Species | null;
}) {
  const meta = VARIABLE_META[variable];
  const Icon = meta.icon;
  const value = reading ? reading[variable] : null;
  const statusStyle = status ? STATUS_COLORS[status] : null;
  const range = species ? thresholdsFor(variable, species) : null;

  return (
    <div className={`bg-white rounded-2xl border shadow-card p-6 transition-shadow ${statusStyle ? `border-slate-200 ${status === "CRITICAL" ? "ring-2 " + statusStyle.ring : ""}` : "border-slate-200"}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: `${meta.color}15` }}>
            <Icon size={18} style={{ color: meta.color }} />
          </div>
          <span className="text-sm font-bold text-slate-700">{meta.label}</span>
        </div>
        {statusStyle && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase ${statusStyle.bg} ${statusStyle.text}`}>
            {status}
          </span>
        )}
      </div>
      <div className="flex items-baseline">
        <span className="text-4xl font-extrabold text-slate-900 tabular-nums">
          {value !== null ? value.toFixed(1) : "—"}
        </span>
        <span className="text-slate-400 text-sm font-medium ml-1">{meta.unit}</span>
      </div>
      {range && (
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-3">
          Óptimo: {range.min} – {range.max} {meta.unit}
        </p>
      )}
    </div>
  );
}
