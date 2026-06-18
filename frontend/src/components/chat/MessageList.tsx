import { useEffect, useRef } from 'react'
import { useInterviewStore } from '@/stores/interview.store'
import { MessageItem } from './MessageItem'

export function MessageList() {
  const messages = useInterviewStore((s) => s.messages)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {messages.length === 0 ? (
        <div className="text-center text-gray-400 mt-20 text-sm">
          还没有对话，点击"开始面试"启动模拟面试
        </div>
      ) : (
        messages.map((m, i) => (
          <MessageItem key={m.id} message={m} isLast={i === messages.length - 1} />
        ))
      )}
      <div ref={endRef} />
    </div>
  )
}
