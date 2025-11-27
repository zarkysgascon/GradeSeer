import { NextResponse } from "next/server"
import { buildAIPrompt } from "@/app/lib/ai/promptBuilder"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    let message: string = String(body?.message || "How do I use GradeSeer?")
    message = message.trim().slice(0, 500)
    const prompt = buildAIPrompt(message, 'app', null)
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 800, candidateCount: 1 }
      })
    })
    if (r.ok) {
      const data = await r.json()
      const parts = data?.candidates?.[0]?.content?.parts || []
      const p = parts.find((x: any) => typeof x?.text === "string")
      const text = p?.text || ''
      if (text) return NextResponse.json({ response: text, model })
    }
    return NextResponse.json({ response: "Ask me what you want to do in the app and I’ll walk you through it step-by-step. What's your goal right now?", model })
  } catch {
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 })
  }
}

