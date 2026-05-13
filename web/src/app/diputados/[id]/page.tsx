import type { PoliticianMembership, Vote, EconomicDeclaration } from "@/types"
import { supabase } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PoliticianTimeline } from "@/components/politicians/PoliticianTimeline"
import { VotingHistory } from "@/components/politicians/VotingHistory"
import { VoteStats } from "@/components/politicians/VoteStats"
import { PowerChain } from "@/components/politicians/PowerChain"
import { RevolvingDoorList } from "@/components/politicians/RevolvingDoorList"
import { EconomicDeclarationView } from "@/components/politicians/EconomicDeclaration"
import { AnnotationPanel } from "@/components/annotations/AnnotationPanel"

export const revalidate = 3600

interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const { data } = await supabase.from("politicians").select("full_name").eq("id", id).single()
  return { title: data?.full_name || "Diputado" }
}

export default async function PoliticianPage({ params }: PageProps) {
  const { id } = await params

  const { data: pol } = await supabase
    .from("politicians")
    .select(`*, politician_memberships(*, party:parties(*), legislature:legislatures(*)), economic_declarations(*)`)
    .eq("id", id).single()

  if (!pol) notFound()

  const currentMembership = (pol.politician_memberships as PoliticianMembership[] | undefined)?.find(m => m.legislature?.is_active)

  const { data: votes } = await supabase
    .from("votes")
    .select("vote, voting_sessions!inner(date, title, initiative_number)")
    .eq("politician_id", id)
    .order("date", { ascending: false, foreignTable: "voting_sessions" })
    .limit(30)

  const { count: totalVotes } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("politician_id", id)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {currentMembership?.party && (
            <Badge style={{ backgroundColor: currentMembership.party.color + "1a", color: currentMembership.party.color, borderColor: currentMembership.party.color + "40" }} variant="outline" className="font-semibold text-sm px-3 py-1">
              {currentMembership.party.acronym}
            </Badge>
          )}
          {currentMembership?.constituency && (
            <span className="text-sm text-muted-foreground">{currentMembership.constituency}</span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{pol.full_name}</h1>
        {currentMembership?.group_parliamentary && (
          <p className="text-sm text-muted-foreground mt-1">{currentMembership.group_parliamentary}</p>
        )}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Card><CardContent className="py-3 px-4 text-center">
          <div className="text-xl sm:text-2xl font-bold">{totalVotes ?? 0}</div>
          <div className="text-[11px] sm:text-xs text-muted-foreground">votos</div>
        </CardContent></Card>
        <Card><CardContent className="py-3 px-4 text-center">
          <div className="text-xl sm:text-2xl font-bold">{pol.politician_memberships?.length ?? 0}</div>
          <div className="text-[11px] sm:text-xs text-muted-foreground">legislaturas</div>
        </CardContent></Card>
        <Card><CardContent className="py-3 px-4 text-center">
          <div className="text-xl sm:text-2xl font-bold">{pol.economic_declarations?.length ?? 0}</div>
          <div className="text-[11px] sm:text-xs text-muted-foreground">declaraciones</div>
        </CardContent></Card>
        <Card><CardContent className="py-3 px-4 text-center">
          <div className="text-xl sm:text-2xl font-bold">—</div>
          <div className="text-[11px] sm:text-xs text-muted-foreground">contratos</div>
        </CardContent></Card>
      </div>

      {/* Vote distribution bar */}
      <div className="mb-8"><VoteStats politicianId={id} /></div>

      {/* Section: Power chain */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Cadena de mando</h2>
        <PowerChain politicianId={id} />
        <div className="mt-3"><RevolvingDoorList politicianId={id} /></div>
      </section>

      {/* Section: Voting history */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          Historial de voto
          {totalVotes && totalVotes > 0 && <span className="text-sm font-normal text-muted-foreground ml-2">({totalVotes} votos)</span>}
        </h2>
        <VotingHistory votes={(votes as unknown as Vote[]) || []} politicianId={id} />
      </section>

      {/* Section: Trajectory */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Trayectoria parlamentaria</h2>
        <PoliticianTimeline memberships={(pol.politician_memberships as PoliticianMembership[]) || []} />
      </section>

      {/* Biography */}
      {pol.raw_data?.biografia && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Biografía</h2>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{String(pol.raw_data.biografia)}</p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Economic declarations */}
      {(pol.economic_declarations as EconomicDeclaration[])?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Declaraciones de bienes</h2>
          {(pol.economic_declarations as EconomicDeclaration[]).map(d => (
            <EconomicDeclarationView key={d.id} declaration={d} />
          ))}
        </section>
      )}

      {/* Annotations */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Anotaciones de la comunidad</h2>
        <AnnotationPanel entityType="politician" entityId={id} />
      </section>
    </div>
  )
}
