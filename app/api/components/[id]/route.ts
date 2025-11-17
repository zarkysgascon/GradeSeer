import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { components } from "@/lib/schema";
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