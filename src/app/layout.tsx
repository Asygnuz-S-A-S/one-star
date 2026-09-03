import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import PublicSiteFrame from "@/components/PublicSiteFrame";
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
  const nonce = (await headers()).get("x-nonce") ?? undefined;

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

  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-white text-[#1C1C1C] dark:bg-[#0f0f0f] dark:text-[#f5f5f7] transition-colors duration-300">
        <Providers nonce={nonce}>
          <PublicSiteFrame
            items={navigationItems}
            banner={topBanner}
            logos={primaryLogos}
            config={headerConfig}
          >
            {children}
          </PublicSiteFrame>
        </Providers>
      </body>

    </html>
  );
}
