import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { JdInput } from '@/components/jd/JdInput'
import { TagCloud } from '@/components/jd/TagCloud'
import { ResumeUpload } from '@/components/resume/ResumeUpload'
import { MatchScore } from '@/components/resume/MatchScore'
import { ModeSwitch } from '@/components/mode/ModeSwitch'
import { Button } from '@/components/ui/Button'
import { useJdStore } from '@/stores/jd.store'
import { useInterviewStore } from '@/stores/interview.store'
import { useState } from 'react'
import { interviewApi } from '@/api/client'
import {
  Play,
  RotateCcw,
  Zap,
  Star,
  Flame,
  Sparkles,
  FileText,
  Target,
  Brain,
  Trophy,
  CheckCircle2,
  ArrowRight,
  Wand2,
  Briefcase,
  Lightbulb,
  History,
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'

export function HomePage() {
  const navigate = useNavigate()
  const { currentJd, currentResume, matchResult, reset } = useJdStore()
  const resetInterview = useInterviewStore((s) => s.reset)
  const startInterview = useInterviewStore((s) => s.start)
  const [mode, setMode] = useState<'practice' | 'strict'>('practice')
  const [questionMode, setQuestionMode] = useState<'quick' | 'standard' | 'deep'>('standard')
  const [starting, setStarting] = useState(false)

  const canStart = !!currentJd
  const step = currentJd ? (currentResume ? (matchResult ? 4 : 3) : 2) : 1

  const handleStart = async () => {
    if (!currentJd) return
    setStarting(true)
    try {
      const result = await interviewApi.start({
        jdId: currentJd.id,
        resumeId: currentResume?.id,
        mode,
        questionMode,
      })
      startInterview(result)
      navigate('/interview')
    } catch (e: any) {
      alert(`启动失败：${e.response?.data?.message || e.message}`)
    } finally {
      setStarting(false)
    }
  }

  const handleReset = () => {
    reset()
    resetInterview()
  }

  return (
    <div className="min-h-screen mesh-bg">
      {/* Hero Header */}
      <div className="dark-bg">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">AI Mock Interview</div>
                <div className="text-xs text-slate-400">智能模拟面试系统</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate('/history')}
                variant="secondary"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <History className="w-3.5 h-3.5" />
                历史记录
              </Button>
              <Button
                onClick={handleReset}
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:bg-white/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </Button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              练面试 · <span className="gradient-text">AI 真实模拟</span>
            </h1>
            <p className="text-slate-400 mt-3 text-base max-w-2xl">
              基于 LangGraph 追问状态机 · MiniMax 大模型驱动 · 智能简历对齐 · 多轮深度追问 · 雷达图评估
            </p>
          </motion.div>

          {/* 步骤指示器 */}
          <div className="mt-8 flex items-center gap-2 max-w-2xl">
            {[
              { num: 1, label: '粘贴 JD', icon: FileText },
              { num: 2, label: '提取技能', icon: Wand2 },
              { num: 3, label: '上传简历', icon: Briefcase },
              { num: 4, label: '开始面试', icon: Play },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2 flex-1">
                <div
                  className={clsx(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    step >= s.num
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-glow'
                      : 'bg-white/10 text-slate-500',
                  )}
                >
                  {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <div
                  className={clsx(
                    'text-xs font-medium transition-colors hidden md:block',
                    step >= s.num ? 'text-white' : 'text-slate-500',
                  )}
                >
                  {s.label}
                </div>
                {s.num < 4 && (
                  <ArrowRight
                    className={clsx(
                      'w-3 h-3 mx-1 transition-colors',
                      step > s.num ? 'text-indigo-400' : 'text-slate-600',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 左：JD 解析 + 简历 */}
          <div className="lg:col-span-2 space-y-5">
            <Card
              title="粘贴目标岗位 JD"
              subtitle="AI 自动提取核心技能点"
              icon={<FileText className="w-4 h-4" />}
              variant="elevated"
            >
              <JdInput />
            </Card>

            {currentJd && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card
                  title="核心技能点"
                  subtitle={`共提取 ${currentJd.skills.length} 个能力要求`}
                  icon={<Target className="w-4 h-4" />}
                >
                  <TagCloud skills={currentJd.skills} />
                </Card>
              </motion.div>
            )}

            {currentJd && currentJd.focusAreas?.length > 0 && (
              <Card
                title="考察重点"
                subtitle="AI 建议的提问方向"
                icon={<Lightbulb className="w-4 h-4" />}
              >
                <div className="space-y-3">
                  {currentJd.focusAreas.map((f, i) => (
                    <div
                      key={i}
                      className="relative pl-4 py-1.5 border-l-2 border-gradient-to-b from-indigo-500 to-purple-500"
                      style={{ borderImage: 'linear-gradient(to bottom, #6366f1, #8b5cf6) 1' }}
                    >
                      <div className="text-sm font-semibold text-slate-800">{f.area}</div>
                      <div className="text-xs text-slate-500 mt-0.5">建议追问深度: {f.depth}</div>
                      {f.sampleQuestions?.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {f.sampleQuestions.map((q, j) => (
                            <li key={j} className="text-xs text-slate-600 flex gap-1.5">
                              <span className="text-indigo-400">•</span>
                              {q}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card
              title="上传简历（可选）"
              subtitle="AI 分析匹配度，预测压力面问题"
              icon={<Briefcase className="w-4 h-4" />}
            >
              <ResumeUpload />
            </Card>
          </div>

          {/* 右：匹配结果 + 启动 */}
          <div className="space-y-5">
            {matchResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card
                  title="简历-JD 匹配分析"
                  icon={<Trophy className="w-4 h-4" />}
                  variant="gradient"
                >
                  <MatchScore result={matchResult} />
                </Card>
              </motion.div>
            )}

            {canStart && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card
                  title="启动模拟面试"
                  subtitle="选择模式和题目数量"
                  icon={<Play className="w-4 h-4" />}
                  variant="elevated"
                >
                  <div className="space-y-5">
                    <div>
                      <div className="text-xs font-medium text-slate-700 mb-2.5">面试模式</div>
                      <ModeSwitch value={mode} onChange={setMode} />
                      <div className="mt-2 text-[11px] text-slate-500">
                        {mode === 'practice'
                          ? '💡 练习模式：每答一题立刻给提示和建议'
                          : '⚠️ 严格模式：问完所有问题才统一给评估报告'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-700 mb-2.5">题目数量</div>
                      <div className="space-y-2">
                        <QuestionModeCard
                          active={questionMode === 'quick'}
                          onClick={() => setQuestionMode('quick')}
                          icon={<Zap className="w-4 h-4" />}
                          title="快速"
                          count="3 题"
                          desc="只考基础概念"
                          duration="5-10 分钟"
                          color="yellow"
                        />
                        <QuestionModeCard
                          active={questionMode === 'standard'}
                          onClick={() => setQuestionMode('standard')}
                          icon={<Star className="w-4 h-4" />}
                          title="标准"
                          count="5 题"
                          desc="核心技能 + 项目"
                          duration="20-30 分钟"
                          color="blue"
                        />
                        <QuestionModeCard
                          active={questionMode === 'deep'}
                          onClick={() => setQuestionMode('deep')}
                          icon={<Flame className="w-4 h-4" />}
                          title="深入"
                          count="9 题"
                          desc="全技能 × 全类型"
                          duration="40-60 分钟"
                          color="red"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleStart}
                      loading={starting}
                      size="xl"
                      variant="gradient"
                      block
                    >
                      <Play className="w-4 h-4" />
                      开始模拟面试
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {!canStart && (
              <Card
                title="提示"
                icon={<Sparkles className="w-4 h-4" />}
                variant="glass"
              >
                <p className="text-sm text-slate-600 leading-relaxed">
                  👈 请先在左侧 <b>粘贴 JD 文本</b> 并解析，AI 会自动提取核心技能点，然后再选择模式开始面试。
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionModeCard({
  active,
  onClick,
  icon,
  title,
  count,
  desc,
  duration,
  color,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  count: string
  desc: string
  duration: string
  color: 'yellow' | 'blue' | 'red'
}) {
  const colorMap = {
    yellow: {
      active: 'bg-yellow-50 border-yellow-400 ring-yellow-200',
      text: 'text-yellow-700',
      icon: 'text-yellow-500',
    },
    blue: {
      active: 'bg-indigo-50 border-indigo-400 ring-indigo-200',
      text: 'text-indigo-700',
      icon: 'text-indigo-500',
    },
    red: {
      active: 'bg-rose-50 border-rose-400 ring-rose-200',
      text: 'text-rose-700',
      icon: 'text-rose-500',
    },
  }
  const c = colorMap[color]
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full p-3 rounded-xl border-2 text-left transition-all',
        active
          ? `${c.active} ring-2 ring-offset-1`
          : 'border-slate-200 hover:border-slate-300 bg-white',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={clsx(active && c.icon)}>{icon}</span>
        <span className={clsx('text-sm font-semibold', active ? c.text : 'text-slate-800')}>
          {title}
        </span>
        <span
          className={clsx(
            'ml-auto text-xs font-bold px-2 py-0.5 rounded-md',
            active ? c.text + ' bg-white/60' : 'text-slate-500 bg-slate-100',
          )}
        >
          {count}
        </span>
      </div>
      <div className="text-[11px] text-slate-500 leading-tight">{desc}</div>
      <div className="text-[10px] text-slate-400 mt-1">⏱ {duration}</div>
    </button>
  )
}
