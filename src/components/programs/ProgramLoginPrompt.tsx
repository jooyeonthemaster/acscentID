"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { usePathname } from "@/i18n/routing"
import { useAuth } from "@/contexts/AuthContext"
import { useTransition } from "@/contexts/TransitionContext"
import { AuthModal } from "@/components/auth/AuthModal"

interface ProgramLoginPromptProps {
  isOpen: boolean
  onClose: () => void
  /** 로그인 후 돌아올 경로 (로케일 접두사 없이) */
  redirectPath?: string
}

/**
 * 프로그램 시작 시 비로그인 사용자에게 띄우는 단일 로그인 모달.
 * 분석은 로그인 필수 정책이라 비회원 진입 버튼은 두지 않는다.
 */
export function ProgramLoginPrompt({ isOpen, onClose, redirectPath }: ProgramLoginPromptProps) {
  const t = useTranslations("auth")
  return (
    <AuthModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("programLoginTitle")}
      description={t("programLoginDescription")}
      redirectPath={redirectPath}
    />
  )
}

/**
 * 프로그램 상세 페이지 공통 — 시작 버튼과 로그인 요구를 한곳에서 처리한다.
 * startProgram(path): 로그인 상태면 바로 이동, 아니면 로그인 모달 (로그인 후 path로 복귀)
 * requireLogin(path?): 리뷰 작성 등 — 로그인 후 path(기본: 현재 페이지)로 복귀
 */
export function useProgramLogin() {
  const { user, unifiedUser, loading } = useAuth()
  const { startTransition } = useTransition()
  const pathname = usePathname()
  const [redirectPath, setRedirectPath] = useState<string | null>(null)
  const isLoggedIn = !!(user || unifiedUser)

  const requireLogin = (path?: string) => setRedirectPath(path ?? pathname)

  const startProgram = (path: string) => {
    if (loading) return
    if (isLoggedIn) startTransition(path)
    else setRedirectPath(path)
  }

  const loginModal = (
    <ProgramLoginPrompt
      isOpen={redirectPath !== null}
      onClose={() => setRedirectPath(null)}
      redirectPath={redirectPath ?? undefined}
    />
  )

  return { isLoggedIn, authLoading: loading, startProgram, requireLogin, loginModal }
}
