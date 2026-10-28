import "server-only"

import { prisma } from "@/server/db/prisma"
import type { Prisma, PqrsRequest, PqrsStatus, PqrsType } from "@prisma/client"

export interface CreatePqrsInput {
  ticketNumber: string
  name: string
  documentType: string
  documentNumber: string
  email: string
  phone?: string | null
  type: PqrsType
  description: string
}

export async function createPqrsRecord(data: CreatePqrsInput): Promise<PqrsRequest> {
  return prisma.pqrsRequest.create({
    data: {
      ticketNumber: data.ticketNumber,
      name: data.name,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      email: data.email.trim().toLowerCase(),
      phone: data.phone ?? null,
      type: data.type,
      description: data.description,
      status: "PENDIENTE",
    },
  })
}

export async function findManyPqrsRecords(params?: {
  status?: PqrsStatus
  type?: PqrsType
  take?: number
  skip?: number
}): Promise<{ items: PqrsRequest[]; total: number }> {
  const where: Prisma.PqrsRequestWhereInput = {
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.type ? { type: params.type } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.pqrsRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params?.take ?? 50,
      skip: params?.skip ?? 0,
    }),
    prisma.pqrsRequest.count({ where }),
  ])

  return { items, total }
}

export async function findPqrsRecordById(id: string): Promise<PqrsRequest | null> {
  return prisma.pqrsRequest.findUnique({
    where: { id },
  })
}

export async function updatePqrsStatusRecord(
  id: string,
  data: {
    status: PqrsStatus
    responseNotes?: string | null
    respondedAt?: Date | null
  }
): Promise<PqrsRequest> {
  return prisma.pqrsRequest.update({
    where: { id },
    data: {
      status: data.status,
      responseNotes: data.responseNotes,
      respondedAt: data.respondedAt ?? (data.status === "RESUELTO" ? new Date() : undefined),
    },
  })
}
