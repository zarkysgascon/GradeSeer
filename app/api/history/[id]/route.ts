import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { history } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "History ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const updates: Partial<{
      subject: string;
      raw_grade: number;
      target_grade: number;
      finished: Date;
    }> = {};

    if (typeof body.subjectName === "string") updates.subject = body.subjectName;
    if (body.rawGrade !== undefined) {
      const parsed = Number(body.rawGrade);
      if (Number.isNaN(parsed)) {
        return NextResponse.json({ error: "rawGrade must be a number" }, { status: 400 });
      }
      updates.raw_grade = parsed;
    }
    if (body.targetGrade !== undefined) {
      const parsed = Number(body.targetGrade);
      if (Number.isNaN(parsed)) {
        return NextResponse.json({ error: "targetGrade must be a number" }, { status: 400 });
      }
      updates.target_grade = parsed;
    }
    if (body.completedAt) {
      const parsed = new Date(body.completedAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid completedAt" }, { status: 400 });
      }
      updates.finished = parsed;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const updated = await db
      .update(history)
      .set(updates)
      .where(eq(history.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "History entry not found" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating history entry:", error);
    return NextResponse.json({ error: "Failed to update history entry" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "History ID is required" }, { status: 400 });
    }

    const deleted = await db.delete(history).where(eq(history.id, id)).returning();
    if (deleted.length === 0) {
      return NextResponse.json({ error: "History entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting history entry:", error);
    return NextResponse.json({ error: "Failed to delete history entry" }, { status: 500 });
  }
}
