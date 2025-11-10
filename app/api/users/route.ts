import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const result = await db.select().from(users).where(eq(users.email, email));
    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, image } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email));

    if (existingUser.length > 0) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          name,
          image,
          updated_at: new Date(),
        })
        .where(eq(users.email, email))
        .returning(); // 

      return NextResponse.json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } else {
      // Create new user record
      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email,
          image,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning(); 

      return NextResponse.json({
        message: "User created successfully",
        user: newUser,
      });
    }
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Failed to save user" }, { status: 500 });
  }
}
