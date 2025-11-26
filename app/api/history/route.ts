import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subject_history } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Fetch history from database
    const history = await db
      .select()
      .from(subject_history)
      .where(eq(subject_history.user_email, email))
      .orderBy(desc(subject_history.completed_at));

    return NextResponse.json(history, { status: 200 });

  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}