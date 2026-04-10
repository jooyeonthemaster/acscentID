"use client"

import { useSearchParams } from "next/navigation"
import ChemistryResultPage from "./ChemistryResultPage"

interface ChemistryResultRouterProps {
  children: React.ReactNode
}

/**
 * chemistry 타입이면 케미 전용 결과 페이지를 렌더링,
 * 아니면 기존 ResultPageMain을 렌더링.
 */
export function ChemistryResultRouter({ children }: ChemistryResultRouterProps) {
  const searchParams = useSearchParams()
  const type = searchParams.get("type")

  if (type === "chemistry") {
    return <ChemistryResultPage />
  }

  return <>{children}</>
}
