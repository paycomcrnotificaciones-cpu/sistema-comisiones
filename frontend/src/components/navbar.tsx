"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearToken } from "@/lib/api";
import { ThemeToggle } from "./theme-toggle";

const enlaces = [
  { href: "/comisionistas", texto: "Comisionistas" },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-dark-600 bg-dark-500 px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/comisionistas" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Factelec Comisiones" width={40} height={40} />
          <span className="text-lg font-semibold text-white">Factelec Comisiones</span>
        </Link>
        <nav className="flex items-center gap-1">
          {enlaces.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className={`rounded-md px-3 py-1.5 text-sm ${
                pathname === e.href
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {e.texto}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          onClick={() => {
            clearToken();
            router.push("/login");
          }}
          className="px-2 py-1 text-sm text-white/80 hover:text-white"
        >
          Salir
        </button>
      </div>
    </header>
  );
}