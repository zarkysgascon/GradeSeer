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