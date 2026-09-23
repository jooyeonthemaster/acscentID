'use client'
import {
  Heart, Folder, Camera, Monitor, FileText, AppWindow, Printer, Save, QrCode,
  Smartphone, Users, Sparkles, Star, Check, TriangleAlert, Hourglass, Globe,
  LockKeyhole, House, ArrowLeft, ArrowRight, Image, FlaskConical, UserRound,
  Palette, X, Delete, ArrowBigUp, type LucideIcon,
} from 'lucide-react'
import type { PixelIconName } from '@/components/retro/pixel-icons'

const icons: Record<PixelIconName, LucideIcon> = {
  heart: Heart, folder: Folder, camera: Camera, computer: Monitor, file: FileText,
  window: AppWindow, printer: Printer, floppy: Save, qr: QrCode, phone: Smartphone,
  duo: Users, sparkle: Sparkles, star: Star, check: Check, warning: TriangleAlert,
  hourglass: Hourglass, globe: Globe, lock: LockKeyhole, home: House,
  arrowLeft: ArrowLeft, arrowRight: ArrowRight, photo: Image, bottle: FlaskConical,
  person: UserRound, palette: Palette, close: X, backspace: Delete, shift: ArrowBigUp,
}
export function MacIcon({name, size, className, label}: {name: PixelIconName; size: number; className?: string; label?: string}) {
  const Icon = icons[name]
  return <Icon size={size} strokeWidth={1.65} className={`rt-icon mac-icon ${className ?? ''}`}
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false" />
}
