"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import logoIcon from "../../public/logo-icon-light.png";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { ThemeToggle } from "./theme-toggle";

interface NavItem {
  href: string;
  texto: string;
}

// Menú lateral. Algunas entradas se ocultan según el rol:
// usuarios, sucursales, reglas e historial son solo para administradores.
const enlaces: NavItem[] = [
  { href: "/comisionistas", texto: "Comisionistas" },
  { href: "/sucursales", texto: "Sucursales" },
  { href: "/liquidaciones", texto: "Liquidaciones" },
  { href: "/suscripciones", texto: "Suscripciones" },
  { href: "/reglas", texto: "Reglas" },
  { href: "/historial", texto: "Historial" },
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

// Lee el nombre, el rol y el comisionista desde el token guardado,
// para mostrar el menú correcto sin pedir nada al servidor.
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

// Iconos del menú lateral y de la barra superior.
// Cada uno es un dibujo simple hecho con trazos, sin librerías externas.
// Icono de Resumen: cuatro cuadros que representan el panel.
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

// Icono de Comisionistas: una persona con un check al lado.
function UsersIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M17 11l2 2 3-4" />
    </svg>
  );
}

// Icono de Sucursales: un local con su puerta.
function StoreIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h16l-1.2-4.2A2 2 0 0 0 16.9 3H7.1a2 2 0 0 0-1.9 1.8L4 9z" />
      <path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

// Icono de ventas: una gráfica con la línea subiendo.
function SalesIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 15l4-5 3 3 5-7" />
    </svg>
  );
}

// Icono de Suscripciones: dos flechas que se repiten.
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

// Icono de Liquidaciones: un billete.
function MoneyIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

// Icono de Reglas: controles deslizantes.
function ReglasIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h10M18 7h2" />
      <path d="M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

// Icono de Historial: un reloj con la flecha hacia atrás.
function HistoryIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

// Icono de Usuarios y accesos: una llave.
function KeyIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l8-8M16 4h4v4" />
    </svg>
  );
}

// Icono del botón Inicio, arriba a la izquierda.
function HomeIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
    </svg>
  );
}

// Icono del botón Salir.
function LogoutIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

// Envoltura de las pantallas privadas: menú lateral en computadora,
// barra superior con el botón Inicio y menú deslizable en celular.
// También cierra la sesión si no hay token.
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
  const rutaInicio = esComisionista ? rutaPerfil : "/resumen";
  const enInicio = pathname === rutaInicio;
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

  const navItems = [
    ...(!esComisionista
      ? [{ href: "/resumen", texto: "Resumen", icono: <ResumenIcon /> }]
      : []),
    ...(esComisionista
      ? [{ href: rutaPerfil, texto: "Mi perfil", icono: <UsersIcon /> }]
      : []),
    ...enlaces
      .filter((e) => !(esComisionista && e.href === "/liquidaciones"))
      .filter((e) => !(esComisionista && e.href === "/comisionistas"))
      .filter((e) => e.href !== "/usuarios" || esGestor)
      .filter((e) => e.href !== "/sucursales" || esGestor)
      .filter((e) => e.href !== "/historial" || esGestor)
      .filter((e) => e.href !== "/reglas" || esGestor)
      .map((e) => ({
        href: e.href,
        texto: e.texto,
        icono:
          e.href === "/comisionistas" ? (
            <UsersIcon />
          ) : e.href === "/sucursales" ? (
            <StoreIcon />
          ) : e.href === "/usuarios" ? (
            <KeyIcon />
          ) : e.href === "/liquidaciones" ? (
            <MoneyIcon />
          ) : e.href === "/suscripciones" ? (
            <RepeatIcon />
          ) : e.href === "/historial" ? (
            <HistoryIcon />
          ) : e.href === "/reglas" ? (
            <ReglasIcon />
          ) : (
            <SalesIcon />
          ),
      })),
  ];

  // Indica qué entrada del menú debe verse seleccionada.
  function linkActivo(href: string) {
    return href === "/comisionistas"
      ? pathname.startsWith("/comisionistas")
      : pathname === href;
  }

  // Dibuja una entrada del menú; cambia el estilo si es la pantalla actual
  // y si es la versión de celular (barra horizontal).
  function navLink(item: (typeof navItems)[number], movil = false) {
    const activoLink = linkActivo(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={
          movil
            ? `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold transition-colors ${
                activoLink
                  ? "bg-primary-500 text-white shadow-sm"
                  : "bg-light-50 text-body-text dark:bg-dark-700 dark:text-light-100"
              }`
            : `relative flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm transition-all ${
                activoLink
                  ? "bg-white/[0.09] text-white shadow-[inset_3px_0_0_0_var(--color-brand-cyan-500)]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`
        }
      >
        {item.icono}
        {item.texto}
        {!movil && item.href === "/comisionistas" && activos !== null && activos > 0 && (
          <span className="ml-auto rounded-full bg-brand-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-brand-cyan-500">
            {activos}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="app-bg min-h-screen text-zinc-900 dark:text-light-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] flex-col border-r border-white/5 bg-[linear-gradient(180deg,#151f3b_0%,#1d2a50_55%,#121a33_100%)] px-5 pb-6 pt-8 shadow-[8px_0_40px_-24px_rgba(10,18,38,0.8)] lg:flex">
        <Link href={esComisionista ? rutaPerfil : "/comisionistas"} className="flex items-center gap-3 px-2 pb-8">
          <Image src={logoIcon} alt="LiquiCom" width={48} height={48} className="shrink-0 rounded-2xl bg-white/5 p-1 ring-1 ring-white/10" />
          <span className="flex flex-col">
            <span className="font-display text-[19px] font-bold leading-tight tracking-tight text-white">
              LiquiCom
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[2px] text-white/60">
              Comisiones
            </span>
          </span>
        </Link>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => navLink(item))}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="rounded-xl bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03))] p-4 ring-1 ring-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/50">
              Resumen del mes
            </p>
            <p className="mt-1 font-display text-[24px] font-bold leading-tight text-white">
              {resumen ? formatoDinero.format(resumen.montoVendido) : "—"}
            </p>
            <p className="mt-1 text-[11px] text-white/50">
              {resumen
                ? `${resumen.totalVentas} ventas · ${formatoDinero.format(resumen.totalComision)} en comisión`
                : "Sin movimientos aún"}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand-cyan-500),var(--color-primary-500))]"
                style={{
                  width: `${
                    resumen && resumen.montoVendido > 0
                      ? Math.min(100, (resumen.totalComision / resumen.montoVendido) * 100 * 4)
                      : 0
                  }%`,
                }}
              />
            </div>
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
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-light-100 bg-white/85 px-5 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur dark:border-dark-600 dark:bg-dark-700/85 lg:px-10">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Link
              href={rutaInicio}
              aria-label="Ir a la pantalla principal"
              title="Ir a la pantalla principal"
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold shadow-sm transition-all ${
                enInicio
                  ? "border-primary-500 bg-primary-500 text-white hover:bg-primary-600"
                  : "border-light-100 bg-white text-zinc-900 hover:-translate-y-0.5 hover:border-primary-500 hover:bg-primary-500/10 hover:text-primary-600 dark:border-dark-600 dark:bg-dark-700 dark:text-white dark:hover:text-primary-100"
              }`}
            >
              <HomeIcon />
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            <span className="mx-1 hidden h-5 w-px bg-light-100 dark:bg-dark-600 sm:block" />
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-body-text">Panel</span>
              <span className="text-body-text/50">/</span>
              <span className="truncate font-medium text-zinc-900 dark:text-white">{titulo}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            {/* En celular la barra lateral no se ve, así que el botón de salir
                se pone aquí. En escritorio se oculta porque ya está abajo. */}
            <button
              type="button"
              onClick={() => {
                clearToken();
                router.push("/login");
              }}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-light-100 bg-white text-body-text shadow-sm transition-colors hover:border-danger-500 hover:text-danger-500 dark:border-dark-600 dark:bg-dark-700 dark:text-light-100 dark:hover:border-danger-500 dark:hover:text-danger-500 lg:hidden"
            >
              <LogoutIcon />
            </button>
            <div className="flex items-center gap-3 rounded-2xl border border-light-100 bg-white px-2 py-1.5 shadow-sm dark:border-dark-600 dark:bg-dark-700">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--color-primary-500),var(--color-brand-cyan-500))] text-xs font-bold text-white shadow-sm">
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

        <nav className="flex gap-2 overflow-x-auto border-b border-light-100 bg-white/70 px-4 py-3 dark:border-dark-600 dark:bg-dark-700/70 lg:hidden">
          {navItems.map((item) => navLink(item, true))}
        </nav>

        <main className="fade-rise mx-auto w-full max-w-295 px-5 py-7 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}


