"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch, getSesion, getToken } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-light-100 bg-light-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-600 dark:text-white";

// Cambio de contraseña obligatorio. Se llega aquí al entrar con una clave
// temporal de 6 dígitos o cuando el usuario decide cambiarla.
export default function CambiarClavePage() {
  const router = useRouter();
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMensaje(null);

    if (nueva.length < 10) {
      setError("La contraseña debe tener al menos 10 caracteres");
      return;
    }
    if (nueva !== repetir) {
      setError("Las dos contraseñas no coinciden");
      return;
    }

    setGuardando(true);
    try {
      await apiFetch("/auth/cambiar-clave", {
        method: "POST",
        body: JSON.stringify({ nueva }),
      });
      setMensaje("Contraseña actualizada. Entrando…");
      const sesion = getSesion();
      const destino =
        sesion?.rol === "COMISIONISTA" && sesion.comisionistaId
          ? `/comisionistas/${sesion.comisionistaId}`
          : "/resumen";
      setTimeout(() => router.replace(destino), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#0d1528_0%,#1d2a50_55%,#0d1528_100%)] p-5">
      <form
        onSubmit={guardar}
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-7 shadow-2xl dark:bg-dark-700 sm:p-9"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary-600 dark:text-primary-100">
            Seguridad
          </p>
          <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.4px] text-zinc-900 dark:text-white">
            Cambia tu contraseña
          </h1>
          <p className="mt-1 text-sm text-body-text">
            La clave temporal vence a los 7 días. Elige una nueva para seguir
            usando el sistema.
          </p>
        </div>

        {error && <p className="text-sm text-danger-500">{error}</p>}
        {mensaje && (
          <p className="text-sm text-success-600 dark:text-success-500">{mensaje}</p>
        )}

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-light-100">
            Nueva contraseña
          </span>
          <input
            type="password"
            required
            minLength={10}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-light-100">
            Repite la contraseña
          </span>
          <input
            type="password"
            required
            minLength={10}
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          disabled={guardando}
          className="h-[46px] w-full rounded-xl bg-primary-500 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </main>
  );
}
