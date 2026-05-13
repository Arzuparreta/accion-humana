"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const PC: Record<string, string> = { PP: "#0055A7", PSOE: "#E01021", VOX: "#63BE21", SUMAR: "#E01065" }

interface RDCase {
  person_name: string
  political_party: string
  public_role: string
  public_organization: string
  private_role: string
  private_organization: string
  sector: string
  person_id: string | null
}

export default function PuertasGiratoriasPage() {
  const [active, setActive] = useState("all")
  const [cases, setCases] = useState<RDCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from("revolving_door").select("*").order("person_name").then(({ data }) => {
      setCases((data as RDCase[]) || [])
      setLoading(false)
    })
  }, [])

  const uniquePeople = new Set(cases.map(c => c.person_name)).size

  const sectors = Array.from(new Set(cases.map(c => c.sector || "Sin clasificar"))).sort()
  const tabs = [
    { value: "all", label: `Todos (${cases.length})` },
    ...sectors.map(s => ({ value: s, label: s })),
    { value: "about", label: "¿Qué son?" },
  ]

  const filtered = active === "all" ? cases : cases.filter(c => (c.sector || "Sin clasificar") === active)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Puertas giratorias</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {uniquePeople} personas · {cases.length} movimientos documentados entre sector público y privado
        </p>
      </div>

      <div className="flex border-b border-border overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        {tabs.map((t) => (
          <button key={t.value} onClick={() => setActive(t.value)}
            className={cn("relative shrink-0 px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              active === t.value ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
            {active === t.value && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground rounded-full" />}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* About tab */}
        {active === "about" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Qué son las puertas giratorias?</CardTitle>
              <CardDescription>
                El movimiento de altos cargos entre el sector público y el privado. Un ex-ministro regula un sector,
                luego ficha por una empresa de ese mismo sector. La información y los contactos obtenidos en el cargo
                público se monetizan en el privado. En España, 3 de cada 10 ministros dejan la política y fichan por
                la empresa privada.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Fuente: Wikipedia, Civio. La Ley 5/2006 establece un periodo de incompatibilidad de 2 años para altos
              cargos que pasan al sector privado, pero no impide el movimiento en sí.
            </CardContent>
          </Card>
        )}

        {/* Cases by sector or all */}
        {active !== "about" && (
          <div className="space-y-6">
            {loading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando...</CardContent></Card>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Sin datos en este sector.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-3">
                  {filtered.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs sm:text-sm border-l-2 border-muted pl-2 sm:pl-3 py-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium truncate">{e.person_name}</span>
                          {e.political_party && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ backgroundColor: (PC[e.political_party] || "#718096") + "20", color: PC[e.political_party] || "#718096" }}>
                              {e.political_party}
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-[11px] sm:text-xs mt-0.5">
                          {e.public_role} en {e.public_organization}{" → "}
                          <span className="font-medium text-foreground">{e.private_role}</span> en {e.private_organization}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
