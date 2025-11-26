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

    console.log('🔄 Updating item:', id, body);

    // Update the item
    const updatedItem = await db
      .update(items)
      .set({
        name: body.name,
        score: body.score,
        max: body.max,
        date: body.date,
        target: body.target,
        topic: body.topic,
      })
      .where(eq(items.id, id))
      .returning();

    if (updatedItem.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    console.log('✅ Item updated successfully:', updatedItem[0]);
    return NextResponse.json(updatedItem[0]);
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

    console.log('🗑️ Deleting item:', id);

    const deletedItem = await db
      .delete(items)
      .where(eq(items.id, id))
      .returning();

    if (deletedItem.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    console.log('✅ Item deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}