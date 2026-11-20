import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";

// Tipografías del sistema: DM Sans para el texto y Manrope para los títulos.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

// Ajustes de pantalla: ancho real del celular, sin zoom raro y respetando
// el notch. themeColor pinta la barra del navegador como la app.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1528" },
  ],
};

// Título y descripción que se ven en la pestaña del navegador.
export const metadata: Metadata = {
  title: "LiquiCom · Gestión de comisiones",
  description: "Gestión de comisiones de ventas — Solusoft CR",
};

// Envoltura de todas las páginas: idioma español, fuentes y fondo base.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
