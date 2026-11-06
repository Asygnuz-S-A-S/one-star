"use client"

import { useActionState, useTransition } from "react"
import { createMcpTokenAction, revokeMcpTokenAction } from "@/server/actions/mcp-token.actions"

export interface McpTokenRow {
  id: string
  name: string
  prefix: string
  role: string
  owner: string
  expiresAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

const roleLabel = (role: string) => (role === "SUPER_ADMIN" ? "Super Admin" : "Inventario")
const date = (value: string | null) => (value ? new Date(value).toLocaleString("es-CO") : "—")

export default function McpTokensSection({ tokens, isSuperAdmin }: { tokens: McpTokenRow[]; isSuperAdmin: boolean }) {
  const [state, action, pending] = useActionState(createMcpTokenAction, null)
  const [revoking, startRevoke] = useTransition()

  return (
    <div className="space-y-5">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="mcp-name" className="block font-montserrat text-xs font-medium text-[#4A4A4A] mb-1.5 uppercase tracking-wide">
            Nombre del token
          </label>
          <input
            id="mcp-name"
            name="name"
            required
            maxLength={60}
            placeholder="Claude del Mac"
            className="w-full border border-[#E0E0E0] rounded-lg px-4 py-2.5 font-montserrat text-sm text-[#1C1C1C] focus:outline-none focus:border-[#E31C23] focus:ring-1 focus:ring-[#E31C23]"
          />
        </div>
        <div>
          <label htmlFor="mcp-role" className="block font-montserrat text-xs font-medium text-[#4A4A4A] mb-1.5 uppercase tracking-wide">
            Permiso
          </label>
          <select
            id="mcp-role"
            name="role"
            defaultValue="INVENTORY_OPERATOR"
            className="border border-[#E0E0E0] rounded-lg px-3 py-2.5 font-montserrat text-sm text-[#1C1C1C]"
          >
            <option value="INVENTORY_OPERATOR">Inventario (productos y catálogo)</option>
            {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin (también Inicio y banners)</option>}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-[#E31C23] hover:bg-[#C41920] disabled:opacity-60 text-white font-barlow font-bold text-sm uppercase tracking-widest rounded-lg px-6 py-3"
        >
          {pending ? "Creando…" : "Crear token"}
        </button>
      </form>

      {state?.error && (
        <p role="alert" className="font-montserrat text-xs text-[#E31C23]">{state.error}</p>
      )}
      {state?.token && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="font-montserrat text-xs font-semibold text-emerald-900 mb-2">
            Copia el token ahora: no se vuelve a mostrar. Vence en 90 días.
          </p>
          <code className="block break-all rounded bg-white px-3 py-2 text-xs text-[#1C1C1C] select-all">{state.token}</code>
        </div>
      )}

      {tokens.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-montserrat text-xs">
            <thead className="text-[#4A4A4A] uppercase">
              <tr>
                <th className="py-2 pr-3">Nombre</th>
                {isSuperAdmin && <th className="py-2 pr-3">Admin</th>}
                <th className="py-2 pr-3">Permiso</th>
                <th className="py-2 pr-3">Último uso</th>
                <th className="py-2 pr-3">Vence</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="py-2 pr-3 text-[#1C1C1C]">{t.name} <span className="text-[#8A8A8A]">{t.prefix}…</span></td>
                  {isSuperAdmin && <td className="py-2 pr-3">{t.owner}</td>}
                  <td className="py-2 pr-3">{roleLabel(t.role)}</td>
                  <td className="py-2 pr-3">{date(t.lastUsedAt)}</td>
                  <td className="py-2 pr-3">{date(t.expiresAt)}</td>
                  <td className="py-2 text-right">
                    {t.revokedAt ? (
                      <span className="text-[#8A8A8A]">Revocado</span>
                    ) : (
                      <button
                        type="button"
                        disabled={revoking}
                        onClick={() => {
                          if (confirm(`¿Revocar "${t.name}"? Claude dejará de tener acceso con ese token.`)) {
                            startRevoke(async () => {
                              const result = await revokeMcpTokenAction(t.id)
                              if (!result.success) alert(result.error)
                            })
                          }
                        }}
                        className="font-semibold text-[#E31C23] hover:underline disabled:opacity-60"
                      >
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
