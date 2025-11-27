import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  
  console.log('🔍 [HISTORY API] Fetching history for email:', email);
  
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  
  try {
    // First, let's check what's actually in the database
    console.log('🔍 [HISTORY API] Checking all records in subject_history...');
    const allRecords = await db.execute(sql`SELECT * FROM subject_history`);
    console.log('📊 [HISTORY API] All records in database:', allRecords.rows.length);
    
    if (allRecords.rows.length > 0) {
      console.log('🔍 [HISTORY API] Sample record:', allRecords.rows[0]);
    }

    // Now query for the specific user
    console.log('🔍 [HISTORY API] Querying for user:', email);
    const historyResult = await db.execute(sql`
      SELECT * FROM subject_history 
      WHERE user_email = ${email} 
      ORDER BY completed_at DESC
    `);
    
    console.log('📊 [HISTORY API] User records found:', historyResult.rows.length);
    
    if (historyResult.rows.length > 0) {
      console.log('✅ [HISTORY API] Returning records:', historyResult.rows.length);
      return NextResponse.json(historyResult.rows);
    } else {
      console.log('ℹ️ [HISTORY API] No records found for user, but total records:', allRecords.rows.length);
      
      // Let's see if there's a case sensitivity issue or different email format
      const allEmails = await db.execute(sql`
        SELECT DISTINCT user_email FROM subject_history
      `);
      console.log('📧 [HISTORY API] All emails in database:', allEmails.rows);
      
      return NextResponse.json([]);
    }
    
  } catch (error) {
    console.error('❌ [HISTORY API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}