"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useCart } from "@/store";
import CartDrawer from "@/components/cart/CartDrawer";

const NAV_ITEMS = [
  { label: "Lanzamientos", href: "/lanzamientos" },
  { label: "Hombre", href: "/hombre" },
  { label: "Mujer", href: "/mujer" },
  { label: "Niños", href: "/ninos" },
  { label: "SALE", href: "/sale", sale: true },
  { label: "Accesorios", href: "/accesorios" },
  { label: "Tarjeta regalo", href: "/tarjeta-regalo" },
  { label: "Tiendas", href: "/tiendas" },
];

function IconHamburger({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <line x1="4" y1="4" x2="18" y2="18" />
          <line x1="18" y1="4" x2="4" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="19" y2="6" />
          <line x1="3" y1="11" x2="19" y2="11" />
          <line x1="3" y1="16" x2="19" y2="16" />
        </>
      )}
    </svg>
  );
}

function IconSearch() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <line x1="12.5" y1="12.5" x2="17" y2="17" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h12a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="11" cy="7" r="4" />
    </svg>
  );
}

function UserAvatar({ initial }: { initial: string }) {
  return (
    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-[#E31C23] text-white font-barlow font-bold text-xs uppercase select-none">
      {initial}
    </span>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems, toggleCart } = useCart();
  const { data: session } = useSession();

  const isCustomer = !!session?.user && (session.user as { userType?: string }).userType === "customer";
  const userInitial =
    session?.user?.name?.charAt(0) ?? session?.user?.email?.charAt(0) ?? "U";

  return (
    <>
    {/*
     * El header ocupa: barra anuncio (~32px) + barra nav (56px móvil / 64px desktop).
     * position: fixed saca el header del flujo; el padding-top del body en layout.tsx compensa.
     * z-50 garantiza que quede sobre banners y contenido de la página.
     */}
    <header className="fixed top-0 left-0 right-0 z-50 w-full">
      {/* ── Barra de anuncio ─────────────────────────────────────────── */}
      <div className="bg-[#1C1C1C] text-white text-[11px] tracking-wide text-center py-2 px-4 font-montserrat">
        Envío gratis en compras mayores a $200.000 &nbsp;·&nbsp;{" "}
        <Link
          href="/sale"
          className="text-[#E31C23] font-semibold uppercase hover:underline"
        >
          Ver SALE
        </Link>
      </div>

      {/* ── Barra de navegación ──────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E0E0E0]">
        {/* ── MÓVIL ── */}
        <div className="flex items-center justify-between h-14 px-3 md:hidden">
          {/* Menú hamburguesa */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="text-[#1C1C1C] p-2 -ml-1 rounded-sm focus-visible:outline-2 focus-visible:outline-[#E31C23]"
          >
            <IconHamburger open={menuOpen} />
          </button>

          {/* Logo centrado — p-3 = área de protección ≈ altura de "O" */}
          <Link href="/" aria-label="One Star — Inicio" className="p-3">
            <div className="relative w-[80px] h-[57px]">
              <Image
                src="/logos/logopositivo.svg"
                alt="One Star"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-1 text-[#1C1C1C]">
            <button
              onClick={toggleCart}
              aria-label="Carrito de compras"
              className="relative p-2 rounded-sm focus-visible:outline-2 focus-visible:outline-[#E31C23]"
            >
              <IconCart />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-[#E31C23] text-white text-[10px] font-montserrat font-medium rounded-full">
                  {totalItems}
                </span>
              )}
            </button>
            <Link
              href={isCustomer ? "/cuenta" : "/login"}
              aria-label="Mi cuenta"
              className="p-2 rounded-sm focus-visible:outline-2 focus-visible:outline-[#E31C23]"
            >
              {isCustomer ? <UserAvatar initial={userInitial} /> : <IconUser />}
            </Link>
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden md:flex items-center justify-between h-16 px-8 lg:px-12 xl:px-16">
          {/* Logo — p-3 = área de protección ≈ altura de "O" */}
          <Link href="/" aria-label="One Star — Inicio" className="p-3 shrink-0">
            <div className="relative w-[100px] h-[71px]">
              <Image
                src="/logos/logopositivo.svg"
                alt="One Star"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Navegación principal */}
          <nav aria-label="Menú principal">
            <ul className="flex items-center gap-5 xl:gap-7">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={[
                      "font-barlow font-semibold text-sm tracking-wide uppercase transition-colors duration-150",
                      item.sale
                        ? "text-[#E31C23]"
                        : "text-[#1C1C1C] hover:text-[#E31C23]",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-2 text-[#1C1C1C] shrink-0">
            <button
              aria-label="Buscar"
              className="p-2 rounded-sm hover:text-[#E31C23] transition-colors focus-visible:outline-2 focus-visible:outline-[#E31C23]"
            >
              <IconSearch />
            </button>
            <button
              onClick={toggleCart}
              aria-label="Carrito de compras"
              className="relative p-2 rounded-sm hover:text-[#E31C23] transition-colors focus-visible:outline-2 focus-visible:outline-[#E31C23]"
            >
              <IconCart />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-[#E31C23] text-white text-[10px] font-montserrat font-medium rounded-full">
                  {totalItems}
                </span>
              )}
            </button>
            <Link
              href={isCustomer ? "/cuenta" : "/login"}
              aria-label="Mi cuenta"
              className="p-2 rounded-sm hover:text-[#E31C23] transition-colors focus-visible:outline-2 focus-visible:outline-[#E31C23]"
            >
              {isCustomer ? <UserAvatar initial={userInitial} /> : <IconUser />}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Menú desplegable móvil ───────────────────────────────────── */}
      {menuOpen && (
        <div className="md:hidden bg-white border-b border-[#E0E0E0] shadow-lg">
          <nav aria-label="Menú móvil">
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.href} className="border-b border-[#E0E0E0] last:border-b-0">
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={[
                      "block px-6 py-4 font-barlow font-semibold text-sm tracking-wide uppercase transition-colors duration-150",
                      item.sale
                        ? "text-[#E31C23]"
                        : "text-[#1C1C1C] hover:text-[#E31C23]",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Acciones secundarias en el menú móvil */}
            <div className="flex items-center gap-4 px-6 py-4 border-t border-[#E0E0E0] text-[#4A4A4A]">
              <Link
                href={isCustomer ? "/cuenta" : "/login"}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 font-montserrat text-sm"
              >
                {isCustomer ? <UserAvatar initial={userInitial} /> : <IconUser />}
                <span>Mi cuenta</span>
              </Link>
              <Link
                href="/buscar"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 font-montserrat text-sm"
              >
                <IconSearch />
                <span>Buscar</span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
    <CartDrawer />
    </>
  );
}
