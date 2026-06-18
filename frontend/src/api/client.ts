import axios from 'axios'
import type {
  JdParseResult,
  Resume,
  ResumeMatchResult,
  InterviewStartResult,
  InterviewChatResult,
  InterviewReport,
} from './types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000,
})

// ============ JD ============

export const jdApi = {
  parse: (text: string, title?: string) =>
    api.post<JdParseResult>('/jd/parse', { text, title }).then((r) => r.data),

  get: (id: string) => api.get<JdParseResult>(`/jd/${id}`).then((r) => r.data),
}

// ============ Resume ============

export const resumeApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<Resume>('/resume/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  uploadText: (filename: string, text: string) =>
    api.post<Resume>('/resume/text', { filename, text }).then((r) => r.data),

  match: (resumeId: string, jdId: string) =>
    api
      .post<ResumeMatchResult>('/resume/match', { resumeId, jdId })
      .then((r) => r.data),
}

// ============ Interview ============

export const interviewApi = {
  start: (params: { jdId: string; resumeId?: string; mode: 'practice' | 'strict' }) =>
    api.post<InterviewStartResult>('/interview/start', params).then((r) => r.data),

  chat: (sessionId: string, answer: string) =>
    api
      .post<InterviewChatResult>('/interview/chat', { sessionId, answer })
      .then((r) => r.data),

  end: (sessionId: string) =>
    api.post<InterviewReport>('/interview/end', { sessionId }).then((r) => r.data),

  getReport: (sessionId: string) =>
    api.get<InterviewReport>(`/interview/${sessionId}/report`).then((r) => r.data),

  /**
   * 流式追问（SSE）
   * onDelta: 收到每个文字块
   * onComplete: 收到完整结果（含 evaluation / question / hint / progress）
   * onEnd: 面试结束
   * onError: 出错
   */
  chatStream(
    sessionId: string,
    answer: string,
    callbacks: {
      onStatus?: (status: 'evaluating' | 'asking' | 'done') => void
      onDelta?: (text: string) => void
      onComplete?: (data: {
        type: 'question' | 'end'
        question?: string
        skill?: string
        type?: string
        difficulty?: number
        depth?: number
        hint?: string
        progress?: { current: number; total: number }
        evaluation?: any
        feedback?: string
      }) => void
      onError?: (msg: string) => void
    },
  ) {
    const url = `${
      import.meta.env.VITE_API_BASE_URL || '/api'
    }/interview/${sessionId}/stream?answer=${encodeURIComponent(answer || '')}`

    // EventSource 原生只支持 GET，我们的 GET 端点能接受 query 参数
    const es = new EventSource(url)

    es.addEventListener('status', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        callbacks.onStatus?.(data.type)
      } catch {}
    })

    es.addEventListener('delta', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        callbacks.onDelta?.(data.text)
      } catch {}
    })

    es.addEventListener('complete', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        callbacks.onComplete?.(data)
      } catch {}
    })

    es.addEventListener('error', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        callbacks.onError?.(data.message || '流式连接出错')
      } catch {
        callbacks.onError?.('流式连接出错')
      }
      es.close()
    })

    es.addEventListener('done', () => {
      es.close()
    })

    return () => es.close()
  },
}

// ============ Health ============

export const healthApi = {
  check: () => api.get('/health').then((r) => r.data),
}

// ============ Report Export ============

/**
 * 触发浏览器下载后端返回的文件
 */
async function downloadFromApi(url: string, fallbackFilename: string) {
  const response = await fetch(url, { method: 'GET' })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(err || '下载失败')
  }
  // 从 Content-Disposition 头取文件名
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  const filename = match ? decodeURIComponent(match[1]) : fallbackFilename

  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

export const reportApi = {
  exportMarkdown: (sessionId: string) =>
    downloadFromApi(
      `${import.meta.env.VITE_API_BASE_URL || '/api'}/report/${sessionId}/markdown`,
      `面试报告.md`,
    ),
  exportWord: (sessionId: string) =>
    downloadFromApi(
      `${import.meta.env.VITE_API_BASE_URL || '/api'}/report/${sessionId}/word`,
      `面试报告.docx`,
    ),
}

// ============ History ============

export type HistoryItem = {
  id: string
  jdId: string
  jdTitle: string
  mode: 'practice' | 'strict'
  status: string
  messageCount: number
  radar: { basic: number; project: number; systemDesign: number; communication: number } | null
  overallScore: number | null
  startedAt: string
  endedAt: string | null
  duration: number | null
}

export type HistoryDetail = {
  id: string
  jd: {
    id: string
    title: string
    skills: any[]
    focusAreas: any[]
  }
  mode: 'practice' | 'strict'
  status: string
  startedAt: string
  endedAt: string | null
  config: any
  report: {
    radar: { basic: number; project: number; systemDesign: number; communication: number }
    summary: string
    suggestions: Array<{ area: string; action: string; priority: string }>
    createdAt: string
  } | null
  qaList: Array<{
    index: number
    question: string
    answer: string
    skill: string
    type: string
    difficulty: number
    depth: number
    evaluation?: { depthScore: number; clarity: number; accuracy: number }
    feedback?: string
  }>
}

export const historyApi = {
  list: (params?: { keyword?: string; limit?: number; offset?: number }) => {
    const search = new URLSearchParams()
    if (params?.keyword) search.set('keyword', params.keyword)
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.offset) search.set('offset', String(params.offset))
    const q = search.toString()
    return api
      .get<{ total: number; items: HistoryItem[] }>(`/history${q ? '?' + q : ''}`)
      .then((r) => r.data)
  },

  detail: (id: string) =>
    api.get<HistoryDetail>(`/history/${id}`).then((r) => r.data),

  remove: (id: string) =>
    api.delete<{ ok: boolean; id: string }>(`/history/${id}`).then((r) => r.data),

  removeMany: (ids: string[]) =>
    api
      .post<{ ok: boolean; deletedCount: number }>('/history/batch-delete', { ids })
      .then((r) => r.data),
}
