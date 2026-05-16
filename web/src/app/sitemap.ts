import type { MetadataRoute } from "next"
import { BRAND_URL } from "@/lib/brand"
import { getDeputyCards, getParties } from "@/lib/data"

export const revalidate = 86400

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/",                   changeFrequency: "daily",   priority: 1.0 },
  { path: "/diputados",          changeFrequency: "daily",   priority: 0.9 },
  { path: "/votaciones",         changeFrequency: "daily",   priority: 0.9 },
  { path: "/distorsion",         changeFrequency: "weekly",  priority: 0.8 },
  { path: "/gobierno",           changeFrequency: "weekly",  priority: 0.8 },
  { path: "/senado",             changeFrequency: "weekly",  priority: 0.7 },
  { path: "/instituciones",      changeFrequency: "weekly",  priority: 0.7 },
  { path: "/partidos",           changeFrequency: "weekly",  priority: 0.7 },
  { path: "/puertas-giratorias", changeFrequency: "weekly",  priority: 0.8 },
  { path: "/contratos",          changeFrequency: "daily",   priority: 0.8 },
  { path: "/subvenciones",       changeFrequency: "daily",   priority: 0.8 },
  { path: "/presupuestos",       changeFrequency: "monthly", priority: 0.7 },
  { path: "/fondos-ue",          changeFrequency: "weekly",  priority: 0.7 },
  { path: "/indicadores",        changeFrequency: "weekly",  priority: 0.6 },
  { path: "/organizaciones",     changeFrequency: "weekly",  priority: 0.6 },
  { path: "/estado-datos",       changeFrequency: "weekly",  priority: 0.5 },
  { path: "/buscar",             changeFrequency: "monthly", priority: 0.4 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BRAND_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  let deputyEntries: MetadataRoute.Sitemap = []
  let partyEntries: MetadataRoute.Sitemap = []

  try {
    const [deputies, parties] = await Promise.all([getDeputyCards(), getParties()])

    deputyEntries = (deputies as { id: string }[]).map((d) => ({
      url: `${BRAND_URL}/diputados/${d.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))

    partyEntries = (parties as { id: string }[]).map((p) => ({
      url: `${BRAND_URL}/partidos/${p.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))
  } catch {
    // Si Supabase está caído en build/ISR, devolvemos al menos las rutas estáticas.
  }

  return [...staticEntries, ...deputyEntries, ...partyEntries]
}
