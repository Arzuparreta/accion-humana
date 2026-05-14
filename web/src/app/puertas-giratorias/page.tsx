import { supabase } from "@/lib/supabase/client"
import { RevolvingDoorExplorer } from "@/components/politicians/RevolvingDoorExplorer"

export const revalidate = 3600

export interface RDCase {
  id: string
  person_name: string
  political_party: string
  public_role: string
  public_organization: string
  public_exit_date: string | null
  private_role: string
  private_organization: string
  private_start_date: string | null
  authorization_date: string | null
  cooling_off_months: number | null
  sector: string
  person_id: string | null
  primary_source_url: string | null
  source_url: string | null
  sources: RDSource[] | null
}

export interface RDSource {
  source_type: "primary" | "secondary" | "discovery"
  source_name: string
  source_url: string
  title: string | null
  published_at: string | null
  evidence_text: string | null
}

export default async function PuertasGiratoriasPage() {
  const { data, error } = await supabase
    .from("v_revolving_door_public")
    .select("id, person_name, political_party, public_role, public_organization, public_exit_date, private_role, private_organization, private_start_date, authorization_date, cooling_off_months, sector, person_id, primary_source_url, source_url, sources")
    .order("person_name")

  if (!error) {
    return <RevolvingDoorExplorer cases={(data as RDCase[]) || []} />
  }

  const { data: legacyData } = await supabase
    .from("revolving_door")
    .select("id, person_name, political_party, public_role, public_organization, private_role, private_organization, sector, person_id, source_url")
    .order("person_name")

  const legacyCases = ((legacyData as Partial<RDCase>[]) || []).map((entry) => ({
    id: entry.id || `${entry.person_name}-${entry.private_organization}`,
    person_name: entry.person_name || "",
    political_party: entry.political_party || "",
    public_role: entry.public_role || "",
    public_organization: entry.public_organization || "",
    public_exit_date: null,
    private_role: entry.private_role || "",
    private_organization: entry.private_organization || "",
    private_start_date: null,
    authorization_date: null,
    cooling_off_months: null,
    sector: entry.sector || "Sin clasificar",
    person_id: entry.person_id || null,
    primary_source_url: null,
    source_url: entry.source_url || null,
    sources: [],
  }))

  return <RevolvingDoorExplorer cases={legacyCases} />
}
