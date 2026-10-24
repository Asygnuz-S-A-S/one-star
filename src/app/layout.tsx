import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import PublicSiteFrame from "@/components/PublicSiteFrame";
import StoreIntro, { STORE_INTRO_SCRIPT } from "@/components/StoreIntro";
import Providers from "@/app/providers";
import MetaPixel from "@/components/tracking/MetaPixel";

export const metadata: Metadata = {
  title: "One Star | Urban Performance",
  description:
    "Tienda de calzado urbano y deportivo premium. Nike, New Balance, Veja y más.",
};

import { getActiveNavigationItems } from "@/server/repositories/navigation.repository";
import { getTopBanner } from "@/server/repositories/top-banner.repository";
import { getPrimaryLogos } from "@/server/repositories/site-logo.repository";
import { getHeaderConfig } from "@/server/repositories/header-config.repository";
import { getMetaPixelPublicConfig, getPublicStorefrontConfig } from "@/server/services/store-settings.service";
import { DEFAULT_SHIPPING_RATES } from "@/lib/shipping";
import { DEFAULT_CHAT_WELCOME, DEFAULT_FOOTER_LINKS } from "@/lib/storefront-copy";
import { DEFAULT_GIFT_CARD_LIMITS } from "@/lib/gift-card";
import { ShippingRatesProvider } from "@/components/storefront/ShippingRatesProvider";

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Queries independientes en paralelo; si la BD falla, la página
  // se renderiza con fallbacks en lugar de caerse entera.
  const [navigationItems, topBanner, primaryLogos, headerConfig, metaPixel, storefront] = await Promise.all([
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
    getMetaPixelPublicConfig().catch((error: unknown) => {
      console.error("[layout] getMetaPixelPublicConfig falló:", error);
      return null;
    }),
    getPublicStorefrontConfig().catch((error: unknown) => {
      console.error("[layout] getPublicStorefrontConfig falló:", error);
      return {
        shipping: DEFAULT_SHIPPING_RATES,
        chatEnabled: true,
        chatWelcome: DEFAULT_CHAT_WELCOME,
        giftCardValidityMonths: DEFAULT_GIFT_CARD_LIMITS.validityMonths,
        footerLinks: DEFAULT_FOOTER_LINKS,
        storeName: "One Star",
        contactEmail: null,
        whatsapp: null,
      };
    }),
  ]);

  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-white text-[#1C1C1C] dark:bg-[#0f0f0f] dark:text-[#f5f5f7] transition-colors duration-300">
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: STORE_INTRO_SCRIPT }} />
        <StoreIntro />
        <a href="#contenido-principal" className="skip-link">
          Saltar al contenido principal
        </a>
        <Providers nonce={nonce}>
          <ShippingRatesProvider rates={storefront.shipping} giftCardValidityMonths={storefront.giftCardValidityMonths}>
          {metaPixel && <MetaPixel pixelId={metaPixel.pixelId} />}
          <PublicSiteFrame
            items={navigationItems}
            banner={topBanner}
            logos={primaryLogos}
            config={headerConfig}
            chatEnabled={storefront.chatEnabled}
            chatWelcome={storefront.chatWelcome}
            footerLinks={storefront.footerLinks}
            storeName={storefront.storeName}
            contactEmail={storefront.contactEmail}
            whatsapp={storefront.whatsapp}
          >
            {children}
          </PublicSiteFrame>
          </ShippingRatesProvider>
        </Providers>
      </body>

    </html>
  );
}
