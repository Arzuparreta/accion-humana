"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const ELECTION_2023 = {
  date: "23 de julio de 2023", totalVotes: 24413509, totalSeats: 350, census: 37446646, participation: 66.0,
  results: [
    { party: "PP", votes: 8094840, seats: 137, color: "#0055A7", pctVote: 33.1 },
    { party: "PSOE", votes: 7821979, seats: 121, color: "#E01021", pctVote: 32.0 },
    { party: "VOX", votes: 3057000, seats: 33, color: "#63BE21", pctVote: 12.4 },
    { party: "SUMAR", votes: 3014006, seats: 31, color: "#E01065", pctVote: 12.3 },
    { party: "ERC", votes: 466020, seats: 7, color: "#FFB232", pctVote: 1.9 },
    { party: "JUNTS", votes: 395429, seats: 7, color: "#20C0C2", pctVote: 1.6 },
    { party: "EH Bildu", votes: 335129, seats: 6, color: "#00D4AA", pctVote: 1.4 },
    { party: "EAJ-PNV", votes: 277289, seats: 5, color: "#008000", pctVote: 1.1 },
    { party: "BNG", votes: 153995, seats: 1, color: "#6CB6FF", pctVote: 0.6 },
    { party: "CCa", votes: 116363, seats: 1, color: "#FFD700", pctVote: 0.5 },
    { party: "UPN", votes: 52544, seats: 1, color: "#2A52BE", pctVote: 0.2 },
  ],
  provinces: [
    { name: "Soria", seats: 2, effectiveThreshold: 25.0, description: "Necesitas ~25% para optar a escaño en provincias de 2 diputados" },
    { name: "Ávila", seats: 3, effectiveThreshold: 16.7, description: "Con 3 escaños, el umbral efectivo es ~17%" },
    { name: "Segovia", seats: 3, effectiveThreshold: 16.7, description: "3 escaños — misma distorsión que Ávila" },
    { name: "Teruel", seats: 3, effectiveThreshold: 16.7, description: "3 escaños, mismo umbral ~17%" },
    { name: "Zamora", seats: 3, effectiveThreshold: 16.7, description: "Provincia de 3 escaños" },
    { name: "Madrid", seats: 37, effectiveThreshold: 1.4, description: "En Madrid (37 escaños), ~1.4% puede bastar" },
    { name: "Barcelona", seats: 32, effectiveThreshold: 1.6, description: "Barcelona (32 escaños), ~1.6% umbral" },
  ],
}

export default function DistorsionElectoralPage() {
  const [active, setActive] = useState("votes-per-seat")

  const { results, provinces } = ELECTION_2023

  const withVps = results.map(r => ({
    ...r, votesPerSeat: Math.round(r.votes / r.seats), pctSeats: (r.seats / 350) * 100,
  })).sort((a, b) => a.votesPerSeat - b.votesPerSeat)

  const maxVps = Math.max(...withVps.map(r => r.votesPerSeat))
  const minVps = Math.min(...withVps.map(r => r.votesPerSeat))

  const tabs = [
    { value: "votes-per-seat", label: "Votos por escaño" },
    { value: "pct-votes", label: "% Votos vs % Escaños" },
    { value: "threshold", label: "Umbral provincial" },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Distorsión electoral</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Elecciones generales del {ELECTION_2023.date} · {ELECTION_2023.totalSeats} escaños · Participación {ELECTION_2023.participation}%
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
        {/* TAB: Votes per seat */}
        {active === "votes-per-seat" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Cuántos votos cuesta cada escaño?</CardTitle>
              <CardDescription>La ley D&apos;Hondt combinada con provincias pequeñas distorsiona la representación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {withVps.map((r) => (
                <div key={r.party} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div className="w-10 sm:w-16 text-right font-medium shrink-0" style={{ color: r.color }}>{r.party}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="h-5 sm:h-6 rounded" style={{ width: `${Math.max((r.votesPerSeat / maxVps) * 100, 4)}%`, backgroundColor: r.color + "30", borderLeft: `3px solid ${r.color}` }} />
                      <span className="text-[10px] sm:text-xs shrink-0 sm:w-16 text-right tabular-nums">{r.votesPerSeat.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0 w-8 sm:w-12 text-right">{r.seats} esc.</span>
                </div>
              ))}
              <div className="text-xs text-muted-foreground pt-2 border-t mt-4">
                Un escaño de {withVps[0]?.party} (&quot;cuesta&quot; {withVps[0]?.votesPerSeat.toLocaleString()} votos) vale igual que uno de{" "}
                {withVps[withVps.length - 1]?.party} ({withVps[withVps.length - 1]?.votesPerSeat.toLocaleString()} votos). Diferencia: {(maxVps / minVps).toFixed(1)}x.
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB: % Votes vs % Seats */}
        {active === "pct-votes" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">% de votos vs % de escaños</CardTitle>
              <CardDescription>Ningún partido recibe el mismo porcentaje de escaños que de votos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {withVps.map((r) => {
                const diff = (r.seats / 350) * 100 - r.pctVote
                const cls = diff > 1 ? "text-green-600" : diff < -0.5 ? "text-red-600" : "text-muted-foreground"
                return (
                  <div key={r.party} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm flex-wrap">
                    <span className="w-10 sm:w-12 text-right font-medium" style={{ color: r.color }}>{r.party}</span>
                    <span className="w-14 sm:w-16 text-right">{r.pctVote.toFixed(1)}% votos</span>
                    <span className="text-[10px]">→</span>
                    <span className="w-14 sm:w-16 font-medium">{(r.seats / 350 * 100).toFixed(1)}% esc.</span>
                    <span className={`text-[10px] sm:text-xs ml-1 ${cls}`}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}%</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* TAB: Provincial threshold */}
        {active === "threshold" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">El umbral real por provincia</CardTitle>
              <CardDescription>La ley dice 3%, pero en provincias pequeñas el umbral efectivo es mucho mayor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {provinces.map((p) => (
                <div key={p.name} className="text-sm border-l-2 border-muted pl-3">
                  <div className="font-medium">{p.name} — {p.seats} escaños</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Umbral efectivo: ~{p.effectiveThreshold}%</div>
                  <div className="text-muted-foreground text-xs">{p.description}</div>
                </div>
              ))}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                En las 27 provincias con 5 o menos escaños (54% del Congreso), el umbral efectivo supera el 10%.
                Partidos como IU en 2008 (970K votos, 1 escaño) quedan fuera porque sus votos se dispersan.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
