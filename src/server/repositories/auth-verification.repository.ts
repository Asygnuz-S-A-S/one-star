import "server-only"

import { prisma } from "@/server/db/prisma"

export async function createAuthVerification(data: {
  id: string
  identifier: string
  value: string
  expiresAt: Date
}) {
  return prisma.authVerification.create({ data })
}

export async function findAuthVerificationByValue(value: string) {
  return prisma.authVerification.findFirst({
    where: { value },
  })
}

export async function findAuthVerificationByIdentifierAndValue(
  identifier: string,
  value: string
) {
  return prisma.authVerification.findFirst({
    where: { identifier, value },
  })
}

export async function deleteAuthVerification(id: string) {
  return prisma.authVerification.delete({
    where: { id },
  })
}

export async function deleteExpiredAuthVerifications(now = new Date()) {
  return prisma.authVerification.deleteMany({
    where: { expiresAt: { lte: now } },
  })
}

export async function deleteAuthVerificationsByIdentifier(identifier: string) {
  return prisma.authVerification.deleteMany({
    where: { identifier },
  })
}
