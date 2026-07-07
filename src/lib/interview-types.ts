// Shared interview types for the grouped-pipeline UI (Interviews tab,
// ApplicationPipeline, RoundCard, applications/[id] page). Kept in one place so
// the flat-list era's duplicated interface can't drift between components.

export interface Interviewer {
  id: string
  name: string
  title?: string
  department?: string
  email?: string
  linkedInUrl?: string
  notes?: string
  impression?: string
  topics: string[]
}

export interface Interview {
  id: string
  applicationId: string
  scheduledDate: string | null
  scheduledTime?: string
  duration?: number
  actualDate?: string
  interviewType: string
  round: number
  stage?: string
  location?: string
  meetingLink?: string
  status: string
  outcome?: string
  preparationNotes?: string
  postInterviewNotes?: string
  transcript?: string
  aiAnalysis?: Record<string, unknown>
  followUpSteps?: Array<{ priority: string; action: string; timing: string; reason: string }>
  analyzedAt?: string
  companyFeedback?: string
  autoDetected?: boolean
  archived?: boolean
  createdAt?: string
  prepBrief?: {
    companyBrief?: string
    likelyQuestions?: string[]
    talkingPoints?: string[]
    questionsToAsk?: string[]
  } | null
  interviewers: Interviewer[]
  application?: {
    id: string
    company: string
    role: string
    status: string
    jobUrl?: string
  }
}

export interface PipelineApplication {
  id: string
  company: string
  role: string
  status: string
  jobUrl?: string
}
