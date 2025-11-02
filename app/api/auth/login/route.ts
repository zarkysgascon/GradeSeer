import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // your Drizzle DB instance
import { users } from "@/lib/schema"; // Drizzle schema
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm"; // comparison operator

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // 🔍 Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then(res => res[0]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 🔑 Check password
    if (!user.password) {
      return NextResponse.json({ error: "Password not set for this account" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // 🧹 Remove password before sending response
    const { password: _p, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: "Login successful",
      user: userWithoutPassword,
    });
  } catch (err: any) {
    console.error("Signin error:", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
