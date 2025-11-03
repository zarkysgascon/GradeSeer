import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { name, email, password, provider, provider_id, image } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((res) => res[0]);

    if (existingUser) {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const username = name || email.split("@")[0];

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
      .returning({ id: users.id, email: users.email });

    return NextResponse.json({
      message: "User successfully registered.",
      user: newUser,
    });
  } catch (err) {
    console.error("❌ Signup route error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
