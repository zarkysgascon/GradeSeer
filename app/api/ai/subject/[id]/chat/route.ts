import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { subjects, components, items } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { assembleSubjectContext } from "@/app/lib/ai/assembleSubjectContext"

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash"
const STATIC_PREFERENCES = [
  PRIMARY_MODEL,
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest"
]

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    let message: string = String((await req.json())?.message || "Analyze my current status and tell me what to focus on next.")
    message = message.trim().slice(0, 500)

    const rows = await db.select().from(subjects).where(eq(subjects.id, id))
    if (!rows.length) return NextResponse.json({ error: "Subject not found" }, { status: 404 })

    const comps = await db.select().from(components).where(eq(components.subject_id, id))
    const enriched = [] as any[]
    for (const c of comps) {
      const compItems = await db.select().from(items).where(eq(items.component_id, c.id))
      enriched.push({ ...c, percentage: parseFloat(String(c.percentage)), items: compItems })
    }

    const subject = { ...rows[0], target_grade: rows[0].target_grade, components: enriched }
    const context = assembleSubjectContext(subject as any)

    const systemPrompt = `You are a strategic grade advisor for college students. You analyze their current performance in a single course and provide clear, actionable recommendations.

Your Role:
- Analyze the student's grades, assessment structure, and target
- Provide specific score targets for upcoming work
- Prioritize assessments by impact (weight × gap to target)
- Identify performance patterns and strategic insights
- Use clear status indicators (✅ above target, ⚠️ below target, 🎉 achievements)

Response Format:
1. Status Summary (2-3 sentences)
2. What You Need To Do (prioritized list with targets)
3. Strategy/Insight (patterns and advice)

Constraints:
- <=300 words, numbers included, emojis sparingly`

    const renderList = (arr: any[], fmt: (a: any) => string) => arr.map(fmt).join("\n")

    const fullPrompt = `${systemPrompt}

Subject: ${context.subject.name}
Target Grade: ${context.subject.targetGrade} (${context.subject.gradeScale})
Current Grade: ${context.currentStatus.currentGrade}
Gap to Target: ${context.currentStatus.gapToTarget > 0 ? "+" : ""}${context.currentStatus.gapToTarget}
Safety Zone: ${context.currentStatus.safetyZone}
Worst-case: ${context.currentStatus.worstCase}
Best-case: ${context.currentStatus.bestCase}

Completed Assessments:
${renderList(context.completedAssessments, a => `- ${a.name}: ${a.score}/${a.maxScore} (${a.percentage}%) - weight ${a.weight}%`)}

Upcoming Assessments:
${renderList(context.upcomingAssessments, a => `- ${a.name}: weight ${a.weight}%, due ${a.dueDate}`)}

Performance Patterns:
- Quiz average: ${context.performanceInsights.quizAverage}
- Exam average: ${context.performanceInsights.examAverage}
- Strongest component: ${context.performanceInsights.strongestComponent}
- Weakest component: ${context.performanceInsights.weakestComponent}
- Trend: ${context.performanceInsights.trending}

Student's Question: ${message}

Your Response:`

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 })

    // Discover available models for this key
    let preferredModels = STATIC_PREFERENCES.slice()
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
        headers: { "x-goog-api-key": apiKey }
      })
      if (listRes.ok) {
        const listJson = await listRes.json()
        const names: string[] = Array.isArray(listJson?.models)
          ? listJson.models.map((m: any) => String(m?.name || "").replace(/^models\//, "")).filter(Boolean)
          : []
        const supported = (mName: string) => true // assume generateContent supported for simplicity
        const ordered = STATIC_PREFERENCES.filter(p => names.includes(p) && supported(p))
        // add any remaining names not in static prefs
        const extras = names.filter(n => !ordered.includes(n))
        preferredModels = [...ordered, ...extras]
      }
    } catch {}

    let lastErrText = ""
    for (const model of preferredModels) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      const r = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          systemInstruction: { role: "system", parts: [{ text: "You are a helpful academic advisor. Respond in concise, actionable markdown." }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000, candidateCount: 1 },
          safetySettings: [
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUAL_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      })
      if (r.ok) {
        const data = await r.json()
        let text = ""
        const parts = data?.candidates?.[0]?.content?.parts || []
        const textPart = parts.find((p: any) => typeof p?.text === "string")
        if (textPart?.text) text = textPart.text

        if (!text) {
          const risks = context.components
            .map((c: any) => ({ name: c.name, weight: c.weight, status: c.status }))
            .filter((c: any) => c.status === 'below_target')
            .sort((a: any, b: any) => b.weight - a.weight)
            .slice(0, 3)
          const upcoming = context.upcomingAssessments
            .slice()
            .sort((a: any, b: any) => b.weight - a.weight)
            .slice(0, 3)
          const delta = Number(context.currentStatus.gapToTarget || 0)
          text = [
            `📊 Status: ${delta >= 0 ? '✅ Above target' : '⚠️ Below target'} (gap ${delta >= 0 ? '+' : ''}${delta})`,
            `🎯 What You Need To Do:`,
            `${upcoming.length ? upcoming.map((u: any, i: number) => `${i+1}. ${u.name} (${u.component}, ${u.weight}% weight)`).join('\n') : 'No upcoming assessments'}`,
            `💡 Insights:`,
            `${risks.length ? `Risk components: ${risks.map((r: any) => `${r.name} (${r.weight}% weight)`).join(', ')}` : 'No risk components detected'}`
          ].join('\n')
        }

        return NextResponse.json({ response: text, model })
      } else {
        const t = await r.text()
        lastErrText = `status=${r.status} model=${model} details=${t}`
        if (r.status === 401 || r.status === 403) {
          return NextResponse.json({ error: `Authentication error ${r.status}`, details: t }, { status: 502 })
        }
        if (r.status === 404) {
          continue
        }
      }
    }
    return NextResponse.json({ error: "Model not available (404)", details: lastErrText }, { status: 502 })
  } catch {
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 })
  }
}

