import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects, components, items } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Simple UUID v4 generator (no external package needed)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
      userSubjects.map(async (subject) => {
        // Get components for this subject
        const subjectComponents = await db
          .select()
          .from(components)
          .where(eq(components.subject_id, subject.id));

        // For each component, get its items
        const componentsWithItems = await Promise.all(
          subjectComponents.map(async (component) => {
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
   CREATE SUBJECT - FIXED: Return complete subject data with color
   POST /api/subjects
----------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log('Creating subject with data:', body); // Debug log

    // Generate UUID for the new subject
    const subjectId = generateUUID();

    // Insert subject WITH COLOR - ensure color has a default
    const inserted = await db
      .insert(subjects)
      .values({
        id: subjectId,
        user_email: body.user_email,
        name: body.name,
        is_major: body.is_major,
        target_grade: body.target_grade?.toString() || null,
        color: body.color || '#3B82F6', // Ensure color has a default
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

    // Return the complete subject data INCLUDING COMPONENTS AND ITEMS
    return NextResponse.json({
      id: newSubject.id,
      name: newSubject.name,
      is_major: newSubject.is_major,
      target_grade: newSubject.target_grade,
      color: newSubject.color, // THIS IS CRITICAL
      user_email: newSubject.user_email,
      components: createdComponents // Include the components structure
    }, { status: 201 });

  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}