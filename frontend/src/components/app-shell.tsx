"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import logoIcon from "../../public/logo-icon.png";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { ThemeToggle } from "./theme-toggle";

interface NavItem {
  href: string;
  texto: string;
}

const enlaces: NavItem[] = [
  { href: "/comisionistas", texto: "Comisionistas" },
  { href: "/liquidaciones", texto: "Liquidaciones" },
  { href: "/suscripciones", texto: "Suscripciones" },
  { href: "/usuarios", texto: "Usuarios" },
];

const formatoDinero = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  minimumFractionDigits: 2,
});

const rolLabel: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  COMISIONISTA: "Comisionista",
};

function leerUsuario(): {
  nombre: string;
  rol: string;
  rolCrudo: string;
  iniciales: string;
  comisionistaId: string | null;
} {
  const token = getToken();
  if (!token) {
    return { nombre: "Usuario", rol: "", rolCrudo: "", iniciales: "US", comisionistaId: null };
  }
  try {
    const base = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base)) as {
      email?: string;
      rol?: string;
      comisionistaId?: string | null;
    };
    const local = (payload.email ?? "usuario").split("@")[0];
    const nombre = local.charAt(0).toUpperCase() + local.slice(1);
    const iniciales = local.slice(0, 2).toUpperCase();
    return {
      nombre,
      rol: rolLabel[payload.rol ?? ""] ?? "",
      rolCrudo: payload.rol ?? "",
      iniciales,
      comisionistaId: payload.comisionistaId ?? null,
    };
  } catch {
    return { nombre: "Usuario", rol: "", rolCrudo: "", iniciales: "US", comisionistaId: null };
  }
}

function ResumenIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M17 11l2 2 3-4" />
    </svg>
  );
}

function SalesIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 15l4-5 3 3 5-7" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l8-8M16 4h4v4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function AppShell({
  children,
  titulo,
}: {
  children: React.ReactNode;
  titulo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<{
    nombre: string;
    rol: string;
    rolCrudo: string;
    iniciales: string;
    comisionistaId: string | null;
  } | null>(null);
  const esComisionista = usuario?.rolCrudo === "COMISIONISTA";
  const esGestor = usuario?.rolCrudo === "ADMIN" || usuario?.rolCrudo === "SUPER_ADMIN";
  const rutaPerfil = usuario?.comisionistaId
    ? `/comisionistas/${usuario.comisionistaId}`
    : "/comisionistas";
  const [activos, setActivos] = useState<number | null>(null);
  const [resumen, setResumen] = useState<{ montoVendido: number; totalComision: number; totalVentas: number } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsuario(leerUsuario());
    let activo = true;
    (async () => {
      try {
        const data = await apiFetch<{ activo: boolean }[]>("/comisionistas");
        if (activo) setActivos(data.filter((c) => c.activo).length);
      } catch {
        if (activo) setActivos(null);
      }
    })();
    (async () => {
      try {
        const data = await apiFetch<{ montoVendido: number; totalComision: number; totalVentas: number }>("/resumen");
        if (activo) setResumen(data);
      } catch {
        if (activo) setResumen(null);
      }
    })();
    return () => {
      activo = false;
    };
  }, [router]);

  return (
    <div className="app-bg min-h-screen text-zinc-900 dark:text-light-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] flex-col bg-dark-500 px-5 pb-6 pt-8 lg:flex">
        <Link href={esComisionista ? rutaPerfil : "/comisionistas"} className="flex items-center gap-3 px-2 pb-8">
          <Image src={logoIcon} alt="Factelec Comisiones" width={48} height={48} className="shrink-0" />
          <span className="flex flex-col">
            <span className="font-display text-[19px] font-bold leading-tight tracking-tight text-white">
              Factelec
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[2px] text-white/60">
              Comisiones
            </span>
          </span>
        </Link>

        <nav className="flex flex-col gap-1">
          {!esComisionista && (
            <Link
              href="/resumen"
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm transition-colors ${
                pathname === "/resumen"
                  ? "bg-white/10 text-white shadow-[inset_3px_0_0_0_var(--color-primary-500)]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <ResumenIcon />
              Resumen
            </Link>
          )}

          {esComisionista && (
            <Link
              href={rutaPerfil}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm transition-colors ${
                pathname.startsWith("/comisionistas")
                  ? "bg-white/10 text-white shadow-[inset_3px_0_0_0_var(--color-primary-500)]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <UsersIcon />
              Mi perfil
            </Link>
          )}

          {enlaces
            .filter((e) => !(esComisionista && e.href === "/comisionistas"))
            .filter((e) => !(esComisionista && e.href === "/liquidaciones"))
            .filter((e) => e.href !== "/usuarios" || esGestor)
            .map((e) => {
            const activoLink = pathname === e.href;
            return (
              <Link
                key={e.href}
                href={e.href}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm transition-colors ${
                  activoLink
                    ? "bg-white/10 text-white shadow-[inset_3px_0_0_0_var(--color-primary-500)]"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {e.href === "/comisionistas" ? <UsersIcon /> : e.href === "/usuarios" ? <KeyIcon /> : e.href === "/liquidaciones" ? <MoneyIcon /> : e.href === "/suscripciones" ? <RepeatIcon /> : <SalesIcon />}
                {e.texto}
                {e.href === "/comisionistas" && activos !== null && activos > 0 && (
                  <span className="ml-auto rounded-full bg-primary-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {activos}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-[11px] uppercase tracking-[1.5px] text-white/50">Resumen del mes</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">
              {resumen ? formatoDinero.format(resumen.montoVendido) : "—"}
            </p>
            <p className="mt-1 text-[11px] text-white/50">
              {resumen
                ? `${resumen.totalVentas} ventas · ${formatoDinero.format(resumen.totalComision)} en comisión`
                : "Sin movimientos aún"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              clearToken();
              router.push("/login");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogoutIcon />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-light-100 bg-white/80 px-6 backdrop-blur dark:border-dark-600 dark:bg-dark-700/80 lg:px-10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-body-text">Panel</span>
            <span className="text-body-text/50">/</span>
            <span className="font-medium text-zinc-900 dark:text-white">{titulo}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <div className="flex items-center gap-3 rounded-2xl border border-light-100 bg-white px-2 py-1.5 dark:border-dark-600 dark:bg-dark-700">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-xs font-bold text-white">
                {usuario?.iniciales ?? "US"}
              </span>
              <span className="hidden flex-col pr-1 sm:flex">
                <span className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-white">
                  {usuario?.nombre ?? "Usuario"}
                </span>
                <span className="text-[11px] leading-tight text-body-text">{usuario?.rol ?? ""}</span>
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-295 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}


