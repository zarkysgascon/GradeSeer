import { assembleSubjectContext } from "./assembleSubjectContext"
import { Array } from "effect"
import _ from "lodash"

type ItemInput = {
  id?: string
  name: string
  score?: number | null
  max?: number | null
  date?: string | null
  target?: number | null
  topic?: string | null
}

type ComponentInput = {
  id?: string
  name: string
  percentage: number
  priority: number
  grade?: number | null
  items?: ItemInput[]
}

type Subject = {
  id: string
  name: string
  target_grade?: number | null
  color?: string
  components: ComponentInput[]
  units?: number
}

type DashboardData = {
  subjects: Subject[]
  upcoming: { subject: string; name: string }[]
}

export const systemPrompt = `You are a strategic academic advisor and study coach for college students. Your job is to provide honest, empathetic, and actionable guidance on their grades and study strategies.

Your Personality:
- Direct but caring
- Conversational
- Contextual
- Proactive
- Encouraging but realistic

How You Respond:
1. Assess the Situation Honestly
2. Explain WHY, Not Just WHAT
3. Give Specific, Actionable Steps
4. Adapt Tone to Context
5. End with Engagement

What You DON'T Do:
- No repeated template formats
- No emoji bullet spam
- No generic advice
- No ignoring context
- Do not end without a call to action

Response Length:
- Short questions: 100-150 words
- Complex analysis: 200-300 words`

function gradeNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0
  if (typeof v === "number") return v
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

function calculateGPA(subjects: Subject[]) {
  const totals = _.reduce(subjects, (acc, s) => {
    const ctx = assembleSubjectContext(s as any)
    const g = gradeNumber(ctx.currentStatus.currentGrade)
    const u = gradeNumber(s.units) || 3
    return { totalWeighted: acc.totalWeighted + g * u, totalUnits: acc.totalUnits + u }
  }, { totalWeighted: 0, totalUnits: 0 })
  const gpa = totals.totalUnits > 0 ? totals.totalWeighted / totals.totalUnits : 0
  return {
    gpa: Number(gpa.toFixed(2)),
    totalWeightedScore: Number(totals.totalWeighted.toFixed(2)),
    totalUnits: totals.totalUnits
  }
}

function renderSubjectContext(subject: Subject) {
  const ctx = assembleSubjectContext(subject as any)
  const componentsLine = Array.map(ctx.components, (c) => `${c.name} (${c.weight}%, avg ${c.averageScore})`).join(', ')
  const upcomingLine = ctx.upcomingAssessments.length > 0 ? Array.map(ctx.upcomingAssessments, (i) => i.name).join(', ') : 'None logged'
  return {
    name: subject.name,
    currentGrade: ctx.currentStatus.currentGrade,
    targetGrade: ctx.subject.targetGrade,
    componentsLine,
    upcomingLine
  }
}

function buildSubjectContextBlock(subject: Subject) {
  const s = renderSubjectContext(subject)
  return `Current Context: The user is viewing the "${s.name}" subject page.

Available Data:
- Subject: ${s.name}
- Current Grade: ${s.currentGrade}
- Target Grade: ${s.targetGrade}
- Components: ${s.componentsLine}
- Upcoming Assessments: ${s.upcomingLine}

Your Role Here:
Focus specifically on this subject. Analyze performance, identify patterns, suggest strategies for THIS course, and help prioritize upcoming work in THIS subject.`
}

function buildDashboardContextBlock(data: DashboardData) {
  const metrics = calculateGPA(data.subjects)
  const subjectsBelow = Array.map(
    Array.filter(data.subjects, (s) => {
      const ctx = assembleSubjectContext(s as any)
      return ctx.subject.targetGrade ? ctx.currentStatus.currentGrade > ctx.subject.targetGrade : false
    }),
    (s) => s.name
  )
  const highUpcoming = Array.map(data.upcoming, (i) => `${i.subject}: ${i.name}`)
  return `Current Context: The user is on their main dashboard, viewing all subjects.

Available Data:
- Total Subjects: ${data.subjects.length}
- Overall Semester GPA: ${metrics.gpa}
- Target GPA: ${metrics.gpa}
  - Subjects Below Target: ${subjectsBelow.join(', ') || 'None'}
  - High-Priority Upcoming: ${highUpcoming.join(', ') || 'None'}

Your Role Here:
Take a semester-wide strategic view. Help them prioritize across ALL subjects, manage GPA, balance units, navigate assessment clusters, and use GradeSeer effectively.`
}

function buildAppContextBlock() {
  return `Current Context: The user is asking about how to use GradeSeer or app features.

Your Role Here:
Act as an onboarding guide and app tutorial assistant. Help them add subjects, log grades, understand dashboard metrics, set up targets and units, interpret AI insights, and troubleshoot features. Use simple language and offer step-by-step help.`
}

export function buildAIPrompt(userMessage: string, context: 'subject' | 'dashboard' | 'app', data: any) {
  let contextPrompt = ''
  if (context === 'subject') contextPrompt = buildSubjectContextBlock(data as Subject)
  else if (context === 'dashboard') contextPrompt = buildDashboardContextBlock(data as DashboardData)
  else contextPrompt = buildAppContextBlock()
  return `${systemPrompt}

${contextPrompt}

User's Message: "${userMessage}"

Your Response:
(Provide a helpful, conversational, actionable response based on the context and data above. Be direct, empathetic, specific, and end with engagement.)`
}

