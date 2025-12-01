import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subject_history } from "@/lib/schema"; // Changed to snake_case
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  
  console.log('🔍 Fetching history for email:', email);
  
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  
  try {
    const historyResult = await db.query.subject_history.findMany({
      where: eq(subject_history.user_email, email),
      orderBy: [desc(subject_history.completed_at)],
    });
    
    console.log('📊 Records found:', historyResult.length);
    return NextResponse.json(historyResult);
    
  } catch (error) {
    console.error('❌ Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}