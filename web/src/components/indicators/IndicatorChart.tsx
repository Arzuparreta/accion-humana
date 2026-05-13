"use client"

import { useId } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface IndicatorPoint {
  period: string
  value: number
}

interface IndicatorChartProps {
  data: IndicatorPoint[]
  unit: string
}

const longMonthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

const shortMonthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
})

const numberFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function parsePeriod(period: string) {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split("-").map(Number)
    return new Date(Date.UTC(year, month - 1, 1))
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const [year, month, day] = period.split("-").map(Number)
    return new Date(Date.UTC(year, month - 1, day))
  }

  if (/^\d{4}$/.test(period)) {
    return new Date(Date.UTC(Number(period), 0, 1))
  }

  return null
}

function formatPeriod(period: string, mode: "short" | "long") {
  const parsed = parsePeriod(period)

  if (!parsed) return period

  const formatter = mode === "long" ? longMonthFormatter : shortMonthFormatter
  const formatted = formatter.format(parsed)

  if (mode === "long") {
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  return formatted.replace(".", "")
}

export function IndicatorChart({ data, unit }: IndicatorChartProps) {
  const gradientId = useId().replace(/:/g, "")
  const formatTooltipValue = (value: number) => value.toFixed(2)
  const tickPeriods = data
    .filter((_, index) => index % 6 === 0)
    .map((point) => point.period)

  const lastPeriod = data[data.length - 1]?.period
  if (lastPeriod && tickPeriods[tickPeriods.length - 1] !== lastPeriod) {
    tickPeriods.push(lastPeriod)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Evolución</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full md:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
              <XAxis
                dataKey="period"
                ticks={tickPeriods}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickMargin={10}
                tick={{ fontSize: 12, fill: "currentColor" }}
                tickFormatter={(value: string) => formatPeriod(value, "short")}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickLine={false}
                axisLine={false}
                width={72}
                tick={{ fontSize: 12, fill: "currentColor" }}
                tickFormatter={(value: number) => numberFormatter.format(value)}
              />
              <Tooltip
                cursor={{ stroke: "currentColor", strokeOpacity: 0.16 }}
                content={({ active, label, payload }) => {
                  if (!active || !payload?.length) return null

                  return (
                    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-sm">
                      {`${formatPeriod(String(label), "long")} · ${formatTooltipValue(Number(payload[0].value))} ${unit}`}
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="currentColor"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                className="text-foreground"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
