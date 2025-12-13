"use client"

import { useState, useEffect, createContext, useContext, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

// Toast Types
type ToastType = "success" | "error" | "info"

interface Toast {
    id: string
    message: string
    type: ToastType
    duration?: number
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider")
    }
    return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = "info", duration: number = 3000) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts(prev => [...prev, { id, message, type, duration }])
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    )
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-[calc(100%-2rem)] sm:max-w-[420px] md:max-w-[380px] lg:max-w-[340px] px-4">
            <AnimatePresence>
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                ))}
            </AnimatePresence>
        </div>
    )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, toast.duration || 3000)
        return () => clearTimeout(timer)
    }, [toast.duration, onClose])

    const icons = {
        success: <CheckCircle size={18} className="text-emerald-500" />,
        error: <AlertCircle size={18} className="text-red-500" />,
        info: <Info size={18} className="text-yellow-500" />
    }

    const bgColors = {
        success: "bg-emerald-50 border-emerald-200",
        error: "bg-red-50 border-red-200",
        info: "bg-yellow-50 border-yellow-200"
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`relative flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-sm shadow-lg ${bgColors[toast.type]}`}
        >
            {icons[toast.type]}
            <p className="flex-1 text-sm font-medium text-slate-700">{toast.message}</p>
            <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-black/5 transition-colors"
            >
                <X size={14} className="text-slate-400" />
            </button>
        </motion.div>
    )
}
