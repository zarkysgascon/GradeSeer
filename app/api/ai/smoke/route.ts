import { NextResponse } from "next/server"
import { assembleSubjectContext } from "@/app/lib/ai/assembleSubjectContext"
import { buildAIPrompt } from "@/app/lib/ai/promptBuilder"

export async function GET() {
  const subject = {
    id: "s1",
    name: "Database Systems",
    target_grade: 3.0,
    color: "#4F46E5",
    units: 3,
    components: [
      { id: "c1", name: "Exams", percentage: 40, priority: 1, items: [
        { id: "i1", name: "Midterm", score: 12, max: 100, date: "", target: null, topic: null },
        { id: "i2", name: "Final", score: null, max: 100, date: "", target: null, topic: null }
      ]},
      { id: "c2", name: "Quizzes", percentage: 20, priority: 2, items: [
        { id: "i3", name: "Quiz 1", score: 55, max: 100, date: "", target: null, topic: null },
        { id: "i4", name: "Quiz 2", score: null, max: 100, date: "", target: null, topic: null }
      ]},
      { id: "c3", name: "Labs", percentage: 40, priority: 3, items: [
        { id: "i5", name: "Lab 1", score: 100, max: 100, date: "", target: null, topic: null }
      ]}
    ]
  }
  const ctx = assembleSubjectContext(subject as any)
  const prompt = buildAIPrompt("What should I focus on?", 'subject', subject as any)
  return NextResponse.json({
    currentGrade: ctx.currentStatus.currentGrade,
    targetGrade: ctx.subject.targetGrade,
    gapToTarget: ctx.currentStatus.gapToTarget,
    safetyZone: ctx.currentStatus.safetyZone,
    promptLength: prompt.length
  })
}

