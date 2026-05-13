import { supabase } from "@/lib/supabase/client"

const REL_LABELS: Record<string, string> = {
  party_leader: "Responde ante", spokesperson: "Coordinado por",
  list_placement: "En lista por decisión de", appointed_by: "Nombrado por",
}

interface PRRow {
  id: string
  relationship_type: string
  description?: string
  superior?: { full_name: string } | null
  party?: { acronym: string; color: string } | null
}

export async function PowerChain({ politicianId }: { politicianId: string }) {
  const { data: rels } = await supabase
    .from("power_relationships")
    .select("*, superior:superior_id(full_name), party:parties(acronym, color)")
    .eq("person_id", politicianId)

  if (!rels || rels.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sin datos de cadena de mando.</p>
  }

  return (
    <div className="space-y-2">
      {(rels as unknown as PRRow[]).map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg bg-muted/50">
          {r.party && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: r.party.color + "20", color: r.party.color }}>
              {r.party.acronym}
            </span>
          )}
          <span className="text-muted-foreground text-xs">{REL_LABELS[r.relationship_type] || r.relationship_type}</span>
          <span className="font-medium">{r.superior?.full_name || "—"}</span>
          {r.description && <span className="text-muted-foreground text-xs hidden sm:inline">· {r.description}</span>}
        </div>
      ))}
    </div>
  )
}
