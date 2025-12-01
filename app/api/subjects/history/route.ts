import { db } from "@/lib/db";
import { subject_history } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  
  console.log('🔍 Fetching history for email:', email);
  
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  
  try {
    const history = await db
      .select()
      .from(subject_history)
      .where(eq(subject_history.user_email, email))
      .orderBy(desc(subject_history.completed_at));
    
    console.log('📊 Records found:', history.length);
    
    // Convert Date objects to ISO strings for API response
    const serializedHistory = history.map(record => ({
      ...record,
      completed_at: record.completed_at ? record.completed_at.toISOString() : null
    }));
    
    return NextResponse.json(serializedHistory);
    
  } catch (error) {
    console.error('❌ Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}