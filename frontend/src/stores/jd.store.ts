import { create } from 'zustand'
import type { JdParseResult, Resume, ResumeMatchResult } from '@/api/types'

interface JdState {
  currentJd: JdParseResult | null
  currentResume: Resume | null
  matchResult: ResumeMatchResult | null
  loading: boolean
  setJd: (jd: JdParseResult | null) => void
  setResume: (r: Resume | null) => void
  setMatch: (m: ResumeMatchResult | null) => void
  setLoading: (b: boolean) => void
  reset: () => void
}

export const useJdStore = create<JdState>((set) => ({
  currentJd: null,
  currentResume: null,
  matchResult: null,
  loading: false,
  setJd: (jd) => set({ currentJd: jd }),
  setResume: (r) => set({ currentResume: r }),
  setMatch: (m) => set({ matchResult: m }),
  setLoading: (b) => set({ loading: b }),
  reset: () => set({ currentJd: null, currentResume: null, matchResult: null }),
}))
