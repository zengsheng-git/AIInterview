import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sparkles } from 'lucide-react'
import { jdApi } from '@/api/client'
import { useJdStore } from '@/stores/jd.store'

export function JdInput() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const loading = useJdStore((s) => s.loading)
  const setLoading = useJdStore((s) => s.setLoading)
  const setJd = useJdStore((s) => s.setJd)

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const result = await jdApi.parse(text, title || undefined)
      setJd(result)
    } catch (e: any) {
      alert(`解析失败：${e.response?.data?.message || e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="岗位名称（可选，如：高级前端工程师）"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="粘贴目标岗位 JD 文本...&#10;&#10;例如：&#10;职位：高级前端工程师&#10;要求：5 年以上 React 经验，熟悉 TypeScript、性能优化..."
        className="w-full h-48 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 resize-none"
      />
      <Button onClick={handleParse} loading={loading} disabled={!text.trim()}>
        <Sparkles className="w-4 h-4" />
        解析 JD
      </Button>
    </div>
  )
}
