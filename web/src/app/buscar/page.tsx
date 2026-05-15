import { PageHeader } from "@/components/domain/PageHeader"
import { SearchResults } from "@/components/search/SearchResults"
import { SearchForm } from "@/components/search/SearchForm"
import { searchGlobal } from "@/lib/data"

interface PageProps {
  searchParams?: { q?: string }
}

export function generateMetadata({ searchParams }: PageProps) {
  const q = searchParams?.q
  return {
    title: q ? `"${q}" — Búsqueda` : "Búsqueda",
  }
}

export default async function BuscarPage({ searchParams }: PageProps) {
  const query = searchParams?.q?.trim() ?? ""
  const results = query.length >= 2 ? await searchGlobal(query, 6) : []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Búsqueda"
        description="Diputados, votaciones, contratos, organizaciones y puertas giratorias."
      />
      <SearchForm initialQuery={query} />
      <SearchResults query={query} results={results} />
    </div>
  )
}
