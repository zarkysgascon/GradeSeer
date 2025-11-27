import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  
  console.log('🔍 Fetching history for email:', email);
  
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  
  try {
    const historyResult = await db.execute(sql`
      SELECT * FROM subject_history 
      WHERE user_email = ${email} 
      ORDER BY completed_at DESC
    `);
    
    console.log('📊 Records found:', historyResult.rows.length);
    return NextResponse.json(historyResult.rows);
    
  } catch (error) {
    console.error('❌ Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}