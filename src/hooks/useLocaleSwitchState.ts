"use client"

import { useEffect, useRef } from "react"

export const LOCALE_SWITCH_EVENT = "acscent:locale-switch-start"

const STATE_PREFIX = "acscent:locale-switch:state:"
const PENDING_STORAGE_KEY = "acscent:locale-switch:pending"
const DOM_STORAGE_KEY = "acscent:locale-switch:dom"
const DB_NAME = "acscent-locale-switch"
const DB_VERSION = 1
const DB_STORE_NAME = "snapshots"
const DEFAULT_TTL_MS = 30 * 60 * 1000
const DEFAULT_PERSIST_DEBOUNCE_MS = 250
const MAX_SESSION_SNAPSHOT_CHARS = 1_000_000

interface StoredSnapshot<T> {
  ts: number
  data: T
}

interface UseLocaleSwitchStateOptions<T> {
  storageKey: string
  capture: () => T | null | undefined
  restore: (data: T) => void
  enabled?: boolean
  ttlMs?: number
  persistDebounceMs?: number
}

interface PersistedDomControl {
  index: number
  tagName: string
  type: string
  value: string
  checked?: boolean
  selectedValues?: string[]
}

interface PersistedDomSnapshot {
  ts: number
  scopeKey: string
  controls: PersistedDomControl[]
}

type LocaleStateFlusher = () => Promise<void> | void

let localeSwitchDbPromise: Promise<IDBDatabase> | null = null
const localeStateFlushers = new Map<string, LocaleStateFlusher>()

export function notifyLocaleSwitchStart(locale: string) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify({ ts: Date.now(), locale }))
  } catch (error) {
    console.warn("[locale-switch] Failed to mark pending locale switch:", error)
  }
  window.dispatchEvent(new CustomEvent(LOCALE_SWITCH_EVENT, { detail: { locale } }))
}

export async function flushLocaleSwitchStateSnapshots() {
  await Promise.allSettled(Array.from(localeStateFlushers.values()).map((flush) => flush()))
}

export function useLocaleSwitchState<T>({
  storageKey,
  capture,
  restore,
  enabled = true,
  ttlMs = DEFAULT_TTL_MS,
  persistDebounceMs = DEFAULT_PERSIST_DEBOUNCE_MS,
}: UseLocaleSwitchStateOptions<T>) {
  const fullStorageKey = `${STATE_PREFIX}${storageKey}`
  const persistReadyRef = useRef(false)

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const flush = async () => {
      const data = capture()
      if (data == null) return

      await persistSnapshot(fullStorageKey, {
        ts: Date.now(),
        data,
      })
    }

    localeStateFlushers.set(fullStorageKey, flush)
    return () => {
      if (localeStateFlushers.get(fullStorageKey) === flush) {
        localeStateFlushers.delete(fullStorageKey)
      }
    }
  }, [capture, enabled, fullStorageKey])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    let cancelled = false
    let timeoutId: number | undefined

    const restoreFromStorage = async () => {
      if (!isLocaleSwitchPending(ttlMs)) {
        persistReadyRef.current = true
        return
      }

      const snapshot = await readSnapshot<T>(fullStorageKey)
      if (cancelled) return

      if (!snapshot?.ts || Date.now() - snapshot.ts > ttlMs) {
        persistReadyRef.current = true
        return
      }

      timeoutId = window.setTimeout(() => {
        if (cancelled) return
        restore(snapshot.data)
        persistReadyRef.current = true
      }, 0)
    }

    void restoreFromStorage()

    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [enabled, fullStorageKey, restore, ttlMs])

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !persistReadyRef.current) return

    const timeoutId = window.setTimeout(() => {
      const data = capture()
      if (data == null) return

      void persistSnapshot(fullStorageKey, {
        ts: Date.now(),
        data,
      })
    }, persistDebounceMs)

    return () => window.clearTimeout(timeoutId)
  }, [capture, enabled, fullStorageKey, persistDebounceMs])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const handleLocaleSwitch = () => {
      const data = capture()
      if (data == null) return

      const snapshot: StoredSnapshot<T> = {
        ts: Date.now(),
        data,
      }

      void persistSnapshot(fullStorageKey, snapshot)
    }

    window.addEventListener(LOCALE_SWITCH_EVENT, handleLocaleSwitch)
    return () => window.removeEventListener(LOCALE_SWITCH_EVENT, handleLocaleSwitch)
  }, [capture, enabled, fullStorageKey])
}

export function dataUrlToFile(dataUrl: string | null | undefined, filename: string): File | null {
  if (!dataUrl || typeof File === "undefined") return null

  try {
    const [header, payload = ""] = dataUrl.split(",")
    const mime = header.match(/^data:([^;]+);base64$/)?.[1] || "image/jpeg"
    const binary = atob(payload || dataUrl)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    return new File([bytes], filename, { type: mime })
  } catch (error) {
    console.warn("[locale-switch] Failed to rebuild file:", error)
    return null
  }
}

function getControls(): Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  if (typeof document === "undefined") return []
  return Array.from(document.querySelectorAll("input, textarea, select"))
}

function shouldPersistInput(input: HTMLInputElement) {
  return !["button", "file", "hidden", "image", "password", "reset", "submit"].includes(input.type)
}

export function saveLocaleFormDomSnapshot(scopeKey: string) {
  if (typeof window === "undefined") return

  const controls = getControls()
    .map((control, index): PersistedDomControl | null => {
      if (control instanceof HTMLInputElement && !shouldPersistInput(control)) return null

      if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
        return {
          index,
          tagName: control.tagName,
          type: control.type,
          value: control.value,
          checked: control.checked,
        }
      }

      if (control instanceof HTMLSelectElement && control.multiple) {
        return {
          index,
          tagName: control.tagName,
          type: "select-multiple",
          value: control.value,
          selectedValues: Array.from(control.selectedOptions).map((option) => option.value),
        }
      }

      return {
        index,
        tagName: control.tagName,
        type: control instanceof HTMLInputElement ? control.type : control.tagName.toLowerCase(),
        value: control.value,
      }
    })
    .filter((control): control is PersistedDomControl => control !== null)

  if (controls.length === 0) return

  const snapshot: PersistedDomSnapshot = {
    ts: Date.now(),
    scopeKey,
    controls,
  }

  try {
    sessionStorage.setItem(DOM_STORAGE_KEY, JSON.stringify(snapshot))
  } catch (error) {
    console.warn("[locale-switch] Failed to persist form controls:", error)
  }
}

export function restoreLocaleFormDomSnapshot(scopeKey: string, ttlMs = DEFAULT_TTL_MS) {
  if (typeof window === "undefined") return false

  const raw = sessionStorage.getItem(DOM_STORAGE_KEY)
  if (!raw) return false

  try {
    const snapshot = JSON.parse(raw) as PersistedDomSnapshot
    if (
      !snapshot?.ts ||
      normalizeScopeKey(snapshot.scopeKey) !== normalizeScopeKey(scopeKey) ||
      Date.now() - snapshot.ts > ttlMs
    ) {
      sessionStorage.removeItem(DOM_STORAGE_KEY)
      return false
    }

    const controls = getControls()
    let restoredCount = 0

    snapshot.controls.forEach((persisted) => {
      const control = controls[persisted.index]
      if (!control) return

      if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
        setNativeChecked(control, Boolean(persisted.checked))
        dispatchInputEvents(control)
        restoredCount += 1
        return
      }

      if (control instanceof HTMLSelectElement && control.multiple && persisted.selectedValues) {
        Array.from(control.options).forEach((option) => {
          option.selected = persisted.selectedValues?.includes(option.value) ?? false
        })
        dispatchInputEvents(control)
        restoredCount += 1
        return
      }

      setNativeValue(control, persisted.value)
      dispatchInputEvents(control)
      restoredCount += 1
    })

    if (restoredCount === 0) return false

    sessionStorage.removeItem(DOM_STORAGE_KEY)
    return true
  } catch (error) {
    sessionStorage.removeItem(DOM_STORAGE_KEY)
    console.warn("[locale-switch] Failed to restore form controls:", error)
    return false
  }
}

async function persistSnapshot<T>(key: string, snapshot: StoredSnapshot<T>) {
  try {
    const serialized = JSON.stringify(snapshot)
    if (serialized.length <= MAX_SESSION_SNAPSHOT_CHARS) {
      sessionStorage.setItem(key, serialized)
    } else {
      sessionStorage.removeItem(key)
    }
  } catch (error) {
    sessionStorage.removeItem(key)
    console.warn("[locale-switch] Failed to persist state in sessionStorage:", error)
  }

  try {
    await putIndexedSnapshot(key, snapshot)
  } catch (error) {
    console.warn("[locale-switch] Failed to persist state in IndexedDB:", error)
  }
}

async function readSnapshot<T>(key: string): Promise<StoredSnapshot<T> | null> {
  const fromSession = readSessionSnapshot<T>(key)
  if (fromSession) return fromSession

  try {
    return await getIndexedSnapshot<T>(key)
  } catch (error) {
    console.warn("[locale-switch] Failed to read state from IndexedDB:", error)
    return null
  }
}

function readSessionSnapshot<T>(key: string): StoredSnapshot<T> | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as StoredSnapshot<T>) : null
  } catch (error) {
    console.warn("[locale-switch] Failed to read state from sessionStorage:", error)
    return null
  }
}

function isLocaleSwitchPending(ttlMs: number) {
  try {
    const raw = sessionStorage.getItem(PENDING_STORAGE_KEY)
    if (!raw) return false

    const pending = JSON.parse(raw) as { ts?: number }
    if (!pending.ts || Date.now() - pending.ts > ttlMs) {
      sessionStorage.removeItem(PENDING_STORAGE_KEY)
      return false
    }

    return true
  } catch {
    sessionStorage.removeItem(PENDING_STORAGE_KEY)
    return false
  }
}

function getLocaleSwitchDb(): Promise<IDBDatabase> {
  if (localeSwitchDbPromise) return localeSwitchDbPromise

  localeSwitchDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
        db.createObjectStore(DB_STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return localeSwitchDbPromise
}

async function putIndexedSnapshot<T>(key: string, snapshot: StoredSnapshot<T>) {
  if (typeof indexedDB === "undefined") return

  const db = await getLocaleSwitchDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE_NAME, "readwrite")
    const store = tx.objectStore(DB_STORE_NAME)
    store.put(snapshot, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

async function getIndexedSnapshot<T>(key: string): Promise<StoredSnapshot<T> | null> {
  if (typeof indexedDB === "undefined") return null

  const db = await getLocaleSwitchDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE_NAME, "readonly")
    const store = tx.objectStore(DB_STORE_NAME)
    const request = store.get(key)

    request.onsuccess = () => resolve((request.result as StoredSnapshot<T> | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

function setNativeValue(
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
) {
  const prototype =
    control instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : control instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set

  if (valueSetter) {
    valueSetter.call(control, value)
  } else {
    control.value = value
  }
}

function normalizeScopeKey(scopeKey: string) {
  return scopeKey.replace(/^\/(ko|en|ja|zh|es)(?=\/|\?|$)/, "")
}

function setNativeChecked(control: HTMLInputElement, checked: boolean) {
  const checkedSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set

  if (checkedSetter) {
    checkedSetter.call(control, checked)
  } else {
    control.checked = checked
  }
}

function dispatchInputEvents(control: HTMLElement) {
  control.dispatchEvent(new Event("input", { bubbles: true }))
  control.dispatchEvent(new Event("change", { bubbles: true }))
}
