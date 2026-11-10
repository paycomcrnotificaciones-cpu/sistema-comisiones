"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

import logo from "../../../public/logo.png";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

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
    <main className="flex flex-1 items-center justify-center bg-background p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-light-100 bg-white p-6 
        shadow-sm dark:border-dark-600 dark:bg-dark-700"
      >
        <div className="flex flex-col items-center gap-2">
          <Image src={logo} alt="Factelec Comisiones" width={150} height={150} className="h-auto w-40" priority />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Factelec Comisiones</h1>
          <p className="text-sm text-body-text">Inicia sesión para continuar</p>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-light-100">Correo</span>
          <input
            type="email"
            required
            placeholder="tu@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-light-100 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-light-100">Contraseña</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-light-100 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
          />
        </label>

        {error && <p className="text-sm text-danger-500">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-md bg-primary-500 px-3 py-2 text-sm font-medium text-white
          hover:bg-primary-600 disabled:opacity-50"
        >
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
