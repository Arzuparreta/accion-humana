import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RevolvingDoorProps {
  politicianId: string
}

export async function RevolvingDoorList({ politicianId }: RevolvingDoorProps) {
  const { data: entries } = await supabase
    .from("v_revolving_door_public")
    .select("*")
    .eq("person_id", politicianId)
    .order("private_start_date", { ascending: false, nullsFirst: false })

  if (!entries || entries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Puertas giratorias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((e) => (
          <div key={e.id} className="text-sm space-y-1 border-l-2 border-muted pl-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span>{e.public_role}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{e.private_role}</span>
              <span className="text-muted-foreground">en {e.private_organization}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {e.sector && `Sector: ${e.sector}`}
              {e.cooling_off_months != null && ` · ${e.cooling_off_months} meses entre fechas registradas`}
              {e.private_start_date && ` · ${new Date(`${e.private_start_date}T00:00:00`).toLocaleDateString("es-ES")}`}
              {(e.primary_source_url || e.source_url) && (
                <>
                  {" · "}
                  <a
                    href={e.primary_source_url || e.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Fuente
                  </a>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
