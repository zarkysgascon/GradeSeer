import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

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
        id: uuidv4(), // Add this line - generate UUID on server side
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