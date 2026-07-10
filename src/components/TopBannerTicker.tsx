"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

interface BannerMessage {
  text: string;
  url?: string;
}

interface TopBannerTickerProps {
  messages: BannerMessage[];
  fallbackText?: string;
  fallbackBtnText?: string;
  fallbackBtnUrl?: string;
  bgColor?: string;
  textColor?: string;
}

export default function TopBannerTicker({
  messages,
  fallbackText,
  fallbackBtnText,
  fallbackBtnUrl,
  bgColor = "#1C1C1C",
  textColor = "#FFFFFF",
}: TopBannerTickerProps) {
  const [isHovered, setIsHovered] = useState(false);

  let displayMessages = messages;
  if (!messages || messages.length === 0) {
    if (fallbackText) {
      displayMessages = [{ text: fallbackText, url: fallbackBtnUrl }];
    } else {
      displayMessages = [{ text: "Envío gratis en compras mayores a $200.000", url: "/sale" }];
    }
  }

  if (displayMessages.length === 1) {
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

  const repeatedMessages = [...displayMessages, ...displayMessages, ...displayMessages, ...displayMessages];

  return (
    <div
      className="text-[11px] tracking-wide py-2 font-montserrat overflow-hidden whitespace-nowrap relative flex items-center"
      style={{ backgroundColor: bgColor, color: textColor, height: "32px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Usar una clase group-hover en un div wrapper o manejar el estado para pausar */}
      <motion.div
        className="flex gap-12"
        animate={isHovered ? "paused" : "running"}
        variants={{
          running: { x: ["0%", "-50%"], transition: { repeat: Infinity, ease: "linear", duration: displayMessages.length * 6 } },
          paused: { x: ["0%", "-50%"], transition: { repeat: Infinity, ease: "linear", duration: displayMessages.length * 6 } } 
        }}
        // Truco CSS para pausar más seguro
        style={{ animationPlayState: isHovered ? "paused" : "running" }}
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
      </motion.div>
    </div>
  );
}
