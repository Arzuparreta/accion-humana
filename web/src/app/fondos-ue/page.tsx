import Link from "next/link"
import { PageHeader } from "@/components/domain/PageHeader"
import { InfoPanel } from "@/components/domain/InfoPanel"
import { StatGrid } from "@/components/domain/StatGrid"
import {
  PAGE_SIZE_EU_FUNDS,
  getEuFundsPage,
  getEuFundsSummary,
  parsePage,
  type EuFundRow,
} from "@/lib/data"

export const revalidate = 3600 * 24

export const metadata = {
  title: "Fondos UE",
  description: "Beneficiarios españoles de los Fondos Estructurales y de Inversión Europeos 2014-2027, según Kohesio.",
}

interface PageProps {
  searchParams?: { page?: string }
}

function formatEuros(amount: number | null): string {
  if (amount == null) return "—"
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)} B €`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M €`
  return `${amount.toLocaleString("es-ES")} €`
}

function BeneficiaryRow({ fund, rank }: { fund: EuFundRow; rank: number }) {
  const kohesioId = fund.id.split("/").at(-1) ?? ""
  const kohesioUrl = `https://kohesio.ec.europa.eu/en/beneficiaries/${kohesioId}`

  return (
    <div
      data-slot="card"
      className="flex min-w-0 items-start justify-between gap-4 rounded-xl border bg-card/80 p-4 transition-colors hover:bg-card"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 w-7 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {rank}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium leading-snug">{fund.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {fund.number_projects != null ? `${fund.number_projects.toLocaleString("es-ES")} proyectos` : "—"}
            {fund.cofinancing_rate != null
              ? ` · ${Number(fund.cofinancing_rate).toFixed(1)} % cofinanciación UE`
              : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">{formatEuros(fund.eu_budget)}</p>
          {fund.total_budget && fund.eu_budget && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              total {formatEuros(fund.total_budget)}
            </p>
          )}
        </div>
        <a
          href={kohesioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          title="Ver en Kohesio"
        >
          Kohesio →
        </a>
      </div>
    </div>
  )
}

function Pagination({
  page,
  totalPages,
}: {
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null
  const prev = page > 1 ? page - 1 : null
  const next = page < totalPages ? page + 1 : null
  const linkClass =
    "rounded-lg border border-border/60 bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"

  return (
    <div className="flex items-center justify-between gap-4">
      {prev ? (
        <Link href={`?page=${prev}`} className={linkClass}>
          ← Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-xs text-muted-foreground">
        Página {page} de {totalPages.toLocaleString("es-ES")}
      </span>
      {next ? (
        <Link href={`?page=${next}`} className={linkClass}>
          Siguiente →
        </Link>
      ) : (
        <span />
      )}
    </div>
  )
}

export default async function FondosUEPage({ searchParams }: PageProps) {
  const page = parsePage(searchParams?.page)
  const [{ funds, total }, summary] = await Promise.all([
    getEuFundsPage(page),
    getEuFundsSummary(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE_EU_FUNDS))
  const offset = (page - 1) * PAGE_SIZE_EU_FUNDS

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Fondos europeos"
        description="Beneficiarios españoles de los fondos estructurales y de inversión europeos (ESIF) 2014-2027. Fuente: Kohesio, portal oficial de la Comisión Europea."
      />

      {summary && (
        <StatGrid
          items={[
            {
              label: "Beneficiarios",
              value: Number(summary.beneficiary_count).toLocaleString("es-ES"),
            },
            {
              label: "Fondos UE a España",
              value: formatEuros(Number(summary.total_eu_budget)),
            },
            {
              label: "Proyectos totales",
              value: Number(summary.total_projects).toLocaleString("es-ES"),
            },
            {
              label: "Cofinanciación media",
              value: summary.avg_cofinancing_rate
                ? `${Number(summary.avg_cofinancing_rate).toFixed(1)} %`
                : "—",
            },
          ]}
        />
      )}

      {funds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin datos. El ETL de Kohesio aún no ha ejecutado.
        </p>
      ) : (
        <div className="space-y-2">
          {funds.map((fund, i) => (
            <BeneficiaryRow key={fund.id} fund={fund} rank={offset + i + 1} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} />

      <InfoPanel title="Fuente y metodología">
        Datos extraídos de{" "}
        <a
          href="https://kohesio.ec.europa.eu"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Kohesio
        </a>
        , portal oficial de la Comisión Europea para los fondos estructurales ESIF 2014-2027.
        Incluye FEDER, FSE, Fondo de Cohesión, FEADER y FEMP. Los importes son la contribución
        de la UE; el presupuesto total incluye la cofinanciación nacional. Los datos se
        actualizan semanalmente desde la API pública de Kohesio.
      </InfoPanel>
    </div>
  )
}
