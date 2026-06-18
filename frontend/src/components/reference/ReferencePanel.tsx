import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Briefcase, X, ChevronLeft } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  jdTitle: string
  jdRawText?: string
  resumeRawText?: string
}

/**
 * 面试中可重看 JD / 简历的右侧抽屉
 * - 浮动按钮在左下角
 * - 点击向右滑出抽屉
 * - 抽屉内可切换 JD / 简历 Tab
 */
export function ReferencePanel({ jdTitle, jdRawText, resumeRawText }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'jd' | 'resume'>('jd')

  // 没有 JD 也没有简历 → 不渲染任何东西（hooks 已在上面声明，安全）
  const hasContent = !!(jdRawText || resumeRawText)
  const activeTab = tab === 'resume' && resumeRawText ? 'resume' : 'jd'

  if (!hasContent) return null

  return (
    <>
      {/* 浮动按钮 */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => setOpen(true)}
        className={clsx(
          'absolute bottom-3 left-3 z-30',
          'inline-flex items-center gap-1.5 px-3 py-1.5',
          'bg-white/95 backdrop-blur-sm border border-slate-200 shadow-card',
          'rounded-full text-xs font-medium text-slate-700',
          'hover:bg-white hover:border-indigo-300 hover:text-indigo-600',
          'transition-all',
        )}
        title="查看 JD 和简历"
      >
        <FileText className="w-3.5 h-3.5" />
        参考资料
      </motion.button>

      {/* 抽屉 */}
      <AnimatePresence>
        {open && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            />

            {/* 抽屉本体（从右侧滑出） */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 left-auto z-50 bg-white shadow-elevated w-full max-w-md flex flex-col"
            >
              {/* 抽屉头部 */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-800">参考资料</h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 hover:text-slate-700 transition-colors"
                  aria-label="关闭"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab 切换 */}
              <div className="px-6 pt-3 border-b border-slate-200 flex gap-1">
                <TabButton
                  active={activeTab === 'jd'}
                  onClick={() => setTab('jd')}
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label="JD 原文"
                />
                {resumeRawText && (
                  <TabButton
                    active={activeTab === 'resume'}
                    onClick={() => setTab('resume')}
                    icon={<Briefcase className="w-3.5 h-3.5" />}
                    label="简历"
                  />
                )}
              </div>

              {/* 内容区 */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {activeTab === 'jd' && jdRawText && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
                      {jdTitle}
                    </div>
                    <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                      {jdRawText}
                    </pre>
                  </div>
                )}
                {activeTab === 'resume' && resumeRawText && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
                      简历内容
                    </div>
                    <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                      {resumeRawText}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors',
        active
          ? 'border-indigo-500 text-indigo-700 bg-indigo-50/50'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
      )}
    >
      {icon}
      {label}
    </button>
  )
}