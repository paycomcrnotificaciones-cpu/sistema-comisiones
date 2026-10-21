"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch, clearToken, getToken } from "@/lib/api";

interface Sucursal {
  id: string;
  nombre: string;
}

interface Comisionista {
  id: string;
  nombre: string;
  codigo: string | null;
  activo: boolean;
  sucursal: { id: string; nombre: string } | null;
}

const inputClass = "w-full rounded-md border border-zinc-300 px-3 py-2";

export default function ComisionistasPage() {
  const router = useRouter();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [comisionistas, setComisionistas] = useState<Comisionista[]>([]);
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  async function cargar(seleccionar?: string) {
    const [s, c] = await Promise.all([
      apiFetch<Sucursal[]>("/sucursales"),
      apiFetch<Comisionista[]>("/comisionistas"),
    ]);
    setSucursales(s);
    setComisionistas(c);
    setSucursalId((actual) => actual || seleccionar || s[0]?.id || "");
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setCargando(false));
  }, [router]);

  async function crear(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/comisionistas", {
        method: "POST",
        body: JSON.stringify({ nombre, codigo: codigo || undefined, sucursalId }),
      });
      setNombre("");
      setCodigo("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Comisionistas</h1>
        <button
          onClick={() => {
            clearToken();
            router.push("/login");
          }}
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          Salir
        </button>
      </header>

      <form
        onSubmit={crear}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-4"
      >
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700">Nombre</span>
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700">Código</span>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className={inputClass} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700">Sucursal</span>
          <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className={inputClass}>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="mt-6 h-10 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white"
        >
          Agregar
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Sucursal</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  Cargando…
                </td>
              </tr>
            ) : comisionistas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  Sin comisionistas registrados
                </td>
              </tr>
            ) : (
              comisionistas.map((c) => (
                <tr key={c.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{c.nombre}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.codigo ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.sucursal?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.activo ? "Activo" : "Inactivo"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
