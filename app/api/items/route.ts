import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/lib/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    console.log("Creating item with data:", body);

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }
    if (!body.component_id) {
      return NextResponse.json({ error: "Component ID is required" }, { status: 400 });
    }

    const newItem = await db
      .insert(items)
      .values({
        component_id: body.component_id,
        name: body.name,
        score: body.score,
        max: body.max,
        date: body.date,
        target: body.target,
        topic: body.topic || null, // THIS SAVES TOPIC TO DATABASE
      })
      .returning();

    console.log("Successfully created item:", newItem[0]);
    return NextResponse.json(newItem[0]);
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}