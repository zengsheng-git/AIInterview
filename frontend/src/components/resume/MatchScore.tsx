import { Progress } from '@/components/ui/Progress'
import { CheckCircle2, XCircle, Lightbulb, TrendingUp } from 'lucide-react'
import type { ResumeMatchResult } from '@/api/types'

export function MatchScore({ result }: { result: ResumeMatchResult }) {
  const getColor = (s: number): 'green' | 'primary' | 'orange' | 'red' =>
    s >= 80 ? 'green' : s >= 60 ? 'primary' : s >= 40 ? 'orange' : 'red'

  return (
    <div className="space-y-4">
      <div className="text-center py-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
        <div className="text-5xl font-extrabold gradient-text">
          {result.overallScore}
        </div>
        <div className="text-xs text-slate-500 mt-1 font-medium">综合匹配度</div>
        <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/60 rounded-full text-[11px] text-slate-600">
          <TrendingUp className="w-3 h-3" />
          {result.overallScore >= 80 ? '优秀' : result.overallScore >= 60 ? '良好' : '需提升'}
        </div>
      </div>

      <div className="space-y-3">
        <ScoreRow label="技能匹配" value={result.dimensionScores.skills} />
        <ScoreRow label="经验匹配" value={result.dimensionScores.experience} />
        <ScoreRow label="项目匹配" value={result.dimensionScores.projects} />
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-3">
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            匹配技能 <span className="text-slate-400 font-normal">({result.matchedSkills.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.matchedSkills.map((s, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            缺失技能 <span className="text-slate-400 font-normal">({result.missingSkills.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.missingSkills.length === 0 ? (
              <span className="text-xs text-slate-400">无</span>
            ) : (
              result.missingSkills.map((s, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-700 border border-red-200 font-medium"
                >
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {result.predictedQuestions.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            预测压力面问题
            <span className="text-slate-400 font-normal">({result.predictedQuestions.length})</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {result.predictedQuestions.map((q, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 hover:bg-amber-50 transition-colors"
              >
                <div className="text-xs text-slate-800 font-medium leading-relaxed">
                  {q.question}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  💡 {q.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="font-bold text-slate-800">{value}</span>
      </div>
      <Progress
        value={value}
        color={value >= 80 ? 'green' : value >= 60 ? 'primary' : value >= 40 ? 'orange' : 'red'}
      />
    </div>
  )
}
