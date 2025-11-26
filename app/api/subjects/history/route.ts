import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  
  console.log('🔍 ULTRA-DEBUG - Fetching history for email:', email);
  
  try {
    // Add small delay to allow for replication
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 1. Check database connection
    const dbInfo = await db.execute(sql`SELECT current_database(), current_user, now() as current_time`);
    console.log('📍 Database:', dbInfo.rows[0].current_database);
    console.log('👤 User:', dbInfo.rows[0].current_user);
    console.log('🕒 Current DB time:', dbInfo.rows[0].current_time);

    // 2. Check ALL records without any filters
    const allRecords = await db.execute(sql`SELECT COUNT(*) as count FROM subject_history`);
    console.log('📊 TOTAL records in subject_history table:', allRecords.rows[0].count);

    // 3. Show ALL records (for debugging)
    const allHistory = await db.execute(sql`SELECT * FROM subject_history`);
    console.log('📋 ALL history records:', allHistory.rows);

    // 4. Try exact email match
    const exactEmail = await db.execute(
      sql`SELECT * FROM subject_history WHERE user_email = ${email} ORDER BY completed_at DESC`
    );
    console.log('📧 Exact email query results:', exactEmail.rows.length);
    
    // 5. Return the results
    console.log('✅ Final history records found for user:', exactEmail.rows.length);
    console.log('📄 Final history records:', exactEmail.rows);
    
    return NextResponse.json(exactEmail.rows);
    
  } catch (error) {
    console.error('❌ Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}