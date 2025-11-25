import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { history } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";

let historyTargetGradeEnsured = false;

async function ensureTargetGradeColumn() {
  if (historyTargetGradeEnsured) {
    return;
  }

  try {
    const result = await db.execute(
      sql`
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'history'
          AND column_name = 'target_grade'
        LIMIT 1
      `
    );

    if ((result.rows?.length ?? 0) === 0) {
      await db.execute(sql`ALTER TABLE "history" ADD COLUMN "target_grade" double precision`);
    }
    historyTargetGradeEnsured = true;
  } catch (err) {
    console.warn("Unable to ensure history.target_grade column:", err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email query parameter required" }, { status: 400 });
    }

    await ensureTargetGradeColumn();

    const entries = await db
      .select()
      .from(history)
      .where(eq(history.user_email, email))
      .orderBy(desc(history.finished));

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, subjectId, subjectName, rawGrade, targetGrade, completedAt } = body;

    if (!userEmail || !subjectId || !subjectName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedRawGrade = Number(rawGrade ?? 0);
    const parsedTargetGrade = Number(targetGrade ?? 0);
    const completedAtDate = completedAt ? new Date(completedAt) : new Date();

    if (Number.isNaN(parsedRawGrade) || Number.isNaN(parsedTargetGrade)) {
      return NextResponse.json({ error: "Grades must be numeric" }, { status: 400 });
    }

    if (Number.isNaN(completedAtDate.getTime())) {
      return NextResponse.json({ error: "Invalid completedAt timestamp" }, { status: 400 });
    }

    await ensureTargetGradeColumn();

    const [entry] = await db
      .insert(history)
      .values({
        user_email: userEmail,
        subject: subjectName,
        raw_grade: parsedRawGrade,
        target_grade: parsedTargetGrade,
        finished: completedAtDate,
      })
      .returning();

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error creating history entry:", error);
    return NextResponse.json({ error: "Failed to save history entry" }, { status: 500 });
  }
}
