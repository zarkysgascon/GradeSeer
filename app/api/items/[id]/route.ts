import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Update the item - use UUID directly (no Number conversion)
    const updatedItem = await db
      .update(items)
      .set(updateData)
      .where(eq(items.id, id)) // Use UUID string directly
      .returning();

    if (updatedItem.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    console.log("Successfully updated item:", updatedItem[0]);
    return NextResponse.json({ success: true, item: updatedItem[0] });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log("Deleting item:", id);

    const result = await db.delete(items).where(eq(items.id, id)); // Use UUID string directly

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}