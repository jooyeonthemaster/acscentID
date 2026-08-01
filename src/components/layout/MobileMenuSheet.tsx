'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, ChevronDown, HelpCircle, MapPin } from 'lucide-react'
import { useActiveProducts, useProductThumbnailMap } from '@/hooks/useAdminContent'
import { useStoreProducts } from '@/hooks/useStoreProducts'
import { useStoreProductText } from '@/hooks/useStoreProductText'
import { PRODUCT_IMAGE_PLACEHOLDER } from '@/lib/products/images'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from '@/lib/utils'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { stripLocaleFromPathname } from '@/lib/route-visibility'

// Unified User Type
interface UnifiedUser {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  provider: string
}

interface MobileMenuSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: SupabaseUser | null
  unifiedUser: UnifiedUser | null
  loading: boolean
  onSignOut: () => Promise<void>
  onLoginClick: () => void
}

// Mobile Collapsible Section
export function MobileSection({
  title,
  links,
  isActive,
  onLinkClick
}: {
  title: string
  links: Array<{ href: string; label: string; image?: string; limitedUntil?: string }>
  isActive: boolean
  onLinkClick: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-[var(--line-soft)] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-4 font-bold text-left transition-colors",
          isActive ? "text-[var(--ink)] bg-[var(--soft)]" : "text-[var(--ink)] hover:bg-[var(--soft)]"
        )}
      >
        {title}
        <ChevronDown size={16} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-[var(--soft)]"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onLinkClick}
                className="flex items-center gap-3 px-8 py-3 text-sm lg:text-base text-[var(--muted-ink)] hover:text-[var(--ink)] hover:bg-[var(--line-soft)] transition-colors"
              >
                {link.image && (
                  <div className="relative">
                    <img
                      src={link.image}
                      alt=""
                      className="w-8 h-8 rounded-[4px] object-cover border border-[var(--line)]"
                    />
                    {link.limitedUntil && (
                      <span className="absolute -top-1 -right-1 px-1 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-[3px] leading-none">
                        D-DAY
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {link.label}
                  {link.limitedUntil && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] lg:text-[12px] font-bold rounded-[3px]">
                      ~{link.limitedUntil}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MobileMenuSheet({
  isOpen,
  onOpenChange,
  user,
  unifiedUser,
  loading,
  onSignOut,
  onLoginClick
}: MobileMenuSheetProps) {
  const pathname = usePathname()
  const normalizedPathname = stripLocaleFromPathname(pathname)
  const currentUser = unifiedUser || user
  const t = useTranslations()

  const isProgramsActive = normalizedPathname.startsWith('/programs')
  const isProductsActive = normalizedPathname.startsWith('/products')

  const handleClose = () => onOpenChange(false)

  const handleSignOut = async () => {
    await onSignOut()
    handleClose()
  }

  const { isProductVisible } = useActiveProducts()

  // 상품관리 이미지의 첫 번째 사진이 메뉴 썸네일입니다.
  const { thumbnails, loading: thumbnailsLoading } = useProductThumbnailMap()
  const { products: storeProducts, refresh: refreshStoreProducts } = useStoreProducts()
  const storeText = useStoreProductText()

  useEffect(() => {
    if (!isOpen) return
    void refreshStoreProducts()
  }, [isOpen, refreshStoreProducts])

  // Navigation Links with translated labels (활성 상품만 + DB 이미지 연동)
  const programLinks = [
    { slug: 'idol-image', href: '/programs/idol-image', label: t('footer.aiImageAnalysis') },
    { slug: 'figure', href: '/programs/figure', label: t('footer.figureDiffuser') },
    { slug: 'graduation', href: '/programs/graduation', label: t('products.graduation') },
    { slug: 'personal', href: '/programs/personal', label: t('products.personal') },
    { slug: 'chemistry', href: '/programs/chemistry', label: t('products.chemistry') },
    { slug: 'saju', href: '/programs/saju', label: t('products.saju') },
    { slug: 'le-quack', href: '/programs/le-quack', label: t('products.leQuack') },
  ]
    .filter((link) => isProductVisible(link.slug))
    .map((link) => ({
      ...link,
      image: thumbnailsLoading ? PRODUCT_IMAGE_PLACEHOLDER : (thumbnails[link.slug] || PRODUCT_IMAGE_PLACEHOLDER),
    }))

  const productLinks = storeProducts
    .filter((product) => product.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((product) => {
      const localized = storeText(product)
      return {
        href: `/products/${product.slug}`,
        label: localized.title,
        image: product.image,
      }
    })

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {/* Sheet는 body로 portal되어 .public-editorial 밖 — portal 클래스로 에디토리얼 토큰 공급 */}
      <SheetContent side="right" className="public-editorial-portal w-[300px] border-l border-[var(--line)] bg-white p-0">
        <SheetHeader className="p-6 border-b border-[var(--line)] bg-white">
          <SheetTitle className="text-left text-xs lg:text-sm font-black text-[var(--ink)] uppercase flex items-center gap-2">
            {t('nav.menu')}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-[var(--line)] border-dashed rounded-full animate-spin mx-auto mb-2" />
            </div>
          ) : currentUser ? (
            <div className="flex flex-col flex-1 pb-20">
              {/* User Profile */}
              <div className="p-6 bg-[var(--soft)]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-[var(--line)] bg-white text-[var(--muted-ink)] flex items-center justify-center overflow-hidden">
                    {(unifiedUser?.avatar_url || user?.user_metadata?.avatar_url) ? (
                      <img src={unifiedUser?.avatar_url || user?.user_metadata?.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--ink)] truncate">
                      {unifiedUser?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || t('auth.defaultUser')}
                    </p>
                    <p className="text-xs lg:text-sm text-[var(--muted-ink)] truncate mt-0.5">
                      {unifiedUser?.email || user?.email || t('auth.kakaoLoginFallback')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto">
                <Link
                  href="/"
                  onClick={handleClose}
                  className="flex items-center gap-3 px-4 py-4 border-b border-[var(--line-soft)] font-bold text-[var(--ink)] hover:bg-[var(--soft)] transition-colors"
                >
                  {t('nav.home')}
                </Link>
                <MobileSection
                  title={t('nav.programs')}
                  links={programLinks}
                  isActive={isProgramsActive}
                  onLinkClick={handleClose}
                />
                <MobileSection
                  title={t('nav.products')}
                  links={productLinks}
                  isActive={isProductsActive}
                  onLinkClick={handleClose}
                />
                <Link
                  href="/mypage"
                  onClick={handleClose}
                  className="flex items-center gap-3 px-4 py-4 border-b border-[var(--line-soft)] font-bold text-[var(--ink)] hover:bg-[var(--soft)] transition-colors"
                >
                  {t('nav.myPage')}
                </Link>
                <Link
                  href="/faq"
                  onClick={handleClose}
                  className="flex items-center gap-3 px-6 py-4 border-b border-[var(--line-soft)] font-bold text-[var(--ink)] hover:bg-[var(--soft)] transition-colors"
                >
                  <HelpCircle size={18} />
                  FAQ
                </Link>
              </nav>

              {/* Actions */}
              <div className="mt-auto p-4 border-t border-[var(--line-soft)] space-y-1">
                <Button
                  variant="ghost"
                  asChild
                  className="w-full h-12 flex items-center justify-start gap-3 px-4 rounded-[6px] hover:bg-[var(--soft)] hover:text-[var(--ink)] text-[var(--muted-ink)] transition-all font-medium"
                >
                  <a
                    href="https://map.naver.com/p/entry/place/1274492663?c=15.00,0,0,0,dh&placePath=%2Fhome%3Ffrom%3Dmap%26fromPanelNum%3D1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin size={18} />
                    <span>{t('nav.visitReservation')}</span>
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full h-12 flex items-center justify-start gap-3 px-4 rounded-[6px] hover:bg-red-50 hover:text-red-600 text-[var(--muted-ink)] transition-all font-medium"
                >
                  <LogOut size={18} />
                  <span>{t('nav.logout')}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Navigation for non-logged in users */}
              <nav className="flex-1 overflow-y-auto">
                <Link
                  href="/"
                  onClick={handleClose}
                  className="flex items-center gap-3 px-4 py-4 border-b border-[var(--line-soft)] font-bold text-[var(--ink)] hover:bg-[var(--soft)] transition-colors"
                >
                  {t('nav.home')}
                </Link>
                <MobileSection
                  title={t('nav.programs')}
                  links={programLinks}
                  isActive={isProgramsActive}
                  onLinkClick={handleClose}
                />
                <MobileSection
                  title={t('nav.products')}
                  links={productLinks}
                  isActive={isProductsActive}
                  onLinkClick={handleClose}
                />
                <Link
                  href="/faq"
                  onClick={handleClose}
                  className="flex items-center gap-3 px-6 py-4 border-b border-[var(--line-soft)] font-bold text-[var(--ink)] hover:bg-[var(--soft)] transition-colors"
                >
                  <HelpCircle size={18} />
                  FAQ
                </Link>
              </nav>

              <div className="p-4 border-t border-[var(--line-soft)]">
                <Button
                  variant="ghost"
                  asChild
                  className="w-full h-12 flex items-center justify-start gap-3 px-4 rounded-[6px] hover:bg-[var(--soft)] hover:text-[var(--ink)] text-[var(--muted-ink)] transition-all font-medium"
                >
                  <a
                    href="https://map.naver.com/p/entry/place/1274492663?c=15.00,0,0,0,dh&placePath=%2Fhome%3Ffrom%3Dmap%26fromPanelNum%3D1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin size={18} />
                    <span>{t('nav.visitReservation')}</span>
                  </a>
                </Button>
              </div>

              {/* Login CTA */}
              <div className="p-6 border-t border-[var(--line)] bg-[var(--soft)]">
                <h3 className="text-2xl font-black text-[var(--ink)] mb-2">{t('auth.welcomeTitle')}</h3>
                <p className="text-sm lg:text-base text-[var(--muted-ink)] mb-6 whitespace-pre-line">
                  {t('auth.welcomeDesc')}
                </p>
                <Button
                  onClick={() => {
                    onLoginClick()
                    handleClose()
                  }}
                  className="w-full h-14 bg-[var(--ink)] text-white rounded-[5px] font-bold text-lg transition-all hover:bg-black active:bg-black"
                >
                  {t('auth.loginButton')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
