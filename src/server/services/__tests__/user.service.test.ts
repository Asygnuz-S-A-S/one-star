import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed_password"),
}))

vi.mock("@/server/repositories/user.repository", () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  countUsers: vi.fn(),
  findManyCustomers: vi.fn(),
  countCustomers: vi.fn(),
  findCustomerProfileById: vi.fn(),
}))

import {
  getUserById,
  getUserByEmail,
  emailExists,
  getUserByEmailForAuth,
  registerUser,
  updateProfile,
  getTotalUsersCount,
  getCustomers,
} from "../user.service"
import {
  findUserById,
  findUserByEmail,
  createUser,
  updateUser,
  countUsers,
  findManyCustomers,
  countCustomers,
} from "@/server/repositories/user.repository"
import { hash } from "bcryptjs"

const mockFindById = vi.mocked(findUserById)
const mockFindByEmail = vi.mocked(findUserByEmail)
const mockCreate = vi.mocked(createUser)
const mockUpdate = vi.mocked(updateUser)
const mockCountUsers = vi.mocked(countUsers)
const mockFindCustomers = vi.mocked(findManyCustomers)
const mockCountCustomers = vi.mocked(countCustomers)
const mockHash = vi.mocked(hash)

const rawUser = {
  id: "user-1",
  email: "juan@example.com",
  role: "CUSTOMER",
  name: "Juan",
  lastName: "Pérez",
  phone: "3001234567",
  cedula: "123456789",
  birthDate: new Date("1990-05-15"),
  preferredBrand: "Nike",
  gender: "MALE",
  passwordHash: "hashed_password",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  emailVerified: true,
  image: null,
  banned: false,
  banReason: null,
  banExpires: null,
}

describe("getUserById", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna el DTO cuando el usuario existe", async () => {
    mockFindById.mockResolvedValue(rawUser as never)
    const result = await getUserById("user-1")
    expect(result).not.toBeNull()
    expect(result!.email).toBe("juan@example.com")
    expect(result!.name).toBe("Juan")
  })

  it("no expone passwordHash en el DTO", async () => {
    mockFindById.mockResolvedValue(rawUser as never)
    const result = await getUserById("user-1")
    expect(result).not.toHaveProperty("passwordHash")
  })

  it("retorna null cuando el usuario no existe", async () => {
    mockFindById.mockResolvedValue(null)
    const result = await getUserById("no-existe")
    expect(result).toBeNull()
  })

  it("convierte birthDate a ISO string", async () => {
    mockFindById.mockResolvedValue(rawUser as never)
    const result = await getUserById("user-1")
    expect(result!.birthDate).toBe("1990-05-15T00:00:00.000Z")
  })
})

describe("getUserByEmail", () => {
  it("retorna null cuando el email no existe", async () => {
    mockFindByEmail.mockResolvedValue(null)
    const result = await getUserByEmail("noexiste@test.com")
    expect(result).toBeNull()
  })
})

describe("emailExists", () => {
  it("retorna true si el email ya está registrado", async () => {
    mockFindByEmail.mockResolvedValue(rawUser as never)
    expect(await emailExists("juan@example.com")).toBe(true)
  })

  it("retorna false si el email no existe", async () => {
    mockFindByEmail.mockResolvedValue(null)
    expect(await emailExists("nuevo@test.com")).toBe(false)
  })
})

describe("getUserByEmailForAuth", () => {
  it("incluye passwordHash en el DTO de autenticación", async () => {
    mockFindByEmail.mockResolvedValue(rawUser as never)
    const result = await getUserByEmailForAuth("juan@example.com")
    expect(result).not.toBeNull()
    expect(result!.passwordHash).toBe("hashed_password")
  })

  it("retorna null cuando el usuario no existe", async () => {
    mockFindByEmail.mockResolvedValue(null)
    const result = await getUserByEmailForAuth("no@test.com")
    expect(result).toBeNull()
  })
})

describe("registerUser", () => {
  beforeEach(() => vi.clearAllMocks())

  it("hashea la contraseña antes de guardar", async () => {
    mockCreate.mockResolvedValue(rawUser as never)
    await registerUser({
      email: "nuevo@test.com",
      password: "pass1234",
      name: "Nuevo",
      lastName: "Usuario",
      phone: "3001234567",
      cedula: "123456789",
    })
    expect(mockHash).toHaveBeenCalledWith("pass1234", 10)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: "hashed_password" })
    )
  })

  it("convierte birthDate string a Date antes de guardar", async () => {
    mockCreate.mockResolvedValue(rawUser as never)
    await registerUser({
      email: "nuevo@test.com",
      password: "pass1234",
      name: "Nuevo",
      lastName: "Usuario",
      phone: "3001234567",
      cedula: "123456789",
      birthDate: "1995-08-20",
    })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ birthDate: new Date("1995-08-20") })
    )
  })

  it("retorna el DTO del usuario creado sin passwordHash", async () => {
    mockCreate.mockResolvedValue(rawUser as never)
    const result = await registerUser({
      email: "nuevo@test.com",
      password: "pass1234",
      name: "Nuevo",
      lastName: "Usuario",
      phone: "3001234567",
      cedula: "123456789",
    })
    expect(result.email).toBe("juan@example.com")
    expect(result).not.toHaveProperty("passwordHash")
  })
})

describe("updateProfile", () => {
  it("actualiza el perfil y retorna el DTO", async () => {
    const updated = { ...rawUser, name: "Juan Actualizado" }
    mockUpdate.mockResolvedValue(updated as never)
    const result = await updateProfile("user-1", { name: "Juan Actualizado" })
    expect(result.name).toBe("Juan Actualizado")
  })
})

describe("getTotalUsersCount", () => {
  it("delega al repositorio", async () => {
    mockCountUsers.mockResolvedValue(42)
    expect(await getTotalUsersCount()).toBe(42)
  })
})

describe("getCustomers", () => {
  beforeEach(() => vi.clearAllMocks())

  const rawCustomer = {
    id: "user-1",
    email: "juan@example.com",
    name: "Juan",
    lastName: "Pérez",
    createdAt: new Date("2024-01-01"),
    _count: { orders: 3 },
    orders: [{ total: 120000 }, { total: 80000 }, { total: 70000 }],
  }

  it("calcula el LTV sumando los totales de pedidos", async () => {
    mockFindCustomers.mockResolvedValue([rawCustomer] as never)
    mockCountCustomers.mockResolvedValue(1)
    const { customers } = await getCustomers({})
    expect(customers[0].ltv).toBe(270000)
    expect(customers[0].orderCount).toBe(3)
  })

  it("retorna paginación correcta", async () => {
    mockFindCustomers.mockResolvedValue([])
    mockCountCustomers.mockResolvedValue(0)
    await getCustomers({ page: 2, pageSize: 10 })
    expect(mockFindCustomers).toHaveBeenCalledWith(expect.anything(), 10, 10)
  })
})
