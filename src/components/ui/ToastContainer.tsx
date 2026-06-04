"use client"

interface Toast {
  id: number
  message: string
  type: "success" | "error" | "info"
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

const typeStyles: Record<Toast["type"], string> = {
  success: "bg-green-600 text-white",
  error: "bg-[#E31C23] text-white",
  info: "bg-[#1C1C1C] text-white",
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 shadow-lg font-montserrat text-sm max-w-xs pointer-events-auto ${typeStyles[toast.type]}`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            aria-label="Cerrar notificación"
            className="opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
