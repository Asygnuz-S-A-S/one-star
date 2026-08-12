"use client"

import dynamic from "next/dynamic"
import React from "react"

const ClientStoreMap = dynamic(() => import("./ClientStoreMap"), { ssr: false })

export default function DynamicStoreMap(props: any) {
  return <ClientStoreMap {...props} />
}
