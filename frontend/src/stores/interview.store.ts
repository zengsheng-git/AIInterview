import { create } from 'zustand'
import type { InterviewStartResult, InterviewReport } from '@/api/types'

export type ChatMessage = {
  id: string
  role: 'interviewer' | 'candidate' | 'system'
  content: string
  skill?: string
  type?: 'basic' | 'project' | 'system' | 'scenario'
  difficulty?: number
  depth?: number
  hint?: string
  evaluation?: {
    depthScore: number
    clarity: number
    accuracy: number
  }
  streaming?: boolean
  /** SSE 流式更新标记：true 时跳过 useTypewriter */
  liveStream?: boolean
}

interface InterviewState {
  session: InterviewStartResult | null
  messages: ChatMessage[]
  mode: 'practice' | 'strict'
  status: 'idle' | 'running' | 'ended'
  report: InterviewReport | null
  start: (s: InterviewStartResult) => void
  addMessage: (m: ChatMessage) => void
  updateLastMessage: (patch: Partial<ChatMessage>) => void
  setStatus: (s: InterviewState['status']) => void
  setReport: (r: InterviewReport) => void
  reset: () => void
}

export const useInterviewStore = create<InterviewState>((set) => ({
  session: null,
  messages: [],
  mode: 'practice',
  status: 'idle',
  report: null,
  start: (s) =>
    set({
      session: s,
      mode: s.mode,
      status: 'running',
      messages: [
        {
          id: 'm-0',
          role: 'interviewer',
          content: s.firstQuestion,
          skill: s.currentSkill,
          type: s.currentType,
          difficulty: s.currentDifficulty,
          hint: s.hint,
        },
      ],
    }),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  updateLastMessage: (patch) =>
    set((s) => {
      const arr = [...s.messages]
      arr[arr.length - 1] = { ...arr[arr.length - 1], ...patch }
      return { messages: arr }
    }),
  setStatus: (status) => set({ status }),
  setReport: (report) => set({ report, status: 'ended' }),
  reset: () => set({ session: null, messages: [], status: 'idle', report: null }),
}))
