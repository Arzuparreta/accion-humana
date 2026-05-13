import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const revalidate = 3600

interface SessionRow {
  id: string
  title: string
  session_number: number
  date: string
  initiative_number?: string
  votes: Array<{ count: number }>
}

interface DivRow {
  initiative: string
}

export default async function VotacionesPage() {
  const { data: sessions } = await supabase
    .from("voting_sessions")
    .select("*, votes(count)")
    .order("date", { ascending: false })

  // Get divergences for highlights
  const { data: divergences } = await supabase.rpc("get_divergences")

  // Index divergences by session title
  const divByTitle: Record<string, number> = {}
  if (divergences) {
    for (const d of (divergences as unknown as DivRow[])) {
      const key = d.initiative?.substring(0, 60) || ""
      divByTitle[key] = (divByTitle[key] || 0) + 1
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Votaciones</h1>
        <p className="text-muted-foreground mt-1">
          Sesiones de votación de la XV Legislatura. Cada voto, enlazado a la persona.
        </p>
      </div>

      <div className="space-y-3">
        {(sessions as unknown as SessionRow[])?.map((s) => {
          const titleShort = s.title?.substring(0, 100) || ""
          const dateStr = s.date
            ? new Date(s.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
            : ""
          const divCount = divByTitle[titleShort] || 0

          return (
            <Link key={s.id} href={`/votaciones/${s.id}`}>
              <Card className="hover:border-primary/30 transition-all cursor-pointer">
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Sesión {s.session_number} · {dateStr}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {s.votes?.[0]?.count || 0} votos
                      </Badge>
                    </div>
                  </div>
                  {divCount > 0 && (
                    <Badge className="text-[10px] h-5 shrink-0 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                      ⚠️ {divCount} divergencias
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
