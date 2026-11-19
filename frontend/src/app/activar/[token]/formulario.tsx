"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

// Página pública a la que llega la persona desde el enlace de invitación.
// Aquí define su propia contraseña: nadie más la conoce.
export function FormularioActivar({ token }: { token: string }) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError("La contraseña debe tener al menos 10 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    try {
      const data = await apiFetch<{ email: string }>("/auth/activar", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setListo(data.email);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo activar la cuenta",
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d1528] p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-primary-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-brand-cyan-500/20 blur-3xl" />

      <div className="relative w-full max-w-md rounded-[28px] bg-white p-7 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.65)] dark:bg-dark-700 sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary-600 dark:text-primary-100">
          Comix
        </p>
        <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.4px] text-zinc-900 dark:text-white">
          Crea tu contraseña
        </h1>

        {listo ? (
          <>
            <p className="mt-4 text-sm text-body-text">
              Listo. La cuenta <strong>{listo}</strong> ya tiene su contraseña.
            </p>
            <p className="mt-2 text-sm text-body-text">
              Te llevamos al inicio de sesión…
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
            >
              Ir a iniciar sesión
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <p className="text-sm text-body-text">
              Elige una contraseña de al menos 10 caracteres. Solo tú la vas a
              conocer.
            </p>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-700 dark:text-light-100">
                Contraseña
              </span>
              <input
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-light-100 bg-light-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-600 dark:text-white"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-700 dark:text-light-100">
                Repite la contraseña
              </span>
              <input
                type="password"
                required
                minLength={10}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full rounded-xl border border-light-100 bg-light-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-600 dark:text-white"
              />
            </label>

            {error && <p className="text-sm text-danger-500">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-xl bg-[linear-gradient(135deg,var(--color-primary-500),var(--color-primary-600))] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {cargando ? "Guardando…" : "Guardar contraseña"}
            </button>

            <p className="text-center text-[11px] text-body-text">
              Si el enlace venció o ya se usó, pide uno nuevo al administrador.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
