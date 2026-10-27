"use client"

import { useActionState } from "react"
import { createAdminUserAction, resetAdminPasswordAction, setAdminActiveAction, updateAdminRoleAction } from "./actions"

interface AdminRow {
  id: string
  email: string
  name: string
  role: "SUPER_ADMIN" | "INVENTORY_OPERATOR"
  isActive: boolean
}

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"

function RoleForm({ admin }: { admin: AdminRow }) {
  const [state, action, pending] = useActionState(
    async (_previous: { success: boolean; error?: string } | null, formData: FormData) => updateAdminRoleAction(formData),
    null,
  )
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={admin.id} />
      <select name="role" defaultValue={admin.role} className={`${inputClass} max-w-[220px]`}>
        <option value="SUPER_ADMIN">Super Admin</option>
        <option value="INVENTORY_OPERATOR">Operador de inventario</option>
      </select>
      <button type="submit" disabled={pending} className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold">
        Guardar
      </button>
      {state?.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  )
}

function AccountForms({ admin }: { admin: AdminRow }) {
  const [activeState, activeAction, activePending] = useActionState(
    async (_previous: { success: boolean; error?: string } | null, formData: FormData) => setAdminActiveAction(formData),
    null,
  )
  const [passwordState, passwordAction, passwordPending] = useActionState(
    async (_previous: { success: boolean; error?: string } | null, formData: FormData) => resetAdminPasswordAction(formData),
    null,
  )
  return (
    <div className="space-y-2">
      <form action={activeAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={admin.id} />
        <input type="hidden" name="active" value={admin.isActive ? "false" : "true"} />
        <button type="submit" disabled={activePending} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold">
          {admin.isActive ? "Desactivar" : "Activar"}
        </button>
        <span className={`text-xs ${admin.isActive ? "text-emerald-700" : "text-red-700"}`}>{admin.isActive ? "Activa" : "Desactivada"}</span>
        {activeState?.error && <span className="text-xs text-red-700">{activeState.error}</span>}
      </form>
      <form action={passwordAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={admin.id} />
        <input name="password" type="password" minLength={10} autoComplete="new-password" placeholder="Nueva contraseña" className={`${inputClass} max-w-[220px]`} />
        <button type="submit" disabled={passwordPending} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold">
          Cambiar clave
        </button>
        {passwordState && <span className={`text-xs ${passwordState.success ? "text-emerald-700" : "text-red-700"}`}>{passwordState.success ? "Clave actualizada." : passwordState.error}</span>}
      </form>
    </div>
  )
}

export default function UsuariosManager({ admins }: { admins: AdminRow[] }) {
  const [created, createAction, creating] = useActionState(
    async (_previous: { success: boolean; error?: string } | null, formData: FormData) => createAdminUserAction(formData),
    null,
  )

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-[#4A4A4A]">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Cuenta</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-[#1C1C1C]">{admin.name}</td>
                <td className="px-4 py-3 text-[#4A4A4A]">{admin.email}</td>
                <td className="px-4 py-3">
                  <RoleForm admin={admin} />
                </td>
                <td className="px-4 py-3">
                  <AccountForms admin={admin} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={createAction} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C]">Nuevo administrador</h2>
        <div>
          <label htmlFor="admin-name" className="mb-1 block text-xs font-semibold text-[#4A4A4A]">Nombre</label>
          <input id="admin-name" name="name" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="admin-email" className="mb-1 block text-xs font-semibold text-[#4A4A4A]">Correo</label>
          <input id="admin-email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="admin-password" className="mb-1 block text-xs font-semibold text-[#4A4A4A]">Contraseña</label>
          <input id="admin-password" name="password" type="password" required minLength={10} autoComplete="new-password" className={inputClass} />
        </div>
        <div>
          <label htmlFor="admin-role" className="mb-1 block text-xs font-semibold text-[#4A4A4A]">Rol</label>
          <select id="admin-role" name="role" defaultValue="INVENTORY_OPERATOR" className={inputClass}>
            <option value="INVENTORY_OPERATOR">Operador de inventario</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
        {created && (
          <p role="status" className={`rounded-lg px-3 py-2 text-sm ${created.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {created.success ? "Usuario creado." : created.error}
          </p>
        )}
        <button type="submit" disabled={creating} className="rounded-lg bg-[#E31C23] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {creating ? "Creando…" : "Crear usuario"}
        </button>
      </form>
    </div>
  )
}
