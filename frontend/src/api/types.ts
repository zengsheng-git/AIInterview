// ===== 与后端共享的类型定义 =====

export type Skill = {
  name: string
  category: 'basic' | 'project' | 'system' | 'soft'
  weight: number
  keywords: string[]
}

export type FocusArea = {
  area: string
  depth: number
  sampleQuestions: string[]
}

export type JdParseResult = {
  id: string
  title: string
  skills: Skill[]
  focusAreas: FocusArea[]
  experience?: string
}

export type Resume = {
  id: string
  filename: string
  length: number
  preview?: string
}

export type ResumeMatchResult = {
  overallScore: number
  dimensionScores: {
    skills: number
    experience: number
    projects: number
  }
  matchedSkills: string[]
  missingSkills: string[]
  highlights: string[]
  gaps: string[]
  predictedQuestions: Array<{
    question: string
    reason: string
    category: 'basic' | 'project' | 'system' | 'pressure'
  }>
}

export type InterviewStartResult = {
  sessionId: string
  mode: 'practice' | 'strict'
  jdTitle: string
  firstQuestion: string
  currentSkill: string
  currentType?: 'basic' | 'project' | 'system' | 'scenario'
  currentDifficulty?: number
  hint: string
  skillsToCover: string[]
  totalQuestions?: number
  questionIndex?: number
}

export type InterviewChatResult = {
  status: 'continue' | 'ended'
  evaluation?: {
    depthScore: number
    clarity: number
    accuracy: number
  }
  feedback?: string
  currentSkill?: string
  currentType?: 'basic' | 'project' | 'system' | 'scenario'
  currentDifficulty?: number
  currentDepth?: number
  nextQuestion?: string
  hint?: string
  progress?: {
    current: number
    total: number
  }
}

export type InterviewReport = {
  sessionId: string
  radar: {
    basic: number
    project: number
    systemDesign: number
    communication: number
  }
  summary: string
  suggestions: Array<{
    area: string
    action: string
    priority: 'high' | 'medium' | 'low'
  }>
  createdAt: string
}
