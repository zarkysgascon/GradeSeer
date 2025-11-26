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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    console.log("Updating item:", id, "with data:", body);

    // Validate required fields
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.score !== undefined) updateData.score = body.score;
    if (body.max !== undefined) updateData.max = body.max;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.target !== undefined) updateData.target = body.target;
    if (body.topic !== undefined) updateData.topic = body.topic;

    console.log("Update data:", updateData);

    // Update the item
    const updatedItem = await db
      .update(items)
      .set(updateData)
      .where(eq(items.id, id))
      .returning();

    if (updatedItem.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    console.log("Successfully updated item:", updatedItem[0]);
    return NextResponse.json(updatedItem[0]);
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log("Deleting item:", id);

    const result = await db.delete(items).where(eq(items.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}