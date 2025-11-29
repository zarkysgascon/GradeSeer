import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { components, items } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Update the component
    const updatedComponent = await db
      .update(components)
      .set({
        name: body.name,
        percentage: body.percentage.toString(), // Convert to string for schema
      })
      .where(eq(components.id, id))
      .returning();

    return NextResponse.json({ success: true, component: updatedComponent[0] });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Failed to update component" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Component ID is required" }, { status: 400 });
    }

    console.log("Deleting component:", id);

    // Delete child items first
    await db.delete(items).where(eq(items.component_id, id));

    // Then delete the component
    await db.delete(components).where(eq(components.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete component" }, { status: 500 });
  }
}