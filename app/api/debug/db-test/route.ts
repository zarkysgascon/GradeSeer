import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('🔍 [DB-TEST] Testing database connection...');
    
    // Test basic database connection
    const testResult = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ [DB-TEST] Database connection test result:', testResult.rows);

    // Check subject_history table structure
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'subject_history' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 [DB-TEST] Table structure:', tableInfo.rows);
    
    // Get all records from subject_history
    const allRecords = await db.execute(sql`SELECT * FROM subject_history`);
    console.log('📊 [DB-TEST] All records count:', allRecords.rows.length);
    
    return NextResponse.json({
      database: 'Connected',
      tableStructure: tableInfo.rows,
      totalRecords: allRecords.rows.length,
      allRecords: allRecords.rows,
      message: 'Database test completed successfully'
    });
    
  } catch (error) {
    console.error('❌ [DB-TEST] Error:', error);
    return NextResponse.json({ 
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}