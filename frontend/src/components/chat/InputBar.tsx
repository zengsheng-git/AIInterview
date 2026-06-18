import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSpeech } from '@/hooks/useSpeech'
import { clsx } from 'clsx'

interface Props {
  onSend: (text: string) => void
  onStop?: () => void
  disabled?: boolean
  loading?: boolean
  placeholder?: string
}

export function InputBar({ onSend, onStop, disabled, loading, placeholder }: Props) {
  const [text, setText] = useState('')
  const { listening, transcript, supported, start, stop, reset } = useSpeech()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 语音转写中时同步到输入框
  const display = listening && transcript ? transcript : text

  // 自动增高 textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    // 重置高度以正确计算 scrollHeight
    el.style.height = 'auto'
    // 设置新高度，限制在 80px - 256px 之间
    const newHeight = Math.min(Math.max(el.scrollHeight, 80), 256)
    el.style.height = `${newHeight}px`
  }, [display])

  const handleSend = () => {
    const final = display.trim()
    if (!final) return
    onSend(final)
    setText('')
    reset()
    // 重置 textarea 高度
    if (textareaRef.current) {
      textareaRef.current.style.height = '80px'
    }
  }

  const toggleMic = () => {
    if (listening) stop()
    else start()
  }

  return (
    <div className="border-t bg-white px-4 py-3">
      <div
        className={clsx(
          'flex items-end gap-2 px-3 py-2.5 border rounded-xl transition-colors',
          listening ? 'border-red-300 bg-red-50/30' : 'border-gray-200 bg-gray-50',
        )}
      >
        {supported && (
          <button
            onClick={toggleMic}
            className={clsx(
              'p-2 rounded-lg transition-colors flex-shrink-0',
              listening ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-200',
            )}
            title={listening ? '停止录音' : '语音输入'}
            type="button"
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={display}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // ⭐ 关键改动：仅在「未按住 Shift」时 Enter 发送，Shift+Enter 才换行
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={disabled}
          placeholder={
            listening
              ? '🎤 正在听...'
              : placeholder || '尽可能详细地回答，按 Enter 发送，Shift+Enter 换行...'
          }
          className="flex-1 bg-transparent border-0 outline-none resize-none text-sm leading-6 px-2 py-1.5 min-h-[80px] max-h-64"
          rows={3}
        />

        {loading ? (
          <Button onClick={onStop} variant="danger" size="sm" disabled={!onStop}>
            <Square className="w-3.5 h-3.5" /> 停止
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={disabled || !display.trim()}
            size="sm"
          >
            <Send className="w-3.5 h-3.5" /> 发送
          </Button>
        )}
      </div>
      {listening && (
        <div className="mt-1 text-xs text-red-500 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          正在听...说完后点击麦克风停止
        </div>
      )}
    </div>
  )
}
