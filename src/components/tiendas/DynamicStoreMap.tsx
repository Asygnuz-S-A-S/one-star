"use client"

import dynamic from "next/dynamic"

const ClientStoreMap = dynamic(() => import("./ClientStoreMap"), { ssr: false })

interface DynamicStoreMapProps {
  position: { lat: number; lng: number }
  name: string
  address: string
}

export default function DynamicStoreMap(props: DynamicStoreMapProps) {
  return <ClientStoreMap {...props} />
}
