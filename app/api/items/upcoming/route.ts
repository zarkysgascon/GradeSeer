import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, components, subjects } from "@/lib/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
    }

    console.log("Fetching upcoming items for email:", email);

    // Fetch upcoming items using user_email directly
    const upcomingItems = await db
      .select({
        id: items.id,
        name: items.name,
        score: items.score,
        max: items.max,
        date: items.date,
        target: items.target,
        topic: items.topic,
        componentName: components.name,
        subjectName: subjects.name,
        subjectId: subjects.id,
      })
      .from(items)
      .leftJoin(components, eq(items.component_id, components.id))
      .leftJoin(subjects, eq(components.subject_id, subjects.id))
      .where(
        and(
          eq(subjects.user_email, email), // Use user_email directly
          isNull(items.score) // Only items without scores
        )
      )
      .orderBy(desc(items.date));

    console.log(`Found ${upcomingItems.length} upcoming items for user ${email}`);

    return NextResponse.json(upcomingItems);
  } catch (error) {
    console.error("GET upcoming items error:", error);
    return NextResponse.json({ error: "Failed to fetch upcoming items" }, { status: 500 });
  }
}