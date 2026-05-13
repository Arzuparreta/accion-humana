"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface Tab {
  value: string
  label: string
  count?: number
}

interface TabBarProps {
  tabs: Tab[]
  defaultValue: string
  children: React.ReactNode
}

export function TabBar({ tabs, defaultValue, children }: TabBarProps) {
  const [active, setActive] = useState(defaultValue)

  return (
    <div>
      <div className="flex border-b overflow-x-auto -mx-3 sm:-mx-6 px-3 sm:px-6">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setActive(t.value)}
            className={cn(
              "shrink-0 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              active === t.value
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground">({t.count})</span>
            )}
          </button>
        ))}
      </div>
      <div className="py-4 sm:py-6">
        {children}
      </div>
    </div>
  )
}

interface TabPanelProps {
  value: string
  active: string
  children: React.ReactNode
}

export function TabPanel({ value, active, children }: TabPanelProps) {
  if (value !== active) return null
  return <div>{children}</div>
}
