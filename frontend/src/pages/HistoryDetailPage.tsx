import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { historyApi, reportApi, type HistoryDetail } from '@/api/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { RadarChart } from '@/components/radar/RadarChart'
import { TagCloud } from '@/components/jd/TagCloud'
import {
  ArrowLeft,
  Loader2,
  FileDown,
  Brain,
  Award,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Lightbulb,
  FileText,
  User,
} from 'lucide-react'
import { clsx } from 'clsx'

const TYPE_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  basic: { label: '基础题', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '📘' },
  project: { label: '项目题', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '💼' },
  system: { label: '系统设计', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🏗️' },
  scenario: { label: '场景题', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '🎬' },
}

export function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<HistoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportingWord, setExportingWord] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    historyApi
      .detail(id)
      .then(setData)
      .catch((e) => alert(`加载失败：${e.message}`))
      .finally(() => setLoading(false))
  }, [id])

  const handleExport = async () => {
    if (!id) return
    setExporting(true)
    try {
      await reportApi.exportMarkdown(id)
    } catch (e: any) {
      alert(`导出失败：${e.message}`)
    } finally {
      setExporting(false)
    }
  }

  const handleExportWord = async () => {
    if (!id) return
    setExportingWord(true)
    try {
      await reportApi.exportWord(id)
    } catch (e: any) {
      alert(`导出 Word 失败：${e.message}`)
    } finally {
      setExportingWord(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="flex items-center text-slate-500">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          加载中...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-3">记录不存在</p>
          <Button onClick={() => navigate('/history')}>返回列表</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg">
      {/* Header */}
      <div className="dark-bg">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-10">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/history')}
              className="text-slate-300 hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              返回历史
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={handleExportWord}
                loading={exportingWord}
                variant="gradient"
                size="sm"
              >
                <FileDown className="w-4 h-4" />
                导出 Word
              </Button>
              <Button
                onClick={handleExport}
                loading={exporting}
                variant="secondary"
                size="sm"
              >
                <FileDown className="w-4 h-4" />
                导出 Markdown
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{data.jd.title}</h1>
              <div className="text-sm text-slate-400">
                {new Date(data.startedAt).toLocaleString('zh-CN')} ·{' '}
                {data.mode === 'practice' ? '🎓 练习模式' : '⚠️ 严格模式'} ·{' '}
                {data.qaList.length} 道题
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 左：报告 */}
          <div className="lg:col-span-1 space-y-4">
            {data.report ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  title="综合评估"
                  icon={<Award className="w-4 h-4" />}
                  variant="gradient"
                >
                  <RadarChart scores={data.report.radar} height={220} />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <ScoreBox label="基础" value={data.report.radar.basic} />
                    <ScoreBox label="项目" value={data.report.radar.project} />
                    <ScoreBox label="系统" value={data.report.radar.systemDesign} />
                    <ScoreBox label="沟通" value={data.report.radar.communication} />
                  </div>
                </Card>
              </motion.div>
            ) : (
              <Card variant="glass">
                <div className="text-center py-6 text-slate-500 text-sm">
                  面试未完成，无报告
                </div>
              </Card>
            )}

            {data.report && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card title="整体评价" icon={<Sparkles className="w-4 h-4" />}>
                  <div className="text-sm text-slate-700 leading-relaxed space-y-2">
                    {(data.report.summary || '').split(/\n+/).filter((s) => s.trim()).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {data.report?.suggestions?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card title="改进建议" icon={<TrendingUp className="w-4 h-4" />}>
                  <div className="space-y-2">
                    {data.report.suggestions.map((s, i) => (
                      <div
                        key={i}
                        className={clsx(
                          'p-2.5 rounded-lg border-l-4 text-xs',
                          s.priority === 'high' && 'bg-red-50 border-red-400',
                          s.priority === 'medium' && 'bg-amber-50 border-amber-400',
                          s.priority === 'low' && 'bg-blue-50 border-blue-400',
                        )}
                      >
                        <div className="font-semibold text-slate-800 mb-0.5">{s.area}</div>
                        <div className="text-slate-600">{s.action}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {data.jd.skills?.length > 0 && (
              <Card title="JD 核心技能" icon={<Lightbulb className="w-4 h-4" />}>
                <TagCloud skills={data.jd.skills} />
              </Card>
            )}
          </div>

          {/* 右：Q&A 列表 */}
          <div className="lg:col-span-2 space-y-4">
            <Card title={`逐题详情 (${data.qaList.length} 道)`} icon={<FileText className="w-4 h-4" />}>
              {data.qaList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  没有对话记录
                </div>
              ) : (
                <div className="space-y-4">
                  {data.qaList.map((qa, i) => {
                    const type = TYPE_LABEL[qa.type] || TYPE_LABEL.basic
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="border border-slate-200 rounded-xl overflow-hidden"
                      >
                        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-700">
                            题目 {qa.index}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">
                            {qa.skill}
                          </span>
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded-md text-xs font-semibold border',
                              type.color,
                            )}
                          >
                            {type.icon} {type.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs">
                            {'⭐'.repeat(qa.difficulty)}
                          </span>
                          {qa.depth > 0 && (
                            <span className="text-[10px] text-slate-400">
                              追问 {qa.depth + 1}/3
                            </span>
                          )}
                          {qa.evaluation && (
                            <span className="ml-auto text-[10px] text-slate-500">
                              深度 <b className="text-slate-700">{qa.evaluation.depthScore}</b>{' '}
                              · 清晰{' '}
                              <b className="text-slate-700">{qa.evaluation.clarity}</b> · 准确{' '}
                              <b className="text-slate-700">{qa.evaluation.accuracy}</b>
                            </span>
                          )}
                        </div>

                        <div className="p-4 space-y-3">
                          <div>
                            <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              面试官提问
                            </div>
                            <div className="text-sm text-slate-800 leading-relaxed bg-slate-50 rounded-lg p-3">
                              {qa.question}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              候选人回答
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed bg-emerald-50 rounded-lg p-3 whitespace-pre-wrap">
                              {qa.answer || (
                                <span className="text-slate-400 italic">（未作答）</span>
                              )}
                            </div>
                          </div>

                          {qa.feedback && (
                            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                              <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>💡 {qa.feedback}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
      <div className="text-lg font-bold gradient-text">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  )
}
