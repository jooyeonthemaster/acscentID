import { createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest, NextResponse } from 'next/server'

export const COST_ANALYSIS_ACCESS_COOKIE = 'acscent_cost_analysis_access'

const COST_ANALYSIS_PASSWORD = process.env.COST_ANALYSIS_PASSWORD || '@nadr1106'
const COST_ANALYSIS_ACCESS_TTL_SECONDS = 60 * 60 * 12
const COST_ANALYSIS_ACCESS_PAYLOAD = 'cost-analysis:v1'

function getSigningSecret() {
  return (
    process.env.COST_ANALYSIS_ACCESS_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    COST_ANALYSIS_PASSWORD
  )
}

function signAccessPayload() {
  return createHmac('sha256', getSigningSecret())
    .update(COST_ANALYSIS_ACCESS_PAYLOAD)
    .digest('base64url')
}

function getAccessCookieValue() {
  return `${COST_ANALYSIS_ACCESS_PAYLOAD}.${signAccessPayload()}`
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function isValidCostAnalysisPassword(password: unknown) {
  return typeof password === 'string' && safeEquals(password, COST_ANALYSIS_PASSWORD)
}

export function hasCostAnalysisAccess(request: NextRequest) {
  const cookieValue = request.cookies.get(COST_ANALYSIS_ACCESS_COOKIE)?.value
  return Boolean(cookieValue && safeEquals(cookieValue, getAccessCookieValue()))
}

export function setCostAnalysisAccessCookie(response: NextResponse) {
  response.cookies.set({
    name: COST_ANALYSIS_ACCESS_COOKIE,
    value: getAccessCookieValue(),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COST_ANALYSIS_ACCESS_TTL_SECONDS,
  })
}
