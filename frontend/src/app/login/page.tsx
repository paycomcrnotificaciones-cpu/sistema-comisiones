"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

import logo from "../../../public/logo.png";
import { login } from "@/lib/api";

// Pantalla de entrada. Valida el correo y la contraseña contra la API y,
// según el rol, manda al resumen o directo al perfil del comisionista.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Envía el formulario. Si el usuario es comisionista, entra a su propio
  // perfil; cualquier otro rol empieza en el resumen.
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const usuario = await login(email, password);
      if (usuario.rol === "COMISIONISTA") {
        router.push(
          usuario.comisionistaId
            ? `/comisionistas/${usuario.comisionistaId}`
            : "/resumen",
        );
      } else {
        router.push("/resumen");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d1528] p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-primary-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-brand-cyan-500/20 blur-3xl" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.65)] dark:border-dark-600 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hero-panel relative hidden flex-col justify-between p-10 lg:flex">
          <div className="relative z-10">
            <Image src={logo} alt="Factelec Comisiones" width={130} height={130} className="h-auto w-28 rounded-2xl bg-white p-2.5 shadow-lg" priority />
            <p className="mt-8 text-[11px] font-bold uppercase tracking-[2.4px] text-brand-cyan-500">
              Factelec Comisiones
            </p>
            <h1 className="mt-3 font-display text-[34px] font-bold leading-[1.1] tracking-[-0.5px]">
              Control de ventas
              <br />
              y comisiones
            </h1>
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-white/70">
              La libreta digital del jefe: cada comisionista, sus ventas y lo que
              corresponde pagar, en un solo lugar.
            </p>
          </div>
          <ul className="relative z-10 mt-10 space-y-3 text-[13px] text-white/70">
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan-500" />
              Ventas organizadas por comisionista
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan-500" />
              Comisiones claras: pendientes y pagadas
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan-500" />
              Liquidaciones y suscripciones automáticas
            </li>
          </ul>
        </section>

        <form
          onSubmit={onSubmit}
          className="relative space-y-5 bg-white p-7 dark:bg-dark-700 sm:p-10"
        >
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <Image src={logo} alt="Factelec Comisiones" width={120} height={120} className="h-auto w-24" priority />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary-600 dark:text-primary-100">
              Acceso al sistema
            </p>
            <h2 className="mt-2 font-display text-[26px] font-bold tracking-[-0.4px] text-zinc-900 dark:text-white">
              Iniciar sesión
            </h2>
            <p className="mt-1 text-sm text-body-text">
              Ingresa con el correo y la contraseña que te asignó el administrador.
            </p>
          </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-light-100">Correo</span>
          <input
            type="email"
            required
            placeholder="tu@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-light-100 bg-light-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-600 dark:text-white"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-light-100">Contraseña</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-light-100 bg-light-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-600 dark:text-white"
          />
        </label>

        {error && <p className="text-sm text-danger-500">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-xl bg-[linear-gradient(135deg,var(--color-primary-500),var(--color-primary-600))] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_-12px_rgba(66,84,186,0.7)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-12px_rgba(66,84,186,0.75)] disabled:translate-y-0 disabled:opacity-60"
        >
          {cargando ? "Entrando…" : "Entrar"}
        </button>

        <p className="text-center text-[11px] text-body-text">
          Sistema privado de Factelec · Acceso autorizado
        </p>
      </form>
      </div>
    </main>
  );
}
