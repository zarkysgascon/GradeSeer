import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // Drizzle DB instance
import { users } from "@/lib/schema"; // Drizzle schema
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { name, email, password, provider, provider_id, image } = await req.json();

    // Default name if not provided
    const username = name || email.split("@")[0];

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then(res => res[0]);

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Insert new user
    const [newUser] = await db
      .insert(users)
      .values({
        name: username,
        email,
        password: hashedPassword,
        provider: provider || "credentials",
        provider_id: provider_id || null,
        image: image || null,
      })
      .returning({ id: users.id, email: users.email, provider: users.provider });

    return NextResponse.json({ message: "User created", user: newUser });
  } catch (err: any) {
    console.error("Signup route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
