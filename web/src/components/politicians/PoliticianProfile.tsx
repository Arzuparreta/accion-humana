"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnnotationPanel } from "@/components/annotations/AnnotationPanel"

const VC: Record<string, string> = { Sí: "#22c55e", No: "#ef4444", Abstención: "#f59e0b", "No vota": "#9ca3af" }
const RL: Record<string, string> = { party_leader: "Responde ante", spokesperson: "Coordinado por", list_placement: "En lista por decisión de", appointed_by: "Nombrado por" }

interface Props {
  pol: Record<string, unknown>
  votes: Record<string, unknown>[]
  totalVotes: number | null
  powerRels: Record<string, unknown>[]
  revolvingDoors: Record<string, unknown>[]
}

export function PoliticianProfile({ pol: p, votes: v, totalVotes, powerRels: pr, revolvingDoors: rd }: Props) {
  const [active, setActive] = useState("power")

  const fullName = String(p.full_name || "")
  const bio = (p.raw_data as Record<string, unknown> | undefined)?.biografia as string | undefined
  const memberships = (p.politician_memberships || []) as Array<Record<string, unknown>>
  const econDecls = (p.economic_declarations || []) as Array<Record<string, unknown>>
  const current = memberships.find((m: Record<string, unknown>) => (m.legislature as Record<string, unknown> | undefined)?.is_active)
  const curParty = current?.party as Record<string, string> | undefined
  const curConstituency = String(current?.constituency || "")
  const curGroup = String(current?.group_parliamentary || "")

  const tabs = [
    { value: "power", label: "Poder" },
    { value: "votes", label: "Votos", count: totalVotes ?? 0 },
    { value: "trajectory", label: "Trayectoria" },
    ...(bio ? [{ value: "bio" as const, label: "Biografía" }] : []),
    ...(econDecls.length ? [{ value: "declarations" as const, label: "Declaraciones" }] : []),
    { value: "annotations", label: "Anotaciones" },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {curParty && (
            <Badge style={{ backgroundColor: (curParty.color || "#888") + "18", color: curParty.color, borderColor: (curParty.color || "#888") + "40" }} variant="outline" className="font-semibold text-sm px-3 py-1">
              {curParty.acronym}
            </Badge>
          )}
          {curConstituency && <span className="text-sm text-muted-foreground">{curConstituency}</span>}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{fullName}</h1>
        {curGroup && <p className="text-sm text-muted-foreground mt-1">{curGroup}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card><CardContent className="py-3 px-3 text-center"><div className="text-xl font-bold">{totalVotes ?? 0}</div><div className="text-[11px] text-muted-foreground">votos</div></CardContent></Card>
        <Card><CardContent className="py-3 px-3 text-center"><div className="text-xl font-bold">{memberships.length}</div><div className="text-[11px] text-muted-foreground">legislaturas</div></CardContent></Card>
        <Card><CardContent className="py-3 px-3 text-center"><div className="text-xl font-bold">{econDecls.length}</div><div className="text-[11px] text-muted-foreground">declaraciones</div></CardContent></Card>
      </div>

      {/* Vote distribution bar */}
      {v.length > 0 && (
        <div className="mb-5 space-y-1.5">
          {(() => {
            const counts: Record<string, number> = {}
            for (const vt of v) { const vo = String(vt.vote || ""); counts[vo] = (counts[vo] || 0) + 1 }
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
            return (
              <>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {sorted.map(([vote, count]) => (
                    <div key={vote} className="flex items-center gap-1.5 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: VC[vote] || "#9ca3af" }} />
                      <span className="font-medium">{vote}</span>
                      <span className="text-muted-foreground">{Math.round((count / v.length) * 100)}%</span>
                    </div>
                  ))}
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                  {sorted.map(([vote, count]) => (
                    <div key={vote} style={{ width: `${(count / v.length) * 100}%`, backgroundColor: VC[vote] || "#9ca3af" }} />
                  ))}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Tab bar */}
      <div className="mt-5">
        <div className="flex border-b border-border overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          {tabs.map((t) => (
            <button key={t.value} onClick={() => setActive(t.value)}
              className={cn("relative shrink-0 px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                active === t.value ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {t.label}{t.count !== undefined && <span className="ml-1 opacity-60 text-xs">{t.count}</span>}
              {active === t.value && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground rounded-full" />}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {/* POWER TAB */}
          {active === "power" && (
            <div className="space-y-4">
              {pr.length > 0 ? (
                <div className="space-y-2">
                  {pr.map((r: Record<string, unknown>, i: number) => {
                    const pty = r.party as Record<string, string> | undefined
                    const sup = r.superior as Record<string, string> | undefined
                    const relType = String(r.relationship_type || "")
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg bg-muted/50">
                        {pty && <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: pty.color + "20", color: pty.color }}>{pty.acronym}</span>}
                        <span className="text-muted-foreground text-xs">{RL[relType] || relType}</span>
                        <span className="font-medium">{sup?.full_name || "—"}</span>
                      </div>
                    )
                  })}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">Sin datos de cadena de mando.</p>}

              {rd.length > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-sm font-semibold">Puertas giratorias</h3>
                    {rd.map((e: Record<string, unknown>, i: number) => (
                      <div key={i} className="text-xs border-l-2 border-muted pl-3 py-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span>{String(e.public_role || "")}</span><span className="text-muted-foreground">→</span>
                          <span className="font-medium">{String(e.private_role || "")}</span>
                          <span className="text-muted-foreground">en {String(e.private_organization || "")}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* VOTES TAB */}
          {active === "votes" && (
            <div className="space-y-3">
              {v.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No hay votaciones registradas.</CardContent></Card>
              ) : v.slice(0, 30).map((vt: Record<string, unknown>, i: number) => {
                const ses = vt.voting_sessions as Record<string, string> | undefined
                const voteVal = String(vt.vote || "")
                const dateStr = ses?.date ? new Date(ses.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : ""
                return (
                  <Card key={i}>
                    <CardContent className="py-3 px-4 flex items-start gap-3">
                      <Badge variant="outline" className="font-bold shrink-0 mt-0.5" style={{ color: VC[voteVal] || "#9ca3af", borderColor: VC[voteVal] || "#9ca3af", backgroundColor: (VC[voteVal] || "#9ca3af") + "10" }}>{voteVal}</Badge>
                      <div className="min-w-0"><div className="text-sm font-medium">{ses?.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{dateStr}{ses?.initiative_number && ` · Exp. ${ses.initiative_number}`}</div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* TRAJECTORY TAB */}
          {active === "trajectory" && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {[...memberships].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
                    const na = (a.legislature as Record<string, number> | undefined)?.number ?? 0
                    const nb = (b.legislature as Record<string, number> | undefined)?.number ?? 0
                    return nb - na
                  }).map((m: Record<string, unknown>) => {
                    const leg = m.legislature as Record<string, unknown> | undefined
                    const pty = m.party as Record<string, string> | undefined
                    return (
                      <div key={String(m.id)} className="flex items-center gap-3 text-sm border-l-2 pl-3" style={{ borderLeftColor: pty?.color || "#718096", opacity: !!m.is_active ? 1 : 0.6 }}>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{String(leg?.name || `Legislatura ${leg?.number}`)}</div>
                          <div className="text-muted-foreground text-xs">{m.constituency ? `Circ. ${String(m.constituency)}` : ""}{m.start_date ? ` · Desde ${String(m.start_date)}` : ""}{m.end_date ? ` hasta ${String(m.end_date)}` : ""}</div>
                        </div>
                        {pty && <Badge variant="outline" className="text-xs shrink-0" style={{ borderColor: pty.color, color: pty.color, backgroundColor: pty.color + "10" }}>{pty.acronym}</Badge>}
                        {!!m.is_active && <Badge variant="outline" className="text-xs shrink-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">Activo</Badge>}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* BIO TAB */}
          {active === "bio" && bio && (
            <Card><CardContent className="p-4 sm:p-6"><p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{bio}</p></CardContent></Card>
          )}

          {/* DECLARATIONS TAB */}
          {active === "declarations" && econDecls.length > 0 && econDecls.map((d: Record<string, unknown>) => (
            <Card key={String(d.id)}>
              <CardContent className="p-4"><p className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-96">{JSON.stringify(d.raw_data, null, 2)}</p></CardContent>
            </Card>
          ))}

          {/* ANNOTATIONS TAB */}
          {active === "annotations" && <AnnotationPanel entityType="politician" entityId={String(p.id)} />}
        </div>
      </div>
    </div>
  )
}
