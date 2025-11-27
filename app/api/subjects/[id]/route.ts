import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects, components, items } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Simple UUID v4 generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* -----------------------------------------------------------
   GET ONE SUBJECT WITH COMPONENTS + ITEMS
----------------------------------------------------------- */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subjectId = id;

    const subject = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, subjectId));

    if (subject.length === 0) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const comps = await db
      .select()
      .from(components)
      .where(eq(components.subject_id, subjectId));

    const enrichedComponents = [];

    for (const c of comps) {
      const compItems = await db
        .select()
        .from(items)
        .where(eq(items.component_id, c.id));

      enrichedComponents.push({
        ...c,
        items: compItems,
      });
    }

    return NextResponse.json(
      { ...subject[0], components: enrichedComponents },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   ADD ITEM TO COMPONENT
----------------------------------------------------------- */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subjectId = id;
    const body = await req.json();

    const { componentId, item } = body;

    // Insert the new item - REMOVE the id field since items.id is serial (auto-increment)
    const newItem = await db
      .insert(items)
      .values({
        component_id: componentId,
        name: item.name,
        score: item.score,
        max: item.max,
        date: item.date,
        target: item.target,
      })
      .returning();

    return NextResponse.json({ success: true, item: newItem[0] });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   UPDATE SUBJECT
----------------------------------------------------------- */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subjectId = id;
    const body = await req.json();

    await db
      .update(subjects)
      .set({
        name: body.name,
        target_grade: body.target_grade,
        color: body.color,
        is_major: body.is_major,
        units: body.units, // ADDED: Units field
      })
      .where(eq(subjects.id, subjectId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE SUBJECT
----------------------------------------------------------- */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subjectId = id;

    // First, get all components for this subject to delete their items
    const subjectComponents = await db
      .select()
      .from(components)
      .where(eq(components.subject_id, subjectId));

    // Delete items for each component
    for (const component of subjectComponents) {
      await db.delete(items).where(eq(items.component_id, component.id));
    }

    // Delete components
    await db.delete(components).where(eq(components.subject_id, subjectId));

    // Delete subject
    await db.delete(subjects).where(eq(subjects.id, subjectId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PARTIAL UPDATE SUBJECT (RENAME, TARGET GRADE, UNITS)
----------------------------------------------------------- */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.target_grade !== undefined) updateData.target_grade = body.target_grade.toString()
    if (body.units !== undefined) updateData.units = body.units // ADDED: Units field

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    await db.update(subjects).set(updateData).where(eq(subjects.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH error:", error)
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 })
  }
}