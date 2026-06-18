import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Upload, FileText } from 'lucide-react'
import { resumeApi } from '@/api/client'
import { useJdStore } from '@/stores/jd.store'

export function ResumeUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pasteMode, setPasteMode] = useState(false)
  const [text, setText] = useState('')
  const setResume = useJdStore((s) => s.setResume)
  const setMatch = useJdStore((s) => s.setMatch)
  const currentJd = useJdStore((s) => s.currentJd)

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const r = await resumeApi.upload(file)
      setResume(r)
      // 自动跑匹配
      if (currentJd) {
        const m = await resumeApi.match(r.id, currentJd.id)
        setMatch(m)
      }
    } catch (e: any) {
      alert(`上传失败：${e.response?.data?.message || e.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleText = async () => {
    if (!text.trim()) return
    setUploading(true)
    try {
      const r = await resumeApi.uploadText('manual.txt', text)
      setResume(r)
      setPasteMode(false)
      setText('')
      if (currentJd) {
        const m = await resumeApi.match(r.id, currentJd.id)
        setMatch(m)
      }
    } catch (e: any) {
      alert(`提交失败：${e.response?.data?.message || e.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      {pasteMode ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="粘贴简历文本..."
            className="w-full h-40 px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary-500 resize-none"
          />
          <div className="flex gap-2">
            <Button onClick={handleText} loading={uploading} size="sm" disabled={!text.trim()}>
              提交
            </Button>
            <Button onClick={() => setPasteMode(false)} variant="ghost" size="sm">
              取消
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <Button onClick={() => inputRef.current?.click()} loading={uploading} variant="secondary" size="sm" className="flex-1">
            <Upload className="w-3.5 h-3.5" />
            上传文件
          </Button>
          <Button onClick={() => setPasteMode(true)} variant="secondary" size="sm" className="flex-1">
            <FileText className="w-3.5 h-3.5" />
            粘贴文本
          </Button>
        </div>
      )}
    </div>
  )
}
