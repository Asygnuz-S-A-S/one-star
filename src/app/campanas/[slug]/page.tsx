import { permanentRedirect } from "next/navigation"

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> }

/** Las landings ahora viven en /<slug>; los enlaces viejos a /campanas/<slug> redirigen (301). */
export default async function CampaignRedirect({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview } = await searchParams
  permanentRedirect(slug === "home" ? "/" : `/${encodeURIComponent(slug)}${preview === "true" ? "?preview=true" : ""}`)
}
