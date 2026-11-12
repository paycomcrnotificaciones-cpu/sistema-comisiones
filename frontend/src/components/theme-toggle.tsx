"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

// Decide el tema al abrir la página: se respeta lo último que eligió el
// usuario y, si nunca eligió, se usa el tema del sistema operativo.
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Botón para cambiar entre modo claro y oscuro. La elección se guarda
// en el navegador para que se mantenga la próxima vez.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const initial = getInitialTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
  }, []);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Aplica el tema y lo recuerda para la próxima visita.
  function aplicar(next: Theme) {
    setTheme(next);
    window.localStorage.setItem("theme", next);
  }

  return (
    <div
      role="group"
      aria-label="Tema de la interfaz"
      className="flex items-center gap-0.5 rounded-full border border-light-100 bg-white p-1 dark:border-dark-600 dark:bg-dark-700"
    >
      <button
        type="button"
        onClick={() => aplicar("light")}
        aria-label="Modo claro"
        aria-pressed={theme === "light"}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          theme === "light"
            ? "bg-light-100 text-zinc-900 dark:bg-dark-600 dark:text-white"
            : "text-body-text hover:text-zinc-900 dark:hover:text-white"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => aplicar("dark")}
        aria-label="Modo oscuro"
        aria-pressed={theme === "dark"}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          theme === "dark"
            ? "bg-light-100 text-zinc-900 dark:bg-dark-600 dark:text-white"
            : "text-body-text hover:text-zinc-900 dark:hover:text-white"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
    </div>
  );
}
