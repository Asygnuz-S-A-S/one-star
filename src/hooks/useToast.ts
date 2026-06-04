"use client"

import { useState, useCallback, useEffect, useRef } from "react"

type ToastType = "success" | "error" | "info"

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface UseToastReturn {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  dismissToast: (id: number) => void
}

let nextId = 0

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++nextId
      setToasts((prev) => [...prev, { id, message, type }])
      const timer = setTimeout(() => dismissToast(id), 3000)
      timers.current.set(id, timer)
    },
    [dismissToast]
  )

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  return { toasts, showToast, dismissToast }
}
