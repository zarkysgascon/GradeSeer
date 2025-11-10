import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects, components, items } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Simple UUID v4 generator (no external package needed)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* -----------------------------------------------------------
   GET SUBJECT LIST
   GET /api/subjects?email=email@example.com
----------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const result = await db
      .select()
      .from(subjects)
      .where(eq(subjects.user_email, email));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   CREATE SUBJECT
   POST /api/subjects
----------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Generate UUID for the new subject
    const subjectId = generateUUID();

    const inserted = await db
      .insert(subjects)
      .values({
        id: subjectId, // Use the generated UUID
        user_email: body.user_email,
        name: body.name,
        is_major: body.is_major,
        target_grade: body.target_grade?.toString() || null, // Handle empty target_grade
        color: body.color,
      })
      .returning();

    const newSubjectId = inserted[0].id;

    // Create components if provided
    if (body.components?.length > 0) {
      for (const c of body.components) {
        await db.insert(components).values({
          id: generateUUID(), // Generate UUID for each component
          subject_id: newSubjectId,
          name: c.name,
          percentage: c.percentage.toString(),
          priority: c.priority,
        });
      }
    }

    return NextResponse.json({ success: true, id: newSubjectId });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}