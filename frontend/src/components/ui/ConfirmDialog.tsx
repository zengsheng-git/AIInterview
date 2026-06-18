import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'

interface Props {
  open: boolean
  title: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
  loading,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* 弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6 pointer-events-auto">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    variant === 'danger' ? 'bg-red-100' : 'bg-indigo-100'
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 ${
                      variant === 'danger' ? 'text-red-600' : 'text-indigo-600'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-800">{title}</h3>
                  <div className="mt-1 text-sm text-slate-600 leading-relaxed">{message}</div>
                </div>
                <button
                  onClick={onCancel}
                  className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button onClick={onCancel} variant="secondary" size="sm" disabled={loading}>
                  {cancelText}
                </Button>
                <Button onClick={onConfirm} variant={variant} size="sm" loading={loading}>
                  {confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
