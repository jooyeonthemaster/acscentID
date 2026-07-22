'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { MapPin, Pencil, Plus, X, Check, Loader2, Trash2, Search } from 'lucide-react'
import { openDaumPostcode } from '@/lib/daum-postcode'
import { splitPhone, joinPhone, type ShippingAddress } from '@/lib/user/address'

interface AddressFormState {
  name: string
  phone1: string
  phone2: string
  phone3: string
  zipCode: string
  address: string
  addressDetail: string
}

const EMPTY_FORM: AddressFormState = {
  name: '',
  phone1: '010',
  phone2: '',
  phone3: '',
  zipCode: '',
  address: '',
  addressDetail: '',
}

function toForm(a: ShippingAddress): AddressFormState {
  const [p1, p2, p3] = splitPhone(a.phone)
  return {
    name: a.name,
    phone1: p1,
    phone2: p2,
    phone3: p3,
    zipCode: a.zipCode,
    address: a.address,
    addressDetail: a.addressDetail,
  }
}

export function DefaultAddressCard() {
  const t = useTranslations()
  const [address, setAddress] = useState<ShippingAddress | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<AddressFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/user/address')
      .then((r) => (r.ok ? r.json() : { address: null }))
      .then((d) => {
        if (!cancelled) setAddress(d.address ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openEditor = () => {
    setForm(address ? toForm(address) : EMPTY_FORM)
    setError('')
    setEditing(true)
  }

  const update = (field: keyof AddressFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const handlePhone = (field: 'phone1' | 'phone2' | 'phone3', value: string, max: number) => {
    update(field, value.replace(/[^0-9]/g, '').slice(0, max))
  }

  const handleSearch = async () => {
    const result = await openDaumPostcode()
    if (result) {
      setForm((prev) => ({
        ...prev,
        zipCode: result.zonecode,
        address: result.roadAddress || result.jibunAddress,
      }))
    }
  }

  const handleSave = async () => {
    const payload: ShippingAddress = {
      name: form.name.trim(),
      phone: joinPhone(form.phone1, form.phone2, form.phone3),
      zipCode: form.zipCode.trim(),
      address: form.address.trim(),
      addressDetail: form.addressDetail.trim(),
    }
    if (!payload.name || !payload.zipCode || !payload.address || !form.phone2 || !form.phone3) {
      setError(t('mypage.defaultAddressRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/user/address', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || t('mypage.profileSaveFailed'))
        return
      }
      setAddress(data.address ?? payload)
      setEditing(false)
    } catch {
      setError(t('mypage.profileSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('mypage.defaultAddressDeleteConfirm'))) return
    setSaving(true)
    try {
      const res = await fetch('/api/user/address', { method: 'DELETE' })
      if (res.ok) {
        setAddress(null)
        setEditing(false)
      }
    } catch {
      // 무시
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[6px] p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
              <MapPin size={15} className="text-[var(--ink)]" />
            </div>
            <h2 className="text-base font-bold text-[var(--ink)]">{t('mypage.defaultAddressTitle')}</h2>
          </div>
          <button
            onClick={openEditor}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[var(--paper)] hover:bg-[var(--soft)] border border-[var(--line)] text-[var(--ink)] text-xs lg:text-sm font-bold transition-colors shrink-0"
          >
            {address ? <Pencil size={14} /> : <Plus size={14} />}
            {address ? t('mypage.editButton') : t('mypage.defaultAddressAdd')}
          </button>
        </div>

        {loading ? (
          <div className="py-3 flex justify-center">
            <Loader2 className="w-5 h-5 text-[var(--muted-ink)] animate-spin" />
          </div>
        ) : address ? (
          <div className="text-sm lg:text-base text-[var(--muted-ink)] leading-relaxed pl-1">
            <p className="font-bold text-[var(--ink)]">
              {address.name} <span className="font-medium text-[var(--muted-ink)]">· {address.phone}</span>
            </p>
            <p className="text-[var(--muted-ink)]">
              ({address.zipCode}) {address.address} {address.addressDetail}
            </p>
          </div>
        ) : (
          <p className="text-sm lg:text-base text-[var(--muted-ink)] pl-1 py-1">{t('mypage.defaultAddressEmpty')}</p>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !saving && setEditing(false)}
        >
          <div
            className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[var(--line)] shrink-0">
              <h3 className="text-lg font-bold text-[var(--ink)]">{t('mypage.defaultAddressTitle')}</h3>
              <button
                onClick={() => !saving && setEditing(false)}
                className="p-1.5 hover:bg-[var(--soft)] rounded-[6px] transition-colors"
              >
                <X size={18} className="text-[var(--muted-ink)]" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4 overflow-y-auto">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm lg:text-base px-3 py-2 rounded-[6px] border border-red-200">
                  {error}
                </div>
              )}

              {/* 받는 분 */}
              <div>
                <label className="block text-sm lg:text-base font-bold text-[var(--muted-ink)] mb-1.5">{t('checkout.recipient')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder={t('checkout.namePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-[6px] border border-[var(--line)] focus:border-[var(--line)] text-sm lg:text-base outline-none transition-colors"
                />
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-sm lg:text-base font-bold text-[var(--muted-ink)] mb-1.5">{t('checkout.phone')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone1}
                    onChange={(e) => handlePhone('phone1', e.target.value, 3)}
                    maxLength={3}
                    className="flex-1 min-w-0 px-2 py-2.5 rounded-[6px] border border-[var(--line)] focus:border-[var(--line)] text-center font-bold text-sm lg:text-base outline-none"
                  />
                  <span className="text-[var(--muted-ink)] font-bold">-</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone2}
                    onChange={(e) => handlePhone('phone2', e.target.value, 4)}
                    maxLength={4}
                    className="flex-1 min-w-0 px-2 py-2.5 rounded-[6px] border border-[var(--line)] focus:border-[var(--line)] text-center font-bold text-sm lg:text-base outline-none"
                  />
                  <span className="text-[var(--muted-ink)] font-bold">-</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone3}
                    onChange={(e) => handlePhone('phone3', e.target.value, 4)}
                    maxLength={4}
                    className="flex-1 min-w-0 px-2 py-2.5 rounded-[6px] border border-[var(--line)] focus:border-[var(--line)] text-center font-bold text-sm lg:text-base outline-none"
                  />
                </div>
              </div>

              {/* 주소 */}
              <div>
                <label className="block text-sm lg:text-base font-bold text-[var(--muted-ink)] mb-1.5">{t('checkout.address')}</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={form.zipCode}
                    onChange={(e) => update('zipCode', e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    onClick={handleSearch}
                    inputMode="numeric"
                    placeholder={t('checkout.zipcode')}
                    className="flex-1 min-w-0 px-4 py-2.5 rounded-[6px] border border-[var(--line)] focus:border-[var(--line)] text-sm lg:text-base outline-none cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="flex-shrink-0 bg-[var(--soft)] text-[var(--ink)] px-3 py-2.5 rounded-[6px] border border-[var(--line)] font-bold flex items-center gap-1.5 hover:bg-[var(--soft)] transition-colors text-sm lg:text-base"
                  >
                    <Search size={14} />
                    {t('checkout.addressSearch')}
                  </button>
                </div>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder={t('checkout.addressSearchPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-[6px] border border-[var(--line)] focus:border-[var(--line)] text-sm lg:text-base outline-none mb-2"
                />
                <input
                  type="text"
                  value={form.addressDetail}
                  onChange={(e) => update('addressDetail', e.target.value)}
                  placeholder={t('checkout.addressDetailPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-[6px] border border-[var(--line)] focus:border-[var(--line)] text-sm lg:text-base outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-5 py-4 border-t-2 border-[var(--line)] bg-[var(--soft)] shrink-0">
              {address ? (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm lg:text-base font-bold rounded-[6px] border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {t('mypage.defaultAddressDelete')}
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm lg:text-base font-bold rounded-[6px] border border-[var(--line)] text-[var(--muted-ink)] hover:bg-[var(--soft)] transition-colors disabled:opacity-50"
                >
                  {t('mypage.profileCancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm lg:text-base font-bold rounded-[6px] bg-[var(--soft)] hover:bg-[var(--soft)] border border-[var(--line)] text-[var(--ink)] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {t('mypage.profileSave')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
