import type { Metadata } from "next";
import { Barlow, Montserrat } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Providers from "@/app/providers";

const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  display: "swap",
});

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
    <html
      lang="es"
      className={`${barlow.variable} ${montserrat.variable} h-full antialiased`}
    >
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
