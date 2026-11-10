"use client"

import { useState } from "react"
import Image from "next/image"
import { productCutoutUrl } from "@/lib/cloudinary-loader"

/**
 * El producto sin fondo y recortado, grande sobre el color del panel. Si Cloudinary todavía está
 * procesando la foto (responde 423 la primera vez), muestra la original fundida con el fondo.
 */
export default function ProductCutoutImage({ src, alt, sizes, priority, className = "" }: { src: string; alt: string; sizes: string; priority?: boolean; className?: string }) {
  const cutout = productCutoutUrl(src)
  const [failed, setFailed] = useState(cutout === src)
  return (
    <Image
      src={failed ? src : cutout}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={`object-contain object-center ${failed ? "mix-blend-multiply dark:mix-blend-normal" : "drop-shadow-[0_24px_24px_rgba(0,0,0,0.18)]"} ${className}`}
    />
  )
}
