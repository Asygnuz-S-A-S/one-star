import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"

type PublicButtonProps = {
  children: ReactNode
  className?: string
  href?: string
  variant?: "primary" | "quiet" | "outline"
} & ButtonHTMLAttributes<HTMLButtonElement>

const buttonVariants = {
  primary: "bg-[var(--store-action)] text-[var(--store-action-ink)] hover:bg-[var(--store-action-hover)]",
  quiet: "bg-transparent text-[var(--store-ink)] hover:bg-[var(--store-surface-muted)]",
  outline: "border border-[var(--store-line-strong)] bg-[var(--store-surface)] text-[var(--store-ink)] hover:bg-[var(--store-surface-muted)]",
} as const

const baseButtonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--store-radius-md)] px-4 font-barlow text-sm font-bold uppercase tracking-[0.08em] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-focus)]"

export function PublicButton({ children, className = "", href, variant = "primary", type = "button", ...props }: PublicButtonProps) {
  const classNames = `${baseButtonClass} ${buttonVariants[variant]} ${className}`.trim()

  if (href) {
    return <Link href={href} className={classNames}>{children}</Link>
  }

  return <button type={type} className={classNames} {...props}>{children}</button>
}

export function EditorialSurface({ children, className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`rounded-[var(--store-radius-lg)] bg-[var(--store-surface)] shadow-[var(--store-elevation-raised)] ${className}`.trim()} {...props}>{children}</section>
}

type SectionHeadingProps = {
  action?: ReactNode
  description?: string
  eyebrow?: string
  level?: "h1" | "h2" | "h3"
  title: string
}

export function SectionHeading({ action, description, eyebrow, level: Tag = "h2", title }: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 font-barlow text-xs font-bold uppercase tracking-[0.16em] text-[var(--store-action)]">{eyebrow}</p>}
        <Tag className="font-barlow text-3xl font-extrabold uppercase tracking-[-0.04em] text-[var(--store-ink)] md:text-4xl">{title}</Tag>
        {description && <p className="mt-2 max-w-2xl text-sm text-[var(--store-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  )
}

type MediaFrameProps = {
  alt: string
  className?: string
  fallbackLabel?: string
  priority?: boolean
  sizes?: string
  src?: string
}

export function MediaFrame({ alt, className = "", fallbackLabel = "Imagen no disponible", priority = false, sizes = "(max-width: 768px) 100vw, 50vw", src }: MediaFrameProps) {
  const frameClass = `relative aspect-[4/3] overflow-hidden rounded-[var(--store-radius-lg)] bg-[var(--store-surface-muted)] ${className}`.trim()

  if (!src) {
    return <div className={`${frameClass} flex items-center justify-center p-6 text-center`} role="img" aria-label={fallbackLabel}><span className="font-barlow text-xs font-bold uppercase tracking-[0.12em] text-[var(--store-muted)]">{fallbackLabel}</span></div>
  }

  return <div className={frameClass}><Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" /></div>
}
