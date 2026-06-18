import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { SplitLayout } from '@/components/layout/SplitLayout'
import { MessageList } from '@/components/chat/MessageList'
import { InputBar } from '@/components/chat/InputBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { RadarChart } from '@/components/radar/RadarChart'
import { TagCloud } from '@/components/jd/TagCloud'
import {
  ArrowLeft,
  Square,
  Award,
  Loader2,
  FileDown,
  Zap,
  Star,
  Flame,
  Brain,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import { useInterviewStore } from '@/stores/interview.store'
import { useJdStore } from '@/stores/jd.store'
import { interviewApi, reportApi } from '@/api/client'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'

export function InterviewPage() {
  const navigate = useNavigate()
  const {
    session,
    messages,
    status,
    report,
    addMessage,
    updateLastMessage,
    setStatus,
    setReport,
  } = useInterviewStore()
  const { currentJd } = useJdStore()
  const [submitting, setSubmitting] = useState(false)
  const [ending, setEnding] = useState(false)
  const [exportingMd, setExportingMd] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  if (!session) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-slate-600">未启动面试会话</p>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    )
  }

  const currentSkill = messages[messages.length - 1]?.skill || session.currentSkill
  const currentDepth = messages[messages.length - 1]?.depth || 0
  const skillIndex = session.skillsToCover.indexOf(currentSkill)

  const handleSend = async (text: string) => {
    if (status !== 'running' || !session) return
    setSubmitting(true)

    // ⭐ 1. 立刻插入候选人消息（前端显示用，不入库 — 后端会入库）
    addMessage({
      id: `m-${Date.now()}-user`,
      role: 'candidate',
      content: text,
    })

    // 2. 插入占位的面试官消息（流式填充）
    const placeholderId = `m-${Date.now()}-placeholder`
    addMessage({
      id: placeholderId,
      role: 'interviewer',
      content: '',
      streaming: true,
      // ⭐ 标记为 SSE 流式更新，MessageItem 会跳过 useTypewriter
      liveStream: true,
    } as any)

    // 3. 建立 SSE 流式连接
    let accumulated = ''

    const cleanup = interviewApi.chatStream(session.sessionId, text, {
      onStatus: (s) => {
        // 评估中 / 出题中（暂不更新 UI，靠占位消息 + 光标提示）
      },
      onDelta: (chunk) => {
        accumulated += chunk
        // ⭐ 实时追加到占位消息（保留 streaming + liveStream）
        updateLastMessage({ content: accumulated } as any)
      },
      onComplete: async (data) => {
        if (data.type === 'end') {
          updateLastMessage({
            id: `m-${Date.now()}-end`,
            content: data.feedback || '面试已结束',
            streaming: false,
            liveStream: false,
          } as any)
          await handleEnd()
        } else {
          // ⭐ 流式完成，关闭 liveStream 标记
          updateLastMessage({
            id: `m-${Date.now()}-next`,
            content: data.question || accumulated,
            skill: data.skill,
            type: data.type as any,
            difficulty: data.difficulty,
            depth: data.depth,
            hint: mode === 'practice' ? data.hint : '',
            streaming: false,
            liveStream: false,
          } as any)
          if (data.progress) setProgress(data.progress)
        }
      },
      onError: (msg) => {
        console.warn('SSE 失败，回退到普通 chat:', msg)
        fallbackToChat(text, accumulated, placeholderId)
      },
    })

    // 兜底超时
    setTimeout(() => {
      cleanup()
    }, 120000)

    // 监听流式完成（用 effect 模式有问题，这里用一个 promise 包装）
    setSubmitting(false)
  }

  // 流式失败时的回退方案
  const fallbackToChat = async (text: string, accumulated: string, placeholderId: string) => {
    if (!session) return
    try {
      const result = await interviewApi.chat(session.sessionId, text)
      if (result.status === 'ended') {
        updateLastMessage({
          id: `m-${Date.now()}-end`,
          content: result.feedback || '面试已结束',
          streaming: false,
          liveStream: false,
        } as any)
        await handleEnd()
      } else {
        updateLastMessage({
          id: `m-${Date.now()}-next`,
          content: result.nextQuestion || accumulated,
          skill: result.currentSkill,
          type: result.currentType,
          difficulty: result.currentDifficulty,
          depth: result.currentDepth,
          hint: mode === 'practice' ? result.hint : '',
          streaming: false,
          liveStream: false,
        } as any)
        if (result.progress) setProgress(result.progress)
      }
    } catch (e: any) {
      alert(`提交失败：${e.response?.data?.message || e.message}`)
    }
  }

  const handleEnd = async () => {
    if (!session) return
    setEnding(true)
    try {
      const r = await interviewApi.end(session.sessionId)
      console.log('[面试报告]', r, 'summary 类型:', typeof r?.summary, r?.summary)
      setReport(r)
    } catch (e: any) {
      alert(`生成报告失败：${e.response?.data?.message || e.message}`)
    } finally {
      setEnding(false)
    }
  }

  const handleExportMd = async () => {
    if (!session) return
    setExportingMd(true)
    try {
      await reportApi.exportMarkdown(session.sessionId)
    } catch (e: any) {
      alert(`导出 Markdown 失败：${e.message}`)
    } finally {
      setExportingMd(false)
    }
  }

  const mode = session.mode
  const modeIcon = {
    quick: <Zap className="w-3 h-3" />,
    standard: <Star className="w-3 h-3" />,
    deep: <Flame className="w-3 h-3" />,
  } as const

  return (
    <div className="h-screen flex flex-col mesh-bg">
      {/* 顶部工具栏 */}
      <header className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-soft">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">{session.jdTitle}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                {status === 'ended' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600">已结束</span>
                  </>
                ) : progress ? (
                  <>
                    <span className="font-medium text-indigo-600">{progress.current}</span>
                    <span>/</span>
                    <span>{progress.total}</span>
                    <span>题</span>
                  </>
                ) : (
                  <>进行中</>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md',
              mode === 'practice'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-rose-100 text-rose-700',
            )}
          >
            {mode === 'practice' ? '🎓 练习模式' : '⚠️ 严格模式'}
          </span>
          {status === 'running' && (
            <Button onClick={handleEnd} variant="secondary" size="sm" loading={ending}>
              <Square className="w-3.5 h-3.5" /> 结束面试
            </Button>
          )}
        </div>
      </header>

      {/* 双栏 */}
      <div className="flex-1 overflow-hidden">
        <SplitLayout
          left={
            <div className="flex flex-col h-full bg-white relative">
              <MessageList />
              {status === 'running' && (
                <InputBar
                  onSend={handleSend}
                  loading={submitting}
                  disabled={status !== 'running'}
                  placeholder={mode === 'practice' ? '尽可能详细地回答...' : '严格模式：每题尽量完整回答'}
                />
              )}
              {status === 'ended' && report && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-t bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 text-center text-sm text-emerald-700 font-medium"
                >
                  ✅ 面试已完成，右侧查看评估报告
                </motion.div>
              )}
            </div>
          }
          right={
            <div className="space-y-4">
              {/* 当前进度 */}
              <Card
                title="当前进度"
                icon={<TrendingUp className="w-4 h-4" />}
                variant="elevated"
              >
                <div className="space-y-3">
                  {progress && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-600">整体进度</span>
                        <span className="font-semibold text-slate-800">
                          {progress.current} / {progress.total}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(progress.current / progress.total) * 100}%`,
                          }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <InfoRow label="当前技能" value={currentSkill} highlight />
                    <InfoRow
                      label="题目类型"
                      value={getTypeLabel(messages[messages.length - 1]?.type || 'basic')}
                    />
                    <InfoRow
                      label="难度"
                      value={'⭐'.repeat(messages[messages.length - 1]?.difficulty || 2)}
                    />
                    <InfoRow label="追问" value={`${currentDepth + 1} / 3`} />
                  </div>
                </div>
              </Card>

              {/* 技能列表 */}
              {currentJd && (
                <Card title="技能标签" icon={<Sparkles className="w-4 h-4" />}>
                  <TagCloud skills={currentJd.skills} />
                </Card>
              )}

              {/* 评估报告 */}
              {status === 'ended' && ending && (
                <Card title="生成评估中" icon={<Loader2 className="w-4 h-4 animate-spin" />}>
                  <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
                    AI 正在生成评估报告...
                  </div>
                </Card>
              )}

              {report && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card
                    title="综合评估雷达图"
                    icon={<Award className="w-4 h-4" />}
                    variant="gradient"
                    extra={
                      <Button
                        onClick={handleExportMd}
                        loading={exportingMd}
                        variant="gradient"
                        size="sm"
                        title="导出 Markdown 报告（含每题参考答案）"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        导出报告
                      </Button>
                    }
                  >
                    <RadarChart scores={report.radar} />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                      <ScoreBox label="基础" value={report.radar.basic} />
                      <ScoreBox label="项目" value={report.radar.project} />
                      <ScoreBox label="系统设计" value={report.radar.systemDesign} />
                      <ScoreBox label="沟通" value={report.radar.communication} />
                    </div>
                  </Card>
                </motion.div>
              )}

              {report && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card title="整体评价" icon={<Sparkles className="w-4 h-4" />}>
                    <div className="text-sm text-slate-700 leading-relaxed space-y-2">
                      {formatReportSummary(report)}
                    </div>
                  </Card>
                </motion.div>
              )}

              {report?.suggestions?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card title="改进建议" icon={<TrendingUp className="w-4 h-4" />}>
                    <div className="space-y-2">
                      {report.suggestions.map((s, i) => (
                        <div
                          key={i}
                          className={clsx(
                            'p-3 rounded-xl border-l-4 text-xs',
                            s.priority === 'high' && 'bg-red-50 border-red-400',
                            s.priority === 'medium' && 'bg-amber-50 border-amber-400',
                            s.priority === 'low' && 'bg-blue-50 border-blue-400',
                          )}
                        >
                          <div className="font-semibold text-slate-800 mb-0.5">{s.area}</div>
                          <div className="text-slate-600 leading-relaxed">{s.action}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}

              {!report && status === 'running' && (
                <Card variant="glass">
                  <div className="text-center py-6 text-slate-400 text-sm">
                    <Award className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    完成所有问题后，评估报告将显示在这里
                  </div>
                </Card>
              )}
            </div>
          }
        />
      </div>
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className={clsx('font-semibold', highlight ? 'text-indigo-600' : 'text-slate-800')}>
        {value}
      </span>
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

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    basic: '📘 基础',
    project: '💼 项目',
    system: '🏗️ 系统',
    scenario: '🎬 场景',
  }
  return map[type] || '📘 基础'
}

function formatReportSummary(report: any): React.ReactNode {
  const summary = report?.summary
  if (summary && typeof summary === 'object') {
    return (
      <>
        {summary.overall && <p>{String(summary.overall)}</p>}
        {summary.strengths && (
          <div>
            <b>✨ 亮点：</b>
            <ul className="list-disc pl-5 mt-1">
              {summary.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
        {summary.weaknesses && (
          <div>
            <b>⚠️ 不足：</b>
            <ul className="list-disc pl-5 mt-1">
              {summary.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </>
    )
  }
  const str = String(summary || '暂无评价')
  return str.split(/\n+/).filter((s) => s.trim()).map((p, i) => <p key={i}>{p}</p>)
}
