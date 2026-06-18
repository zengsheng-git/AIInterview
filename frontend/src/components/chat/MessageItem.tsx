import { useTypewriter } from '@/hooks/useTypewriter'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { clsx } from 'clsx'
import { Bot, User, Lightbulb } from 'lucide-react'
import type { ChatMessage } from '@/stores/interview.store'

export function MessageItem({ message, isLast }: { message: ChatMessage; isLast: boolean }) {
  const isInterviewer = message.role === 'interviewer'
  // ⭐ 如果是 SSE 流式更新的消息，不走 useTypewriter（避免双重打字机）
  const isLiveStream = (message as any).liveStream === true
  const shouldType = !isLiveStream && isInterviewer && isLast && !message.streaming
  const displayed = useTypewriter(message.content, 25, shouldType)
  const content = shouldType ? displayed : message.content
  const isTyping = shouldType && displayed.length < message.content.length

  return (
    <div
      className={clsx(
        'flex gap-3 mb-6 group',
        isInterviewer ? '' : 'flex-row-reverse',
      )}
    >
      <div
        className={clsx(
          'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm',
          isInterviewer
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600',
        )}
      >
        {isInterviewer ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
      </div>

      <div className={clsx('flex-1 max-w-[80%]', !isInterviewer && 'flex flex-col items-end')}>
        {message.skill && (
          <div className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
              {message.skill}
            </span>
            {message.type && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                {message.type === 'basic' && '📘 基础'}
                {message.type === 'project' && '💼 项目'}
                {message.type === 'system' && '🏗️ 系统'}
                {message.type === 'scenario' && '🎬 场景'}
              </span>
            )}
            {message.difficulty !== undefined && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                {'⭐'.repeat(message.difficulty)}
              </span>
            )}
            {message.depth !== undefined && (
              <span className="text-slate-400">追问 {message.depth + 1}/3</span>
            )}
          </div>
        )}

        <div
          className={clsx(
            'inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm',
            isInterviewer
              ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-md'
              : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-md',
          )}
        >
          {isInterviewer ? (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {content}
              </ReactMarkdown>
              {/* 流式更新中显示光标 */}
              {(isTyping || isLiveStream) && message.content && (
                <span className="cursor-blink" />
              )}
              {/* 还没收到内容时显示加载 */}
              {!content && isLiveStream && (
                <span className="text-slate-400 italic">▌ 正在出题...</span>
              )}
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{content}</div>
          )}
        </div>

        {message.hint && isLast && isInterviewer && (
          <div className="mt-2 inline-flex items-start gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 max-w-md">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>💡 {message.hint}</span>
          </div>
        )}

        {message.evaluation && (
          <div className="mt-2 inline-flex items-center gap-3 text-[10px] text-slate-500 px-1">
            <span>
              深度 <b className="text-slate-700">{message.evaluation.depthScore}</b>
            </span>
            <span>
              清晰 <b className="text-slate-700">{message.evaluation.clarity}</b>
            </span>
            <span>
              准确 <b className="text-slate-700">{message.evaluation.accuracy}</b>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
