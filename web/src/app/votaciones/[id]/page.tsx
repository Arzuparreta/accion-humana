import { supabase } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const revalidate = 3600

interface PageProps { params: Promise<{ id: string }> }

const VC: Record<string, string> = { Sí: "#22c55e", No: "#ef4444", Abstención: "#f59e0b", "No vota": "#9ca3af" }
const PC: Record<string, string> = { PP: "#0055A7", PSOE: "#E01021", VOX: "#63BE21", SUMAR: "#E01065", ERC: "#FFB232", JUNTS: "#20C0C2", "EH Bildu": "#00D4AA", "EAJ-PNV": "#008000" }

interface VoteRow { vote: string; politician: { full_name: string } | null; membership: { party: { acronym: string; color: string } } | null }

export default async function VotacionPage({ params }: PageProps) {
  const { id } = await params
  const { data: session } = await supabase.from("voting_sessions").select("*").eq("id", id).single()
  if (!session) notFound()

  const { data: votes } = await supabase
    .from("votes")
    .select("vote, politician:politicians(full_name), membership:politician_memberships!inner(party:parties(acronym, color))")
    .eq("voting_session_id", id).eq("membership.is_active", true)

  const partyGroups: Record<string, { acronym: string; color: string; votes: Record<string, number>; total: number; deputies: Array<{ name: string; vote: string }> }> = {}
  for (const v of (votes as unknown as VoteRow[]) || []) {
    const p = v.membership?.party
    if (!p) continue
    const k = p.acronym
    if (!partyGroups[k]) partyGroups[k] = { acronym: k, color: p.color || "#718096", votes: {}, total: 0, deputies: [] }
    partyGroups[k].votes[v.vote] = (partyGroups[k].votes[v.vote] || 0) + 1
    partyGroups[k].total++
    partyGroups[k].deputies.push({ name: v.politician?.full_name || "", vote: v.vote })
  }

  const divergences: Array<{ name: string; party: string; voted: string; partyVoted: string }> = []
  for (const [acr, g] of Object.entries(partyGroups)) {
    const maj = Object.entries(g.votes).sort((a, b) => b[1] - a[1])[0]?.[0]
    if (!maj) continue
    for (const d of g.deputies) { if (d.vote !== maj && d.vote !== "No vota") divergences.push({ name: d.name, party: acr, voted: d.vote, partyVoted: maj }) }
  }

  const order = ["PP", "PSOE", "VOX", "SUMAR", "ERC", "JUNTS", "EH Bildu", "EAJ-PNV"]
  const sorted = Object.entries(partyGroups).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
  const dateStr = session.date ? new Date(session.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : ""

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">Sesión {session.session_number}</Badge>
          <span className="text-sm text-muted-foreground">{dateStr}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{session.title}</h1>
        {session.initiative_number && <p className="text-sm text-muted-foreground mt-1">Exp. {session.initiative_number}</p>}
      </div>

      {divergences.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2"><CardTitle className="text-base">⚠️ {divergences.length} divergencias</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {divergences.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm border-l-2 border-orange-300 pl-3">
                <span className="font-medium">{d.name}</span>
                <span className="text-xs px-1.5 py-0 rounded" style={{ backgroundColor: (PC[d.party] || "#718096") + "20", color: PC[d.party] }}>{d.party}</span>
                <span className="text-xs">votó <b style={{ color: VC[d.voted] }}>{d.voted}</b> ≠ <b style={{ color: VC[d.partyVoted] }}>{d.partyVoted}</b> (su grupo)</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sorted.map(([acr, g]) => (
          <Card key={acr}>
            <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center justify-between sm:w-20 sm:shrink-0 sm:text-right sm:block">
                <span className="text-sm font-bold" style={{ color: g.color }}>{acr}</span>
                <span className="text-xs text-muted-foreground sm:hidden">{g.total} votos</span>
              </div>
              <div className="flex-1">
                <div className="flex h-5 rounded-full overflow-hidden bg-muted">
                  {Object.entries(g.votes).sort((a, b) => b[1] - a[1]).map(([vote, count]) => (
                    <div key={vote} style={{ width: `${(count / g.total) * 100}%`, backgroundColor: VC[vote] || "#9ca3af" }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 text-xs shrink-0 hidden sm:flex">
                {Object.entries(g.votes).sort((a, b) => b[1] - a[1]).map(([vote, count]) => (
                  <span key={vote} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: VC[vote] }} />{count}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver voto individual de cada diputado</summary>
        <div className="mt-3 space-y-1 max-h-96 overflow-y-auto border rounded-lg p-3">
          {sorted.map(([acr, g]) => (
            <div key={acr} className="mb-2">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1" style={{ color: g.color }}>{acr}</div>
              {g.deputies.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-muted/30 last:border-0">
                  <span className="truncate flex-1 mr-2">{d.name}</span>
                  <span className="font-medium" style={{ color: VC[d.vote] || "#9ca3af" }}>{d.vote}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
