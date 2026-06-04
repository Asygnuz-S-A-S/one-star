import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Providers from "@/app/providers";

export const metadata: Metadata = {
  title: "One Star | Urban Performance",
  description:
    "Tienda de calzado urbano y deportivo premium. Nike, New Balance, Veja y más.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      {/* pt compensa el header fijo: 32px barra + 56px nav = 88px móvil / 32px + 64px = 96px desktop */}
      <body className="min-h-full flex flex-col bg-white text-[#1C1C1C] pt-[88px] md:pt-[96px]">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
