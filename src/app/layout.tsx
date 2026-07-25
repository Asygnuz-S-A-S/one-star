import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Providers from "@/app/providers";

export const metadata: Metadata = {
  title: "One Star | Urban Performance",
  description:
    "Tienda de calzado urbano y deportivo premium. Nike, New Balance, Veja y más.",
};

import { getActiveNavigationItems } from "@/server/repositories/navigation.repository";
import { getTopBanner } from "@/server/repositories/top-banner.repository";
import { getPrimaryLogos } from "@/server/repositories/site-logo.repository";
import { getHeaderConfig } from "@/server/repositories/header-config.repository";

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Queries independientes en paralelo; si la BD falla, la página
  // se renderiza con fallbacks en lugar de caerse entera.
  const [navigationItems, topBanner, primaryLogos, headerConfig] = await Promise.all([
    getActiveNavigationItems().catch((error: unknown) => {
      console.error("[layout] getActiveNavigationItems falló:", error);
      return [];
    }),
    getTopBanner().catch((error: unknown) => {
      console.error("[layout] getTopBanner falló:", error);
      return null;
    }),
    getPrimaryLogos().catch((error: unknown) => {
      console.error("[layout] getPrimaryLogos falló:", error);
      return null;
    }),
    getHeaderConfig().catch((error: unknown) => {
      console.error("[layout] getHeaderConfig falló:", error);
      return null;
    }),
  ]);
  
  // Si el banner está inactivo o no existe, solo ocupamos la altura de la barra nav
  const isBannerActive = topBanner?.isActive ?? true;
  const paddingClass = isBannerActive ? "pt-[88px] md:pt-[96px]" : "pt-[56px] md:pt-[64px]";

  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className={`min-h-full flex flex-col bg-white text-[#1C1C1C] dark:bg-[#0f0f0f] dark:text-[#f5f5f7] transition-colors duration-300 ${paddingClass}`}>
        <Providers>
          <Header items={navigationItems} banner={topBanner} logos={primaryLogos} config={headerConfig} />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>

    </html>
  );
}
