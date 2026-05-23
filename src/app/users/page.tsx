"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Users,
  CheckCircle2,
  UserX,
  RotateCcw,
  Trash2,
  AlertCircle,
  ChevronDown,
  Clock,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/lib/auth";

type UserStatus = "PENDIENTE" | "ACTIVO" | "BLOQUEADO";

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  role: UserRole | null;
  status: UserStatus;
}

const USERS_API = "/users";

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  OBSERVADOR: "Observador",
};

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: "bg-emerald-100 text-emerald-700",
  OPERADOR: "bg-blue-100 text-blue-700",
  OBSERVADOR: "bg-slate-100 text-slate-600",
};

type Tab = "PENDIENTE" | "ACTIVO" | "BLOQUEADO";

const TAB_META: Record<Tab, { label: string; icon: typeof Clock; empty: string }> = {
  PENDIENTE: { label: "Pendientes", icon: Clock, empty: "No hay usuarios pendientes de aprobación." },
  ACTIVO: { label: "Activos", icon: ShieldCheck, empty: "No hay usuarios activos." },
  BLOQUEADO: { label: "Bloqueados", icon: ShieldOff, empty: "No hay usuarios bloqueados." },
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>("PENDIENTE");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${USERS_API}?status=${tab}`);
      if (!res.ok) throw new Error(`Error cargando usuarios (${res.status})`);
      setUsers(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const doAction = async (userId: string, path: string, body?: object) => {
    setActionLoading(userId + path);
    try {
      const res = await apiFetch(`${USERS_API}/${userId}${path}`, {
        method: path === "/role" ? "PUT" : "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(b.error ?? `Error (${res.status})`);
      }
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en la operación");
    } finally {
      setActionLoading(null);
    }
  };

  const doDelete = async (userId: string) => {
    if (!confirm("¿Seguro que quieres eliminar este usuario? Esta acción no se puede deshacer.")) return;
    setActionLoading(userId + "/delete");
    try {
      const res = await apiFetch(`${USERS_API}/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Error eliminando usuario (${res.status})`);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando usuario");
    } finally {
      setActionLoading(null);
    }
  };

  if (currentUser?.role !== "ADMIN") {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center text-red-700">
          <AlertCircle size={20} className="mr-3" />
          <span className="font-semibold">No tienes permisos para acceder a esta sección.</span>
        </div>
      </div>
    );
  }

  const TabIcon = TAB_META[tab].icon;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#1e5631] rounded-xl flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestión de Usuarios</h1>
            <p className="text-slate-500 text-sm font-medium">Aprobación, roles y control de acceso</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        {(Object.keys(TAB_META) as Tab[]).map((t) => {
          const Icon = TAB_META[t].icon;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-md transition-colors ${
                tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={12} className="mr-2" />
              {TAB_META[t].label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center text-sm text-red-700">
          <AlertCircle size={16} className="mr-2" /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <TabIcon size={16} className="text-slate-500" />
          <h2 className="font-bold text-slate-800">{TAB_META[tab].label}</h2>
          {!loading && <span className="ml-auto text-xs text-slate-400 font-medium">{users.length} usuario{users.length !== 1 ? "s" : ""}</span>}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Cargando usuarios…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">{TAB_META[tab].empty}</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                tab={tab}
                actionLoading={actionLoading}
                onApprove={(role) => doAction(u.id, "/approve", { role })}
                onChangeRole={(role) => doAction(u.id, "/role", { role })}
                onBlock={() => doAction(u.id, "/block")}
                onUnblock={() => doAction(u.id, "/unblock")}
                onDelete={() => doDelete(u.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserAvatar({ user }: { user: ManagedUser }) {
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#1e5631] text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
      {user.username.charAt(0).toUpperCase()}
    </div>
  );
}

interface UserRowProps {
  user: ManagedUser;
  tab: Tab;
  actionLoading: string | null;
  onApprove: (role: UserRole) => void;
  onChangeRole: (role: UserRole) => void;
  onBlock: () => void;
  onUnblock: () => void;
  onDelete: () => void;
}

function UserRow({ user, tab, actionLoading, onApprove, onChangeRole, onBlock, onUnblock, onDelete }: UserRowProps) {
  const busy = actionLoading?.startsWith(user.id) ?? false;

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
      <UserAvatar user={user} />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 truncate">{user.username}</p>
        <p className="text-xs text-slate-500 truncate">{user.email}</p>
      </div>

      {user.role && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase flex-shrink-0 ${ROLE_BADGE[user.role]}`}>
          {ROLE_LABEL[user.role]}
        </span>
      )}

      <div className="flex items-center gap-2 flex-shrink-0">
        {tab === "PENDIENTE" && (
          <ApproveDropdown onApprove={onApprove} busy={busy} />
        )}

        {tab === "ACTIVO" && (
          <>
            <RoleDropdown currentRole={user.role} onChange={onChangeRole} busy={busy} />
            <button
              onClick={onBlock}
              disabled={busy}
              title="Bloquear usuario"
              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <ShieldOff size={16} />
            </button>
          </>
        )}

        {tab === "BLOQUEADO" && (
          <button
            onClick={onUnblock}
            disabled={busy}
            title="Reactivar usuario"
            className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw size={12} className="mr-1.5" />
            Reactivar
          </button>
        )}

        <button
          onClick={onDelete}
          disabled={busy}
          title="Eliminar usuario"
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function ApproveDropdown({ onApprove, busy }: { onApprove: (r: UserRole) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (busy) return;
    if (!open && containerRef.current) {
      // Decide whether to render above or below based on available space
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 160); // 160px ~ 3 items × ~48px + margin
    }
    setOpen((v) => !v);
  };

  const handleSelect = (role: UserRole) => {
    setOpen(false);
    onApprove(role);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        disabled={busy}
        className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-[#1e5631] bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
      >
        <CheckCircle2 size={12} className="mr-1.5" />
        Aprobar
        <ChevronDown size={12} className={`ml-1.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute right-0 w-44 bg-white rounded-xl border border-slate-200 shadow-card-lg z-50 ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {(["OPERADOR", "OBSERVADOR", "ADMIN"] as UserRole[]).map((role) => (
            <button
              key={role}
              onMouseDown={(e) => e.preventDefault()} // prevent blur before click
              onClick={() => handleSelect(role)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl font-medium text-slate-700"
            >
              Como {ROLE_LABEL[role]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleDropdown({ currentRole, onChange, busy }: { currentRole: UserRole | null; onChange: (r: UserRole) => void; busy: boolean }) {
  return (
    <select
      value={currentRole ?? ""}
      onChange={(e) => onChange(e.target.value as UserRole)}
      disabled={busy}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 disabled:opacity-50 cursor-pointer"
    >
      {(["OPERADOR", "OBSERVADOR", "ADMIN"] as UserRole[]).map((r) => (
        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
      ))}
    </select>
  );
}

function UserXIcon(props: React.ComponentProps<typeof UserX>) {
  return <UserX {...props} />;
}
// Suppress unused warning — ShieldCheck imported for icon display
void UserXIcon;
