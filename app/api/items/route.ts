import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/lib/schema";

/* -----------------------------------------------------------
   CREATE ITEM
   POST /api/items
----------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const newItem = await db
      .insert(items)
      .values({
        // Remove the id field - let the database auto-generate it
        component_id: body.component_id,
        name: body.name,
        score: body.score,
        max: body.max,
        date: body.date,
        target: body.target,
      })
      .returning();

    return NextResponse.json({ success: true, item: newItem[0] });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}