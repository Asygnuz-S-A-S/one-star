import "server-only"
import { joinClub } from "@/server/services/club.service"
import { hash } from "bcryptjs"
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  countUsers,
  findManyCustomers,
  countCustomers,
  findCustomerProfileById,
  findNewsletterSubscribers,
} from "../repositories/user.repository"
import type { CreateUserDTO, UpdateUserDTO } from "../validators/user.validator"
import type { User } from "@prisma/client"

export interface UserDTO {
  id: string
  email: string
  role: string
  name: string | null
  lastName: string | null
  phone: string | null
  cedula: string | null
  birthDate: string | null
  preferredBrand: string | null
  gender: string | null
  createdAt: string
}

export interface UserAuthDTO extends UserDTO {
  passwordHash: string
}

export interface CustomerListDTO {
  id: string
  email: string
  name: string | null
  lastName: string | null
  orderCount: number
  ltv: number
  createdAt: string
  clubMember: boolean
  newsletter: boolean
}

export type CustomerProfileDTO = Awaited<ReturnType<typeof findCustomerProfileById>>

function mapToDTO(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    lastName: user.lastName,
    phone: user.phone,
    cedula: user.cedula,
    birthDate: user.birthDate ? user.birthDate.toISOString() : null,
    preferredBrand: user.preferredBrand,
    gender: user.gender,
    createdAt: user.createdAt.toISOString(),
  }
}

function mapToAuthDTO(user: User): UserAuthDTO {
  return { ...mapToDTO(user), passwordHash: user.passwordHash }
}

export async function getUserById(id: string): Promise<UserDTO | null> {
  const user = await findUserById(id)
  return user ? mapToDTO(user) : null
}

export async function getUserByEmail(email: string): Promise<UserDTO | null> {
  const user = await findUserByEmail(email)
  return user ? mapToDTO(user) : null
}

export async function emailExists(email: string): Promise<boolean> {
  const user = await findUserByEmail(email)
  return !!user
}

export async function getUserByEmailForAuth(email: string): Promise<UserAuthDTO | null> {
  const user = await findUserByEmail(email)
  return user ? mapToAuthDTO(user) : null
}

export async function registerUser(data: CreateUserDTO): Promise<UserDTO> {
  const passwordHash = await hash(data.password, 10)

  const user = await createUser({
    email: data.email,
    passwordHash,
    name: data.name,
    lastName: data.lastName,
    phone: data.phone,
    cedula: data.cedula,
    birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    preferredBrand: data.preferredBrand,
    gender: data.gender,
    ...(data.newsletter ? { marketingConsentAt: new Date(), marketingConsentVersion: "v2.0" } : {}),
  })

  if (data.joinClub) await joinClub(user.id, { newsletter: Boolean(data.newsletter) })

  return mapToDTO(user)
}

export async function updateProfile(id: string, data: UpdateUserDTO): Promise<UserDTO> {
  const user = await updateUser(id, {
    ...data,
    ...(data.birthDate ? { birthDate: new Date(data.birthDate) } : {}),
  })
  return mapToDTO(user)
}

export async function getTotalUsersCount(): Promise<number> {
  return countUsers()
}

export async function getCustomers(params: {
  q?: string
  page?: number
  pageSize?: number
  /** "club" = miembros de One Star Club; "newsletter" = aceptaron recibir correos. */
  segment?: "club" | "newsletter"
}): Promise<{ customers: CustomerListDTO[]; total: number }> {
  const { q = "", page = 1, pageSize = 25, segment } = params
  const where = {
    role: "CUSTOMER" as const,
    ...(q
      ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }] }
      : {}),
    ...(segment === "club" ? { clubMember: true } : {}),
    ...(segment === "newsletter" ? { marketingConsentAt: { not: null } } : {}),
  }

  const [rows, total] = await Promise.all([
    findManyCustomers(where, pageSize, (page - 1) * pageSize),
    countCustomers(where),
  ])

  const customers: CustomerListDTO[] = rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    lastName: u.lastName,
    orderCount: u._count.orders,
    ltv: u.orders.reduce((sum, o) => sum + Number(o.total), 0),
    createdAt: u.createdAt.toISOString(),
    clubMember: u.clubMember,
    newsletter: u.marketingConsentAt !== null,
  }))

  return { customers, total }
}

export async function getCustomerProfile(id: string): Promise<CustomerProfileDTO> {
  return findCustomerProfileById(id)
}

/** Suscriptores del newsletter (solo quienes dieron consentimiento) para exportar a la herramienta de correo. */
export async function getNewsletterSubscribers(): Promise<{ email: string; name: string; clubMember: boolean; consentAt: string }[]> {
  const rows = await findNewsletterSubscribers()
  return rows.map((user) => ({
    email: user.email,
    name: [user.name, user.lastName].filter(Boolean).join(" "),
    clubMember: user.clubMember,
    consentAt: user.marketingConsentAt!.toISOString(),
  }))
}
