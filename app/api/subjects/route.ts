import { NextResponse } from "next/server";
import { Array } from "effect";
import _ from "lodash";
import { db } from "@/lib/db";
import { subjects, components, items } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Simple UUID v4 generator without regex
function generateUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  const bytes: number[] = []
  for (let i = 0; i < 16; i++) {
    bytes.push(Math.floor(Math.random() * 256))
  }
  // Set version (4) and variant (RFC4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.map(bytes, (b) => b.toString(16).padStart(2, '0'))
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
}

/* -----------------------------------------------------------
   GET SUBJECT LIST WITH COMPONENTS AND ITEMS
   GET /api/subjects?email=email@example.com
----------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Get all subjects for this user
    const userSubjects = await db
      .select()
      .from(subjects)
      .where(eq(subjects.user_email, email));

    // For each subject, get its components and items
    const subjectsWithComponents = await Promise.all(
      Array.map(userSubjects, async (subject) => {
        // Get components for this subject
        const subjectComponents = await db
          .select()
          .from(components)
          .where(eq(components.subject_id, subject.id));

        // For each component, get its items
        const componentsWithItems = await Promise.all(
          Array.map(subjectComponents, async (component) => {
            const componentItems = await db
              .select()
              .from(items)
              .where(eq(items.component_id, component.id));

            return {
              ...component,
              items: componentItems
            };
          })
        );

        return {
          ...subject,
          components: componentsWithItems
        };
      })
    );

    return NextResponse.json(subjectsWithComponents, { status: 200 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   CREATE SUBJECT - FIXED: Return complete subject data with color and units
   POST /api/subjects
----------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log('Creating subject with data:', body); // Debug log

    // Generate UUID for the new subject
    const subjectId = generateUUID();

    // Insert subject WITH COLOR AND UNITS - ensure color has a default
    const inserted = await db
      .insert(subjects)
      .values({
        id: subjectId,
        user_email: body.user_email,
        name: body.name,
        is_major: body.is_major,
        target_grade: (typeof body.target_grade === 'number' && body.target_grade > 0)
          ? body.target_grade.toString()
          : null,
        color: body.color || '#3B82F6',
        units: body.units || 3,
      })
      .returning();

    const newSubject = inserted[0];
    console.log('Created subject:', newSubject); // Debug log

    const createdComponents = [];

    // Create components if provided
    if (body.components?.length > 0) {
      for (const c of body.components) {
        const componentId = generateUUID();
        await db.insert(components).values({
          id: componentId,
          subject_id: newSubject.id,
          name: c.name,
          percentage: c.percentage.toString(),
          priority: c.priority,
        });
        
        createdComponents.push({
          id: componentId,
          name: c.name,
          percentage: c.percentage,
          priority: c.priority,
          items: [] // Empty items array for new components
        });
      }
    }

    // Return the complete subject data INCLUDING COMPONENTS, ITEMS, AND UNITS
    return NextResponse.json({
      id: newSubject.id,
      name: newSubject.name,
      is_major: newSubject.is_major,
      target_grade: newSubject.target_grade,
      color: newSubject.color, // THIS IS CRITICAL
      units: newSubject.units || 3, // ADDED: Include units
      user_email: newSubject.user_email,
      components: createdComponents // Include the components structure
    }, { status: 201 });

  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
