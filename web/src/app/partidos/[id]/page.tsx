import { notFound } from "next/navigation"
import { PoliticianCard } from "@/components/politicians/PoliticianCard"
import { PageHeader } from "@/components/domain/PageHeader"
import { StatGrid } from "@/components/domain/StatGrid"
import { getPartyPageData } from "@/lib/data"
import type { PoliticianWithMemberships } from "@/types"

export const revalidate = 3600

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const { party } = await getPartyPageData(id)
  return { title: party?.acronym ?? "Partido" }
}

export default async function PartyPage({ params }: PageProps) {
  const { id } = await params
  const { party, memberships, stats } = await getPartyPageData(id)
  if (!party) notFound()

  const statItems = [
    { label: "Diputados activos", value: memberships.length, hint: "Escaños con membresía activa en la XV Legislatura." },
    ...(stats
      ? [
          { label: "Asistencia media", value: `${stats.attendance_pct ?? "—"}%`, hint: "Promedio del grupo en votaciones nominales." },
          { label: "Votos a favor", value: `${stats.pct_yes ?? "—"}%`, hint: "Porcentaje de votos 'Sí' sobre el total registrado." },
          { label: "Votos en contra", value: `${stats.pct_no ?? "—"}%`, hint: "Porcentaje de votos 'No' sobre el total registrado." },
          { label: "Abstenciones", value: `${stats.pct_abstain ?? "—"}%`, hint: "Porcentaje de abstenciones sobre el total registrado." },
        ]
      : []),
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={party.acronym}
        description={party.name}
        eyebrow={
          <div
            className="h-3 w-3 rounded-full border border-border/60"
            style={{ backgroundColor: party.color }}
          />
        }
      />

      <StatGrid items={statItems} />

      <div className="ui-grid-cards">
        {memberships.map((m) => {
          const pol = m.politician as unknown as Record<string, unknown>
          return (
            <PoliticianCard
              key={pol.id as string}
              politician={{ ...pol, politician_memberships: [m] } as unknown as PoliticianWithMemberships}
            />
          )
        })}
      </div>
    </div>
  )
}
