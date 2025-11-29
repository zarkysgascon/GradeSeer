import { NextResponse } from "next/server"
import { Array } from "effect"
import _ from "lodash"
import { db } from "@/lib/db"
import { subjects as subjectsTable, components as componentsTable, items as itemsTable } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { buildAIPrompt } from "@/app/lib/ai/promptBuilder"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body?.email || "").trim()
    let message: string = String(body?.message || "How is my semester looking?")
    message = message.trim().slice(0, 500)
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 })

    const rows = await db.select().from(subjectsTable).where(eq(subjectsTable.user_email, email))
    const subjects = [] as any[]
    for (const s of rows) {
      const comps = await db.select().from(componentsTable).where(eq(componentsTable.subject_id, s.id))
      const enriched = [] as any[]
      for (const c of comps) {
        const compItems = await db.select().from(itemsTable).where(eq(itemsTable.component_id, c.id))
        enriched.push({ ...c, percentage: parseFloat(String(c.percentage)), items: compItems })
      }
      subjects.push({ id: s.id, name: s.name, target_grade: s.target_grade, color: s.color, components: enriched, units: s.units || 3 })
    }

    const upcoming = Array.filter(
      _.flatMap(subjects, (sub: any) => 
        _.flatMap((sub.components || []), (c: any) => 
          Array.map((c.items || []), (i: any) => ({ subject: sub.name, name: i.name, score: i.score, max: i.max, date: i.date }))
        )
      ),
      (x) => x.score === null || x.score === undefined
    ).slice(0, 10)

    const prompt = buildAIPrompt(message, 'dashboard', { subjects, upcoming })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 })

    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash"
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    const r = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
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
      const parts = data?.candidates?.[0]?.content?.parts || []
      const p = parts.find((x: any) => typeof x?.text === "string")
      const text = p?.text || ''
      if (text) return NextResponse.json({ response: text, model })
    }

    const fallback = [] as string[]
    fallback.push("Status: Review semester-wide GPA and weakest subjects first.")
    const below = Array.filter(subjects, (s: any) => {
      const tgt = s.target_grade ? parseFloat(String(s.target_grade)) : 0
      const ctx = require("@/app/lib/ai/assembleSubjectContext").assembleSubjectContext(s)
      return tgt ? ctx.currentStatus.currentGrade > tgt : false
    })
    const belowNames = Array.map(below, (s: any) => s.name)
    fallback.push(belowNames.length ? `Needs attention: ${belowNames.join(', ')}` : "No subjects below target.")
    const upcomingNames = upcoming.length ? Array.map(upcoming, (u: any) => `${u.subject}: ${u.name}`).join(', ') : ''
    fallback.push(upcoming.length ? `Upcoming priorities: ${upcomingNames}` : "No upcoming assessments logged.")
    fallback.push("What's your plan for the next exam?")
    return NextResponse.json({ response: fallback.join('\n'), model })
  } catch {
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 })
  }
}

