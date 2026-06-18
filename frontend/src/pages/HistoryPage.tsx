import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { historyApi, type HistoryItem } from '@/api/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import {
  ArrowLeft,
  Search,
  History,
  FileText,
  Calendar,
  Zap,
  Trophy,
  Eye,
  FileDown,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  CheckSquare,
  Square,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function HistoryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<HistoryItem | null>(null)
  // 多选
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  const load = async (kw?: string) => {
    setLoading(true)
    try {
      const res = await historyApi.list({ keyword: kw, limit: 100 })
      setItems(res.items)
      setTotal(res.total)
    } catch (e: any) {
      alert(`加载失败：${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSearch = () => {
    setKeyword(searchInput)
    load(searchInput)
  }

  const handleExport = async (id: string) => {
    setExportingId(id)
    try {
      const { reportApi } = await import('@/api/client')
      await reportApi.exportMarkdown(id)
    } catch (e: any) {
      alert(`导出失败：${e.message}`)
    } finally {
      setExportingId(null)
    }
  }

  const handleExportWord = async (id: string) => {
    setExportingId(id)
    try {
      const { reportApi } = await import('@/api/client')
      await reportApi.exportWord(id)
    } catch (e: any) {
      alert(`导出 Word 失败：${e.message}`)
    } finally {
      setExportingId(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeletingId(confirmDelete.id)
    try {
      await historyApi.remove(confirmDelete.id)
      // 从列表移除
      setItems((prev) => prev.filter((it) => it.id !== confirmDelete.id))
      setTotal((t) => Math.max(0, t - 1))
      setSelectedIds((prev) => {
        const n = new Set(prev)
        n.delete(confirmDelete.id)
        return n
      })
      setConfirmDelete(null)
    } catch (e: any) {
      alert(`删除失败：${e.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((it) => it.id)))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    setBatchDeleting(true)
    try {
      const res = await historyApi.removeMany(Array.from(selectedIds))
      // 从列表移除
      setItems((prev) => prev.filter((it) => !selectedIds.has(it.id)))
      setTotal((t) => Math.max(0, t - res.deletedCount))
      setSelectedIds(new Set())
      setConfirmBatchDelete(false)
    } catch (e: any) {
      alert(`批量删除失败：${e.message}`)
    } finally {
      setBatchDeleting(false)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (seconds == null) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m === 0) return `${s} 秒`
    return `${m} 分 ${s} 秒`
  }

  return (
    <div className="min-h-screen mesh-bg">
      {/* Header */}
      <div className="dark-bg">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-slate-300 hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-glow">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">面试历史</h1>
              <div className="text-sm text-slate-400">
                共 {total} 次面试记录
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索栏 / 批量操作工具栏 */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <Card variant="elevated" className="mb-5">
          {selectedIds.size > 0 ? (
            // 选中态：显示批量操作
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex-shrink-0 text-indigo-600 hover:text-indigo-700"
                title={selectedIds.size === items.length ? '取消全选' : '全选'}
              >
                {selectedIds.size === items.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
              <div className="flex-1 text-sm text-slate-700">
                已选 <b className="text-indigo-600">{selectedIds.size}</b> / {items.length} 项
              </div>
              <Button onClick={clearSelection} variant="ghost" size="sm">
                <X className="w-3.5 h-3.5" />
                取消
              </Button>
              <Button
                onClick={() => setConfirmBatchDelete(true)}
                variant="danger"
                size="sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                批量删除
              </Button>
            </div>
          ) : (
            // 默认：搜索栏
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="按岗位标题搜索，如：高级前端..."
                className="flex-1 bg-transparent border-0 outline-none text-sm"
              />
              {items.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="flex-shrink-0 text-slate-500 hover:text-indigo-600 flex items-center gap-1 text-xs"
                  title="批量选择"
                >
                  <CheckSquare className="w-4 h-4" />
                  批量
                </button>
              )}
              <Button onClick={handleSearch} size="sm">
                搜索
              </Button>
              {keyword && (
                <Button
                  onClick={() => {
                    setSearchInput('')
                    setKeyword('')
                    load()
                  }}
                  variant="ghost"
                  size="sm"
                >
                  清除
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* 列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            加载中...
          </div>
        ) : items.length === 0 ? (
          <Card variant="glass">
            <div className="text-center py-16">
              <History className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 mb-2">
                {keyword ? `没有找到与 "${keyword}" 相关的面试记录` : '还没有面试记录'}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                完成一次面试后，记录会显示在这里
              </p>
              <Button onClick={() => navigate('/')}>
                开始第一次面试
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              const isSelected = selectedIds.has(item.id)
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card
                    variant="elevated"
                    className={clsx(
                      'transition-all cursor-pointer',
                      isSelected
                        ? 'ring-2 ring-indigo-400 border-indigo-300 shadow-glow'
                        : 'hover:shadow-glow',
                    )}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* 左侧：checkbox + 内容 */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelect(item.id)
                          }}
                          className="mt-1 flex-shrink-0 text-slate-400 hover:text-indigo-600 transition-colors"
                          title={isSelected ? '取消选中' : '选中'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-base font-semibold text-slate-800 truncate">
                              {item.jdTitle}
                            </h3>
                            <StatusBadge status={item.status} mode={item.mode} />
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500 mb-3 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.startedAt).toLocaleString('zh-CN')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(item.duration)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {item.messageCount} 条消息
                            </span>
                          </div>

                          {item.radar && (
                            <div className="grid grid-cols-4 gap-3">
                              <MiniScore label="基础" value={item.radar.basic} />
                              <MiniScore label="项目" value={item.radar.project} />
                              <MiniScore label="系统" value={item.radar.systemDesign} />
                              <MiniScore label="沟通" value={item.radar.communication} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 右侧：总分 + 按钮组 */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {item.overallScore != null && (
                          <div className="text-right">
                            <div className="text-2xl font-extrabold gradient-text">
                              {item.overallScore}
                            </div>
                            <div className="text-[10px] text-slate-500">总分</div>
                          </div>
                        )}
                        <div className="flex gap-1.5">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/history/${item.id}`)
                            }}
                            variant="secondary"
                            size="sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            查看
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExportWord(item.id)
                            }}
                            variant="secondary"
                            size="sm"
                            loading={exportingId === item.id}
                            disabled={item.status !== 'completed'}
                            title={item.status !== 'completed' ? '面试未完成，无法导出' : '导出 Word 文档（含参考答案）'}
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            Word
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExport(item.id)
                            }}
                            variant="ghost"
                            size="sm"
                            loading={exportingId === item.id}
                            disabled={item.status !== 'completed'}
                            title={item.status !== 'completed' ? '面试未完成，无法导出' : '导出 Markdown 报告'}
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            MD
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmDelete(item)
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                            title="删除该面试记录"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="删除面试记录？"
        message={
          confirmDelete && (
            <span>
              确定要删除 <b className="text-slate-800">"{confirmDelete.jdTitle}"</b> 这条面试记录吗？
              <br />
              <span className="text-xs text-slate-500">
                删除后无法恢复，包括所有 Q&A 和评估报告
              </span>
            </span>
          )
        }
        confirmText="删除"
        loading={!!deletingId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* 批量删除确认 */}
      <ConfirmDialog
        open={confirmBatchDelete}
        title="批量删除面试记录？"
        message={
          <span>
            确定要删除已选中的{' '}
            <b className="text-red-600">{selectedIds.size}</b> 条面试记录吗？
            <br />
            <span className="text-xs text-slate-500">
              删除后无法恢复，包括所有 Q&A 和评估报告
            </span>
          </span>
        }
        confirmText={`删除 ${selectedIds.size} 条`}
        loading={batchDeleting}
        onConfirm={handleBatchDelete}
        onCancel={() => setConfirmBatchDelete(false)}
      />
    </div>
  )
}

function StatusBadge({ status, mode }: { status: string; mode: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3 h-3" />
        已完成
      </span>
    )
  }
  if (status === 'aborted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-600">
        <XCircle className="w-3 h-3" />
        已中断
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-amber-100 text-amber-700">
      <Zap className="w-3 h-3" />
      进行中
    </span>
  )
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-slate-500">{label}</span>
        <span className="font-bold text-slate-700">{value}</span>
      </div>
      <Progress
        value={value}
        color={value >= 80 ? 'green' : value >= 60 ? 'primary' : value >= 40 ? 'orange' : 'red'}
      />
    </div>
  )
}
