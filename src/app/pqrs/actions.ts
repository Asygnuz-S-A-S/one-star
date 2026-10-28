"use server"

import { headers } from "next/headers"
import { submitPqrsRequest, type SubmitPqrsResult } from "@/server/services/pqrs.service"

export async function submitPqrsAction(data: unknown): Promise<SubmitPqrsResult> {
  const reqHeaders = await headers()
  return submitPqrsRequest(data, reqHeaders)
}
