"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { safePublicUrl } from "@/lib/safe-url";
import { normalizeTickerMessages } from "@/lib/ticker-messages";

interface BannerMessage {
  text: string;
  url?: string;
}

interface TopBannerTickerProps {
  messages: BannerMessage[] | unknown;
  fallbackText?: string;
  fallbackBtnText?: string;
  fallbackBtnUrl?: string;
  bgColor?: string;
  textColor?: string;
}

const TICKER_SECONDS_PER_MESSAGE = 6;
const TICKER_REPEATS = 4;

export default function TopBannerTicker({
  messages,
  fallbackText,
  fallbackBtnText,
  fallbackBtnUrl,
  bgColor = "#1C1C1C",
  textColor = "#FFFFFF",
}: TopBannerTickerProps) {
  const prefersReducedMotion = useReducedMotion();

  let displayMessages = normalizeTickerMessages(messages);
  if (displayMessages.length === 0) {
    if (fallbackText) {
      displayMessages = [{ text: fallbackText, url: fallbackBtnUrl }];
    } else {
      displayMessages = [{ text: "Envío gratis en compras mayores a $200.000", url: "/sale" }];
    }
  }
  displayMessages = displayMessages.map(message => ({
    ...message,
    url: message.url ? safePublicUrl(message.url, "") || undefined : undefined,
  }));

  // Un solo mensaje, o el usuario prefiere movimiento reducido:
  // banner estático con el primer mensaje, sin animación.
  if (displayMessages.length === 1 || prefersReducedMotion) {
    const msg = displayMessages[0];
    return (
      <div
        className="text-[11px] tracking-wide text-center py-2 px-4 font-montserrat flex justify-center items-center gap-2"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <span>{msg.text}</span>
        {msg.url && (
          <Link
            href={msg.url}
            className="font-semibold uppercase hover:underline"
            style={{ color: "#E31C23" }}
          >
            {fallbackBtnText || "Ver oferta"}
          </Link>
        )}
      </div>
    );
  }

  const repeatedMessages = Array.from({ length: TICKER_REPEATS }, () => displayMessages).flat();
  const durationSeconds = displayMessages.length * TICKER_SECONDS_PER_MESSAGE;

  return (
    <div
      className="onestar-ticker text-[11px] tracking-wide py-2 font-montserrat overflow-hidden whitespace-nowrap relative flex items-center"
      style={{ backgroundColor: bgColor, color: textColor, height: "32px" }}
    >
      {/*
        Animación CSS nativa: a diferencia de las animaciones JS de motion,
        `animation-play-state: paused` en :hover SÍ pausa el marquee.
        Solo se anima `transform` (compositor-friendly).
      */}
      <style>{`
        @keyframes onestar-ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .onestar-ticker-track {
          animation: onestar-ticker-scroll var(--ticker-duration, 24s) linear infinite;
        }
        .onestar-ticker:hover .onestar-ticker-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .onestar-ticker-track {
            animation: none;
          }
        }
      `}</style>
      <div
        className="onestar-ticker-track flex gap-12"
        style={{ "--ticker-duration": `${durationSeconds}s` } as CSSProperties}
      >
        {repeatedMessages.map((msg, idx) => (
          <div key={idx} className="flex items-center gap-2 shrink-0">
            <span>{msg.text}</span>
            {msg.url && (
              <Link
                href={msg.url}
                className="font-semibold uppercase hover:underline"
                style={{ color: "#E31C23" }}
              >
                {fallbackBtnText || "Ver oferta"}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
