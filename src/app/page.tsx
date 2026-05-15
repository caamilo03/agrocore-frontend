"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Sprout,
  PackageOpen,
  CheckCircle,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
  Activity,
} from "lucide-react";
import {
  TelemetryReading,
  SpeciesThresholds,
  classifyReading,
  STATUS_COLORS,
  ReadingStatus,
  getLatest,
} from "@/lib/telemetry";
import { apiFetch } from "@/lib/api";

interface CropBatch {
  id: string;
  idSpecies: string | null;
  status: string;
  startDate: string;
  yieldKg: number;
}

interface Species extends SpeciesThresholds {
  idSpecies: string;
  name: string;
}

interface BatchLive {
  batch: CropBatch;
  species: Species | null;
  reading: TelemetryReading | null;
  worst: ReadingStatus | null;
}

const BATCHES_API = "/batches";
const SPECIES_API = "/species";

function batchShortId(id: string): string {
  return `#${id.substring(0, 6).toUpperCase()}`;
}

export default function PanelPrincipal() {
  const [batches, setBatches] = useState<CropBatch[]>([]);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [liveByBatch, setLiveByBatch] = useState<Record<string, BatchLive>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    const fetchAll = async () => {
      try {
        const [batchesRes, speciesRes] = await Promise.all([apiFetch(BATCHES_API), apiFetch(SPECIES_API)]);
        if (!batchesRes.ok || !speciesRes.ok) throw new Error("Error cargando datos");
        const allBatches: CropBatch[] = await batchesRes.json();
        const allSpecies: Species[] = await speciesRes.json();
        if (cancelled) return;
        setBatches(allBatches);
        setSpeciesList(allSpecies);

        const active = allBatches.filter((b) => b.status === "ACTIVO");
        const results = await Promise.all(
          active.map(async (batch) => {
            const species = allSpecies.find((s) => s.idSpecies === batch.idSpecies) ?? null;
            try {
              const reading = await getLatest(batch.id);
              const worst = reading && species ? classifyReading(reading, species).worstStatus : null;
              return [batch.id, { batch, species, reading, worst }] as const;
            } catch {
              return [batch.id, { batch, species, reading: null, worst: null }] as const;
            }
          }),
        );
        if (cancelled) return;
        setLiveByBatch(Object.fromEntries(results));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    intervalId = window.setInterval(fetchAll, 15000);
    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, []);

  const activeBatches = useMemo(() => batches.filter((b) => b.status === "ACTIVO"), [batches]);
  const harvestedBatches = useMemo(() => batches.filter((b) => b.status === "COSECHADO"), [batches]);
  const lostBatches = useMemo(() => batches.filter((b) => b.status === "PERDIDO"), [batches]);

  const totalYield = useMemo(() =>
    harvestedBatches.reduce((s, b) => s + (b.yieldKg ?? 0), 0),
  [harvestedBatches]);

  const successRate = useMemo(() => {
    const finished = harvestedBatches.length + lostBatches.length;
    if (finished === 0) return null;
    return (harvestedBatches.length / finished) * 100;
  }, [harvestedBatches.length, lostBatches.length]);

  const alerts = useMemo(() =>
    Object.values(liveByBatch).filter((bl) => bl.worst === "WARN" || bl.worst === "CRITICAL"),
  [liveByBatch]);

  const filteredActive = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = activeBatches.map((b) => liveByBatch[b.id] ?? { batch: b, species: speciesList.find((s) => s.idSpecies === b.idSpecies) ?? null, reading: null, worst: null });
    if (!term) return list;
    return list.filter((bl) =>
      bl.batch.id.toLowerCase().includes(term) ||
      (bl.species?.name ?? "").toLowerCase().includes(term),
    );
  }, [activeBatches, liveByBatch, speciesList, searchTerm]);

  const kpis = [
    { title: "Especies Registradas", value: String(speciesList.length), subtitle: "Catálogo activo", icon: Sprout, color: "text-green-500", bg: "bg-green-100" },
    { title: "Lotes Activos", value: String(activeBatches.length), subtitle: "En producción", icon: PackageOpen, color: "text-blue-500", bg: "bg-blue-100" },
    { title: "Lotes Cosechados", value: String(harvestedBatches.length), subtitle: "Histórico total", icon: CheckCircle, color: "text-purple-500", bg: "bg-purple-100" },
    { title: "Rendimiento Total", value: successRate !== null ? `${successRate.toFixed(1)}%` : `${totalYield.toFixed(0)} kg`, subtitle: successRate !== null ? "Cosechados / finalizados" : "Producción acumulada", icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-100" },
  ];

  return (
    <div className="p-8 text-slate-800">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel Principal</h1>
          <p className="text-slate-500 text-sm">Bienvenido de nuevo, Administrador</p>
        </div>
        <div className="relative w-80">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full p-2.5 pl-10 text-sm text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:ring-green-500 focus:border-green-500 outline-none"
            placeholder="Buscar lote o especie..."
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 flex flex-col hover:border-green-300 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-medium text-slate-500 w-24 leading-tight">{kpi.title}</span>
                <div className={`${kpi.bg} p-2 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800">{loading ? "—" : kpi.value}</h2>
              <span className="text-xs font-semibold mt-2 text-slate-400">{kpi.subtitle}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-slate-100">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Lotes Activos · Vista Rápida</h2>
            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center">
              <Activity size={12} className="mr-1.5" /> Auto-refresco 15s
            </span>
          </div>

          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Cargando lotes…</div>
            ) : filteredActive.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                {searchTerm ? "Sin coincidencias para la búsqueda." : "Sin lotes activos."}
              </div>
            ) : (
              filteredActive.slice(0, 5).map((bl) => (
                <Link
                  key={bl.batch.id}
                  href={`/batches/${bl.batch.id}`}
                  className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${bl.worst ? STATUS_COLORS[bl.worst].bg + " " + STATUS_COLORS[bl.worst].text : "bg-green-100 text-green-500"}`}>
                      <Sprout size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">
                        {bl.species?.name ?? "Sin especie"}{" "}
                        <span className="text-slate-400 font-medium text-sm ml-1">{batchShortId(bl.batch.id)}</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Iniciado: {new Date(bl.batch.startDate).toLocaleDateString("es-CO")}
                        {bl.worst && bl.worst !== "OK" && (
                          <span className={`ml-2 font-bold ${STATUS_COLORS[bl.worst].text}`}>· {bl.worst}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-10 items-center">
                    <Metric label="HUMEDAD" value={bl.reading?.humidity} unit="%" />
                    <Metric label="TEMP" value={bl.reading?.temperature} unit="°C" />
                    <Metric label="CO₂" value={bl.reading?.co2} unit="ppm" />
                    <ChevronRight size={20} className="text-slate-300" />
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="p-4 bg-slate-50 rounded-b-2xl border-t border-slate-100 flex justify-center">
            <Link href="/batches">
              <button className="bg-[#1e5631] hover:bg-[#153f23] text-white font-bold py-2 px-6 rounded-xl transition-all shadow-sm active:scale-95 text-sm">
                Ver todos los lotes →
              </button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-slate-100 flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 inline-flex items-center">
              <AlertTriangle size={18} className="text-amber-500 mr-2" />
              Alertas Activas
            </h2>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${alerts.length === 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {alerts.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50 flex-1 overflow-y-auto max-h-[420px]">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Cargando…</div>
            ) : alerts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                <CheckCircle size={28} className="mx-auto mb-2 text-green-500" />
                Todos los lotes activos están dentro del rango óptimo.
              </div>
            ) : (
              alerts.map((bl) => (
                <Link
                  key={bl.batch.id}
                  href={`/batches/${bl.batch.id}`}
                  className="p-4 px-6 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{bl.species?.name ?? "Sin especie"}</p>
                    <p className="text-xs text-slate-400">{batchShortId(bl.batch.id)}</p>
                  </div>
                  {bl.worst && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase ${STATUS_COLORS[bl.worst].bg} ${STATUS_COLORS[bl.worst].text}`}>
                      {bl.worst}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: number | undefined; unit: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-bold text-slate-400 mb-1">{label}</p>
      <p className="font-bold text-slate-800 text-sm">
        {value !== undefined ? `${value.toFixed(1)}${unit}` : "—"}
      </p>
    </div>
  );
}
