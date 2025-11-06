import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects, components } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// GET subjects
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    const subjList = await db.select().from(subjects).where(eq(subjects.user_email, email));

    const result = await Promise.all(
      subjList.map(async (subj) => {
        const comps = await db.select().from(components).where(eq(components.subject_id, subj.id));

        // Convert percentage to number
        const compsNumbered = comps.map((c) => ({
          ...c,
          percentage: Number(c.percentage),
        }));

        return { ...subj, components: compsNumbered };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

// POST create a subject
export async function POST(req: Request) {
  try {
    const { name, is_major, user_email, target_grade, color, components: compList } = await req.json();

    if (!name || !user_email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate a unique ID for the subject
    const subjectId = randomUUID();

    // Insert subject
    await db.insert(subjects).values({
      id: subjectId,
      name,
      is_major: is_major ?? false,
      user_email,
      target_grade: target_grade != null ? String(target_grade) : null, // store as string
      color: color ?? "#3B82F6",
    });

    // Insert components if any
    if (compList?.length) {
      await db.insert(components).values(
        compList.map((c: any) => ({
          id: randomUUID(),
          name: c.name,
          percentage: String(c.percentage), // store numeric as string
          priority: c.priority,
          subject_id: subjectId,
        }))
      );
    }

    // Fetch the saved subject and components
    const savedSubjects = await db.select().from(subjects).where(eq(subjects.id, subjectId));
    const savedSubject = savedSubjects[0];

    const savedComponentsRaw = await db.select().from(components).where(eq(components.subject_id, subjectId));
    const savedComponents = savedComponentsRaw.map((c) => ({
      ...c,
      percentage: Number(c.percentage), // convert to number for frontend
    }));

    return NextResponse.json({ ...savedSubject, components: savedComponents }, { status: 201 });
  } catch (error) {
    console.error("Error creating subject:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
