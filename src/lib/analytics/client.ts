'use client'

import { supabase } from '@/lib/supabase/client'
import {
  getDeviceType,
  getBrowser,
  getOS,
  extractDomain,
  extractUTMParams,
  getOrCreateSessionId,
  getLastPagePath,
  setLastPagePath,
  getLastPageViewTime,
  setLastPageViewTime,
} from './utils'

/**
 * Analytics 클라이언트
 * Supabase와 통신하여 분석 데이터 수집
 */
class AnalyticsClient {
  private sessionId: string | null = null
  private userId: string | null = null
  private initialized = false
  private pageViewId: string | null = null
  private initPromise: Promise<void> | null = null

  /**
   * 클라이언트 초기화 (중복 호출 시 동일 Promise 반환)
   */
  async init(userId?: string | null) {
    if (typeof window === 'undefined') return

    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this._doInit(userId)
    return this.initPromise
  }

  private async _doInit(userId?: string | null) {
    this.userId = userId || null

    const { id, isNew } = getOrCreateSessionId()
    this.sessionId = id

    if (isNew) {
      await this.createSession()
    }

    this.initialized = true
  }

  /**
   * 새 세션 생성
   */
  private async createSession() {
    if (!this.sessionId) return

    const userAgent = navigator.userAgent
    const referrer = document.referrer
    const currentUrl = window.location.href
    const utmParams = extractUTMParams(currentUrl)

    try {
      const { error } = await supabase.from('analytics_sessions').insert({
        session_id: this.sessionId,
        user_id: this.userId,
        user_agent: userAgent,
        device_type: getDeviceType(userAgent),
        browser: getBrowser(userAgent),
        os: getOS(userAgent),
        referrer: referrer || null,
        referrer_domain: extractDomain(referrer),
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        utm_term: utmParams.utm_term,
        utm_content: utmParams.utm_content,
        landing_page: window.location.pathname,
      })
      if (error) {
        console.error('[Analytics] Session insert error:', error.message)
      }
    } catch (error) {
      console.error('[Analytics] Failed to create session:', error)
    }
  }

  /**
   * 초기화 보장 (trackPageView/trackEvent 전에 호출)
   */
  private async ensureInitialized() {
    if (!this.initialized) {
      await this.init()
    }
  }

  /**
   * 페이지 뷰 기록
   */
  async trackPageView(path: string, title?: string) {
    await this.ensureInitialized()
    if (!this.sessionId) return

    const now = Date.now()
    const lastPath = getLastPagePath()
    const lastTime = getLastPageViewTime()

    // 이전 페이지의 체류 시간 업데이트
    if (lastPath && lastTime && this.pageViewId) {
      const timeOnPage = Math.round((now - lastTime) / 1000)
      if (timeOnPage > 0 && timeOnPage < 3600) {
        await this.updateTimeOnPage(this.pageViewId, timeOnPage)
      }
    }

    try {
      const newPageViewId = crypto.randomUUID()
      const { error } = await supabase
        .from('analytics_page_views')
        .insert({
          id: newPageViewId,
          session_id: this.sessionId,
          user_id: this.userId,
          page_path: path,
          page_title: title || document.title,
          page_url: window.location.href,
          previous_page: lastPath,
        })

      if (error) {
        // FK 위반 = DB에 세션이 없음 → 세션 생성 후 재시도
        if (error.message?.includes('foreign key')) {
          await this.createSession()
          const { error: retryError } = await supabase
            .from('analytics_page_views')
            .insert({
              id: newPageViewId,
              session_id: this.sessionId,
              user_id: this.userId,
              page_path: path,
              page_title: title || document.title,
              page_url: window.location.href,
              previous_page: lastPath,
            })
          if (retryError) {
            console.error('[Analytics] Page view retry error:', retryError.message)
            return
          }
        } else {
          console.error('[Analytics] Page view insert error:', error.message)
          return
        }
      }

      this.pageViewId = newPageViewId

      // 현재 페이지 정보 저장
      setLastPagePath(path)
      setLastPageViewTime(now)
    } catch (error) {
      console.error('[Analytics] Failed to track page view:', error)
    }
  }

  /**
   * 이전 페이지 체류 시간 업데이트
   */
  private async updateTimeOnPage(pageViewId: string, seconds: number) {
    try {
      await supabase
        .from('analytics_page_views')
        .update({ time_on_page: seconds })
        .eq('id', pageViewId)
    } catch (error) {
      console.error('[Analytics] Failed to update time on page:', error)
    }
  }

  /**
   * 커스텀 이벤트 기록
   */
  async trackEvent(
    eventName: string,
    eventData?: Record<string, unknown>,
    category?: string
  ) {
    await this.ensureInitialized()
    if (!this.sessionId) return

    try {
      await supabase.from('analytics_events').insert({
        session_id: this.sessionId,
        user_id: this.userId,
        event_name: eventName,
        event_category: category || null,
        event_data: eventData || {},
        page_path: window.location.pathname,
      })
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error)
    }
  }

  /**
   * 사용자 ID 설정 (로그인 시)
   */
  async setUserId(userId: string | null) {
    this.userId = userId

    if (this.sessionId && userId) {
      try {
        await supabase
          .from('analytics_sessions')
          .update({ user_id: userId })
          .eq('session_id', this.sessionId)
      } catch (error) {
        console.error('[Analytics] Failed to update user ID:', error)
      }
    }
  }

  async trackClick(elementName: string, additionalData?: Record<string, unknown>) {
    await this.trackEvent('click', { element: elementName, ...additionalData }, 'click')
  }

  async trackFormSubmit(formName: string, additionalData?: Record<string, unknown>) {
    await this.trackEvent('form_submit', { form: formName, ...additionalData }, 'form')
  }

  async trackPurchase(orderId: string, amount: number, items?: unknown[]) {
    await this.trackEvent(
      'purchase',
      { order_id: orderId, amount, items },
      'conversion'
    )
  }

  async trackAddToCart(productId: string, productName: string, price: number) {
    await this.trackEvent(
      'add_to_cart',
      { product_id: productId, product_name: productName, price },
      'ecommerce'
    )
  }

  async trackSearch(query: string, resultsCount?: number) {
    await this.trackEvent('search', { query, results_count: resultsCount }, 'search')
  }

  async trackScrollDepth(percentage: number) {
    await this.trackEvent('scroll_depth', { percentage }, 'engagement')
  }

  async trackError(errorMessage: string, errorStack?: string) {
    await this.trackEvent('error', { message: errorMessage, stack: errorStack }, 'error')
  }
}

// 싱글톤 인스턴스
export const analytics = new AnalyticsClient()
