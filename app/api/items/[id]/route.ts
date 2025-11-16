import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = id;

    // Delete the item
    await db.delete(items).where(eq(items.id, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = id;
    const body = await req.json();

    const update: Record<string, any> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.score !== undefined) update.score = body.score;
    if (body.max !== undefined) update.max = body.max;
    if (body.date !== undefined) update.date = body.date;
    if (body.target !== undefined) update.target = body.target;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if (update.max !== undefined && update.max !== null && update.max <= 0) {
      return NextResponse.json({ error: "Max must be greater than 0" }, { status: 400 });
    }
    if (
      update.score !== undefined && update.score !== null &&
      update.max !== undefined && update.max !== null &&
      update.score > update.max
    ) {
      return NextResponse.json({ error: "Score cannot exceed Max" }, { status: 400 });
    }

    await db.update(items).set(update).where(eq(items.id, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}